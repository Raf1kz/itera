// @ts-nocheck

import { test, expect } from '@playwright/test';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';

test.describe('edge function preflight', () => {
  test.skip(!SUPABASE_URL, 'Supabase URL not configured');

  test('OPTIONS preflight exposes CORS headers', async ({ request }) => {
    const match = SUPABASE_URL.match(/^https:\/\/([^.]+)\.supabase\.co/);
    expect(match, 'Supabase project ref could not be parsed').toBeTruthy();
    const projectRef = match![1];
    const response = await request.fetch(
      `https://${projectRef}.functions.supabase.co/generate-flashcards`,
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
        },
      }
    );

    expect(response.status()).toBe(204);
    const allowOrigin = response.headers()['access-control-allow-origin'];
    expect(allowOrigin).toBeDefined();
    const allowMethods = response.headers()['access-control-allow-methods'];
    expect(allowMethods?.toUpperCase()).toContain('POST');
    const allowHeaders = response.headers()['access-control-allow-headers'];
    expect((allowHeaders ?? '').toLowerCase()).toContain('authorization');
  });
});
