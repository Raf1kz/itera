// supabase/functions/_shared/http.ts

const ENV_ORIGIN = (Deno.env.get('WEB_ORIGIN') ?? '').trim();
const ALLOWED_ORIGIN = (Deno.env.get('ALLOWED_ORIGIN') ?? '').trim();

type ContextLike = {
  header(name: string, value: string): void;
  req: { method: string };
  body(content: BodyInit | null, status?: number): Response;
};

function allowedOrigin() {
  // Use WEB_ORIGIN or ALLOWED_ORIGIN (for backwards compatibility)
  const origin = ENV_ORIGIN || ALLOWED_ORIGIN;

  // SECURITY: Never default to wildcard in production
  // Require explicit origin configuration
  if (!origin) {
    console.warn('cors_origin_not_configured', {
      message: 'WEB_ORIGIN or ALLOWED_ORIGIN not set - CORS may fail',
      fallback: 'localhost (dev-only)',
    });
    // Only allow localhost in development (safe default)
    return 'http://localhost:5173';
  }

  return origin;
}

function allowedHeaders() {
  return 'authorization, content-type, x-client-info, apikey, x-idempotency-key';
}

function allowedMethods() {
  return 'GET, POST, OPTIONS';
}

export function setCors(c: ContextLike) {
  c.header('Access-Control-Allow-Origin', allowedOrigin());
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

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(),
    Vary: 'Origin',
    'Access-Control-Allow-Headers': allowedHeaders(),
    'Access-Control-Allow-Methods': allowedMethods(),
  };
}

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  return null;
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}
