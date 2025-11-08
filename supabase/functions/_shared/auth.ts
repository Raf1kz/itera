// supabase/functions/_shared/auth.ts
import {
  jwtVerify,
  importSPKI,
  createRemoteJWKSet,
  decodeProtectedHeader,
  decodeJwt,
  type JWTPayload,
} from 'https://esm.sh/jose@5.2.4';

const rawPem = (Deno.env.get('CLERK_JWT_PUBLIC_KEY') ?? '')
  .trim()
  .replace(/^"|"$/g, '')
  .replace(/\\n/g, '\n');

const ENV_ISSUER = normalizeIssuer((Deno.env.get('CLERK_ISSUER') ?? '').trim());

// JWKS cache with TTL to handle key rotation
interface JWKSCacheEntry {
  jwks: ReturnType<typeof createRemoteJWKSet>;
  timestamp: number;
}

const jwksCache = new Map<string, JWKSCacheEntry>();
const JWKS_TTL_MS = 3600000; // 1 hour TTL
const MAX_CACHE_ENTRIES = 100; // Max issuers to cache (prevent unbounded growth)

function normalizeIssuer(value: string) {
  return value ? value.replace(/\/+$/, '') : '';
}

// Evict expired entries from JWKS cache
function evictExpiredJwksEntries() {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, entry] of jwksCache.entries()) {
    if ((now - entry.timestamp) >= JWKS_TTL_MS) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    jwksCache.delete(key);
  }

  if (keysToDelete.length > 0) {
    console.info('jwks_cache_evicted', {
      count: keysToDelete.length,
      remainingEntries: jwksCache.size,
    });
  }
}

// Enforce max cache size using LRU (delete oldest entry)
function enforceMaxCacheSize() {
  if (jwksCache.size >= MAX_CACHE_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTimestamp = Number.MAX_SAFE_INTEGER;

    for (const [key, entry] of jwksCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      jwksCache.delete(oldestKey);
      console.warn('jwks_cache_lru_eviction', {
        evictedIssuer: oldestKey,
        reason: 'max_cache_size_exceeded',
        maxEntries: MAX_CACHE_ENTRIES,
      });
    }
  }
}

function getRemoteJwks(normalizedIssuer: string) {
  const cached = jwksCache.get(normalizedIssuer);
  const now = Date.now();

  // Return cached JWKS if still valid
  if (cached && (now - cached.timestamp) < JWKS_TTL_MS) {
    return cached.jwks;
  }

  // Evict expired entries before adding new one
  evictExpiredJwksEntries();

  // Enforce max cache size
  enforceMaxCacheSize();

  // Fetch new JWKS and cache with timestamp
  const set = createRemoteJWKSet(new URL(`${normalizedIssuer}/.well-known/jwks.json`));
  jwksCache.set(normalizedIssuer, { jwks: set, timestamp: now });

  console.info('jwks_cache_refreshed', {
    issuer: normalizedIssuer,
    timestamp: new Date(now).toISOString(),
    cacheSize: jwksCache.size,
  });

  return set;
}

/**
 * Add constant delay to mitigate timing attacks
 * Ensures all auth failures take similar time regardless of failure reason
 */
async function constantTimeDelay() {
  const minDelayMs = 50;
  const jitterMs = Math.random() * 50; // 0-50ms random jitter
  await new Promise(resolve => setTimeout(resolve, minDelayMs + jitterMs));
}

/** Verify Clerk Bearer token and return userId (sub) or null. */
export async function verifyAndGetUserId(authHeader?: string | null): Promise<string | null> {
  const startTime = Date.now();

  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    await constantTimeDelay();
    return null;
  }

  const token = authHeader.slice(7).trim();

  const decoded: JWTPayload = safeDecodeJwt(token);
  const tokenIssuer = normalizeIssuer(typeof decoded.iss === 'string' ? decoded.iss : '');

  const issuersToTry = Array.from(
    new Set([tokenIssuer, ENV_ISSUER].filter((issuer): issuer is string => !!issuer))
  );

  for (const issuer of issuersToTry) {
    try {
      const jwks = getRemoteJwks(issuer);
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        clockTolerance: 60,
      });
      if (typeof payload.sub === 'string') {
        // Success - return immediately (no timing attack risk on success)
        return payload.sub;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;

      // Log error details but don't vary timing based on error type
      console.error('clerk_jwt_jwks_failed', {
        issuer,
        message: errorMessage,
        code: errorCode,
        kid: decoded?.kid,
        suggestion: errorCode === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED'
          ? 'Issuer mismatch or JWKS stale - check CLERK_ISSUER secret'
          : errorMessage.includes('expired')
          ? 'Token expired - user needs to sign in again'
          : 'Check token format and Clerk template configuration',
      });
    }
  }

  if (rawPem) {
    console.warn('clerk_jwt_fallback_to_pem', {
      message: 'JWKS verification failed, attempting PEM fallback',
      issuer: ENV_ISSUER,
    });

    try {
      const key = await importSPKI(rawPem, 'RS256');
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['RS256'],
        clockTolerance: 60,
      });
      if (typeof payload.sub === 'string') {
        console.info('clerk_jwt_pem_success', {
          message: 'PEM fallback succeeded - fix JWKS configuration for production',
          userId: payload.sub,
        });
        return payload.sub;
      }
    } catch (error) {
      console.error(
        'clerk_jwt_pem_failed',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // Ensure all auth failures take minimum time (timing attack mitigation)
  const elapsed = Date.now() - startTime;
  const minAuthTime = 100; // Minimum 100ms for auth failures
  if (elapsed < minAuthTime) {
    await new Promise(resolve => setTimeout(resolve, minAuthTime - elapsed));
  }

  return null;
}

function safeDecodeJwt(token: string): JWTPayload {
  try {
    return decodeJwt(token);
  } catch (error) {
    console.error('clerk_jwt_decode_failed', error instanceof Error ? error.message : String(error));
    return {};
  }
}

/** Peek alg/kid for diagnostics (no verification). */
export function peekJwtHeader(authHeader?: string | null) {
  try {
    if (!authHeader?.toLowerCase().startsWith('bearer ')) return null;
    const token = authHeader.slice(7).trim();
    return decodeProtectedHeader(token);
  } catch {
    return null;
  }
}
