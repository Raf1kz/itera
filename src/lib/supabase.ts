import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type GetToken = (args?: { template?: string }) => Promise<string | null>;

const url = import.meta.env['VITE_SUPABASE_URL'];
const anon = import.meta.env['VITE_SUPABASE_ANON_KEY'];
const functionsUrl = import.meta.env.DEV ? 'http://127.0.0.1:54321/functions/v1' : undefined;

if (!url || !anon) {
  throw new Error('Supabase env not configured');
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
  ...(functionsUrl ? { functions: { url: functionsUrl } } : {}),
});

export function createScopedClient(getToken: GetToken): SupabaseClient {
  return createClient(url, anon, {
    auth: { persistSession: false },
    ...(functionsUrl ? { functions: { url: functionsUrl } } : {}),
    global: {
      headers: {},
      fetch: async (input: RequestInfo | URL, init: RequestInit = {}) => {
        try {
          const token = await getToken({ template: 'supabase' });
          const headers = new Headers(init.headers);
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          return fetch(input, { ...init, headers });
        } catch (error) {
          console.error('supabase_fetch_auth_error', error);
          return fetch(input, init);
        }
      },
    },
  });
}
