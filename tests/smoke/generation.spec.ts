/// <reference types="@playwright/test" />

// @ts-nocheck

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const TEST_EMAIL = process.env.CLERK_TEST_EMAIL;
const TEST_PASSWORD = process.env.CLERK_TEST_PASSWORD;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

const supabaseClient = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null;

test.describe('generation persistence flow', () => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD || !supabaseClient,
    'Missing Supabase/Clerk credentials for smoke test.',
  );

  test('dry-run generation persists cards and summaries', async ({ page }) => {
    await page.goto('/');

    const getStarted = page.getByRole('button', { name: /get started/i });
    if (await getStarted.isVisible()) {
      await getStarted.click();
    }

    await page.getByRole('button', { name: /^sign in$/i }).click();
    const signInDialog = page.getByRole('dialog');
    await expect(signInDialog).toBeVisible();
    await signInDialog.getByLabel(/email/i).fill(TEST_EMAIL!);
    await signInDialog.getByLabel(/password/i).fill(TEST_PASSWORD!);
    await signInDialog.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page.getByText('Signed in')).toBeVisible({ timeout: 15_000 });

    const token = await page.evaluate(async () => {
      return window.Clerk?.session?.getToken({ template: 'supabase' });
    });

    expect(token).toBeTruthy();

    const { data: invokeData, error: invokeError } = await supabaseClient!.functions.invoke(
      'generate-flashcards',
      {
        body: {
          text: 'Dry run generation payload to validate persistence end-to-end with deterministic output.',
          options: {
            targetCards: 1,
            makeSummary: true,
            summaryDetail: 'deep',
          },
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        query: { dryRun: '1' },
      },
    );

    expect(invokeError).toBeNull();
    expect(invokeData?.ok).toBe(true);

    await page.reload();

    await page.getByRole('button', { name: /^Flashcards$/i }).click();
    await expect(page.getByText("What is Itera's purpose?", { exact: false })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /^Summaries$/i }).click();
    await expect(page.getByText('Itera Dry Run Summary', { exact: false })).toBeVisible({ timeout: 20_000 });
  });
});
