// supabase/functions/_shared/http.ts

const ENV_ORIGIN = (Deno.env.get('WEB_ORIGIN') ?? '').trim();
const ALLOWED_ORIGIN = (Deno.env.get('ALLOWED_ORIGIN') ?? '').trim();

type ContextLike = {
  header(name: string, value: string): void;
  req: { method: string; headers?: Headers };
  body(content: BodyInit | null, status?: number): Response;
};

function getAllowedOrigins(): string[] {
  const origin = ENV_ORIGIN || ALLOWED_ORIGIN;

  if (!origin) {
    return ['http://localhost:5173'];
  }

  // Support comma-separated multiple origins
  return origin.split(',').map(o => o.trim()).filter(Boolean);
}

function allowedOrigin(requestOrigin?: string | null) {
  const allowedOrigins = getAllowedOrigins();

  // If request has an Origin header, check if it's in the allowed list
  if (requestOrigin) {
    if (allowedOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }

    console.warn('cors_origin_rejected', {
      requestOrigin,
      allowedOrigins,
      message: 'Request origin not in allowed list',
    });
  }

  // SECURITY: Never default to wildcard in production
  // Require explicit origin configuration
  if (allowedOrigins.length === 0) {
    console.warn('cors_origin_not_configured', {
      message: 'WEB_ORIGIN or ALLOWED_ORIGIN not set - CORS may fail',
      fallback: 'localhost (dev-only)',
    });
    // Only allow localhost in development (safe default)
    return 'http://localhost:5173';
  }

  // Return first allowed origin as default
  return allowedOrigins[0];
}

function allowedHeaders() {
  return 'authorization, content-type, x-client-info, apikey, x-idempotency-key';
}

function allowedMethods() {
  return 'GET, POST, OPTIONS';
}

export function setCors(c: ContextLike) {
  const requestOrigin = c.req.headers?.get('origin');
  c.header('Access-Control-Allow-Origin', allowedOrigin(requestOrigin));
  c.header('Vary', 'Origin');
  c.header('Access-Control-Allow-Headers', allowedHeaders());
  c.header('Access-Control-Allow-Methods', allowedMethods());
}

export function maybeHandlePreflight(c: ContextLike) {
  if (c.req.method === 'OPTIONS') {
    setCors(c);
    return c.body(null, 204);
  }
  return null;
}

function corsHeaders(requestOrigin?: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(requestOrigin),
    Vary: 'Origin',
    'Access-Control-Allow-Headers': allowedHeaders(),
    'Access-Control-Allow-Methods': allowedMethods(),
  };
}

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const requestOrigin = req.headers.get('origin');
    return new Response(null, { status: 204, headers: corsHeaders(requestOrigin) });
  }
  return null;
}

export function json(status: number, body: unknown, requestOrigin?: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(requestOrigin),
    },
  });
}
