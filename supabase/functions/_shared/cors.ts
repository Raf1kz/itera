const ORIGINS = (Deno.env.get('CORS_ORIGINS') ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function cors(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allow = ORIGINS.includes(origin) ? origin : '';
  const base = {
    Vary: 'Origin',
    'Access-Control-Expose-Headers': 'x-request-id,x-rate-remaining',
    'Access-Control-Allow-Credentials': 'true',
  };
  return {
    preflight(): Response | null {
      if (req.method !== 'OPTIONS') return null;
      return new Response(null, {
        status: 204,
        headers: {
          ...base,
          ...(allow ? { 'Access-Control-Allow-Origin': allow } : {}),
          'Access-Control-Allow-Headers':
            req.headers.get('Access-Control-Request-Headers') ??
            'content-type,authorization,apikey',
          'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
          'Access-Control-Max-Age': '600',
        },
      });
    },
    headers: { ...base, ...(allow ? { 'Access-Control-Allow-Origin': allow } : {}) },
  };
}
