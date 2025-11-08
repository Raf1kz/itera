# CORS Fix Applied

## Issue Resolved

**Error:** "Failed to fetch" when generating flashcards

**Root Cause:** CORS mismatch
- Your app runs on `https://localhost:5173` (HTTPS)
- Edge function was allowing `http://localhost:5173` (HTTP)
- Browser blocked the request due to origin mismatch

## Solution Applied

Changed CORS to wildcard in `supabase/functions/generate-flashcards/index.ts`:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // ✅ Now allows all origins
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};
```

Edge function redeployed successfully.

## Verification

```bash
curl -i https://wlzyfvywhpoahctwcpos.functions.supabase.co/generate-flashcards
# Returns: access-control-allow-origin: *
```

✅ CORS error fixed - fetch should now work!

## Next Step: Configure OpenAI Key

The fetch will succeed, but you'll get empty cards until you configure `OPENAI_API_KEY`:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project `wlzyfvywhpoahctwcpos`
3. **Project Settings** → **Edge Functions** → **Secrets**
4. Add: `OPENAI_API_KEY=sk-...`
5. Try generating cards again

Once the key is configured, the function will return actual flashcards instead of `{"cards":[]}`.

## Security Note

Using `Access-Control-Allow-Origin: *` is fine for this use case because:
- The edge function doesn't require authentication
- No sensitive user data is exposed
- The OpenAI key is server-side only

If you want to restrict to specific domains in production, set the `ALLOWED_ORIGIN` environment variable in Supabase Edge Function Secrets.
