import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const LIMIT = Number(Deno.env.get('RATE_LIMIT') ?? '60');
const WINDOW_MINUTES = 5;
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!client && SUPABASE_URL && SERVICE_KEY) {
    client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  }
  return client;
}

export function extractIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;
  return '0.0.0.0';
}

export async function enforce(
  ip: string,
  route: string
): Promise<{ allowed: boolean; remaining: number }> {
  const sb = getClient();
  if (!sb) {
    // Rate limiting disabled if not configured
    console.warn('[RATE_LIMIT] Supabase not configured, allowing request');
    return { allowed: true, remaining: LIMIT };
  }

  try {
    const now = new Date();
    const from = new Date(now.getTime() - WINDOW_MS).toISOString();

    const { data, error } = await sb.rpc('rate_limit_hit', {
      p_ip: ip,
      p_route: route,
      p_now: now.toISOString(),
      p_from: from,
    });

    if (error) {
      console.error('[RATE_LIMIT] RPC error:', error);
      // Fail open on error
      return { allowed: true, remaining: LIMIT };
    }

    const { count } = (data as { count: number }) ?? { count: 0 };
    const remaining = Math.max(0, LIMIT - count);

    if (count > LIMIT) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining };
  } catch (err) {
    console.error('[RATE_LIMIT] Unexpected error:', err);
    // Fail open
    return { allowed: true, remaining: LIMIT };
  }
}
