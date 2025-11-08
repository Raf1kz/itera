import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// ============================================================================
// CONFIGURATION & ENVIRONMENT
// ============================================================================

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  Vary: 'Origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// ============================================================================
// MAIN HANDLER (STUB)
// ============================================================================

export async function handleAdaptiveRewriteRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Stub response for P3 development
  return new Response(
    JSON.stringify({
      message: 'Adaptive rewrite endpoint active',
      status: 'stub',
      version: '0.1.0',
      note: 'Full implementation planned for P3',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  );
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve((req) => handleAdaptiveRewriteRequest(req));
}
