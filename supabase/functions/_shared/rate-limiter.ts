/**
 * Database-backed rate limiter for OpenAI API calls
 * Limits per user per hour, persists across cold starts
 * Falls back to in-memory if DB unavailable (graceful degradation)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const REQUEST_LIMIT_PER_HOUR = 100;
const HOUR_IN_MS = 3600000;

// In-memory cache for performance (refreshed from DB on cold start)
const requestCounts = new Map<string, RateLimitEntry>();

// Supabase client for rate limit persistence
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !supabaseKey) {
    console.warn('rate_limiter_no_supabase', {
      message: 'Supabase credentials missing, falling back to in-memory only',
    });
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Check rate limit using database persistence
 * @param userId - User ID or IP address to check
 * @returns true if within limit, false if exceeded
 */
export async function checkRateLimit(userId: string): Promise<boolean> {
  const now = Date.now();
  const nowTimestamp = new Date(now).toISOString();
  const windowStart = new Date(now - HOUR_IN_MS).toISOString();

  // Try database-backed rate limiting first
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Call stored procedure to atomically record hit and get count
      const { data, error } = await supabase.rpc('rate_limit_hit', {
        p_ip: userId, // Using ip field for user_id (generic identifier)
        p_route: 'generate-flashcards',
        p_now: nowTimestamp,
        p_from: windowStart,
      });

      if (error) {
        console.error('rate_limiter_db_error', {
          message: error.message,
          userId,
          fallback: 'in-memory',
        });
        // Fall through to in-memory fallback
      } else {
        const count = data?.count ?? 0;

        // Update in-memory cache for faster subsequent checks
        requestCounts.set(userId, {
          count,
          resetAt: now + HOUR_IN_MS,
        });

        if (count > REQUEST_LIMIT_PER_HOUR) {
          console.warn('rate_limit_exceeded', {
            userId,
            count,
            limit: REQUEST_LIMIT_PER_HOUR,
            resetAt: new Date(now + HOUR_IN_MS).toISOString(),
            source: 'database',
          });
          return false;
        }

        return true;
      }
    } catch (error) {
      console.error('rate_limiter_exception', {
        message: error instanceof Error ? error.message : String(error),
        userId,
        fallback: 'in-memory',
      });
      // Fall through to in-memory fallback
    }
  }

  // In-memory fallback (if DB unavailable or error)
  const userLimit = requestCounts.get(userId);

  // No previous requests or window expired - allow and reset
  if (!userLimit || now > userLimit.resetAt) {
    requestCounts.set(userId, {
      count: 1,
      resetAt: now + HOUR_IN_MS
    });
    return true;
  }

  // Within window but limit exceeded
  if (userLimit.count >= REQUEST_LIMIT_PER_HOUR) {
    console.warn('rate_limit_exceeded', {
      userId,
      count: userLimit.count,
      limit: REQUEST_LIMIT_PER_HOUR,
      resetAt: new Date(userLimit.resetAt).toISOString(),
      source: 'in-memory',
    });
    return false;
  }

  // Within window and under limit - increment and allow
  userLimit.count++;
  return true;
}

/**
 * Get remaining requests for a user (query-only, doesn't increment)
 * @param userId - User ID to check
 * @returns Object with remaining requests and reset time
 */
export async function getRateLimitInfo(userId: string): Promise<{
  remaining: number;
  resetAt: Date;
  limit: number;
}> {
  const now = Date.now();
  const windowStart = new Date(now - HOUR_IN_MS).toISOString();

  // Try database query first
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('*', { count: 'exact' })
        .eq('ip', userId)
        .eq('route', 'generate-flashcards')
        .gte('created_at', windowStart);

      if (!error && data) {
        const count = data.length;
        return {
          remaining: Math.max(0, REQUEST_LIMIT_PER_HOUR - count),
          resetAt: new Date(now + HOUR_IN_MS),
          limit: REQUEST_LIMIT_PER_HOUR,
        };
      }
    } catch (error) {
      console.error('rate_limiter_info_error', {
        message: error instanceof Error ? error.message : String(error),
        userId,
      });
      // Fall through to in-memory fallback
    }
  }

  // In-memory fallback
  const userLimit = requestCounts.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    return {
      remaining: REQUEST_LIMIT_PER_HOUR,
      resetAt: new Date(now + HOUR_IN_MS),
      limit: REQUEST_LIMIT_PER_HOUR,
    };
  }

  return {
    remaining: Math.max(0, REQUEST_LIMIT_PER_HOUR - userLimit.count),
    resetAt: new Date(userLimit.resetAt),
    limit: REQUEST_LIMIT_PER_HOUR,
  };
}
