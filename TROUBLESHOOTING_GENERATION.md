# Troubleshooting "Failed to Fetch" Error

## Quick Diagnosis

You're seeing "Failed to fetch" when trying to generate flashcards. This means the frontend can't reach the edge function.

### Step 1: Check Edge Function URL

Open browser console (F12 → Console tab) and run:

```javascript
console.log('Function URL:', import.meta.env.VITE_SUPABASE_FUNCTION_URL);
```

**Expected**: `https://YOUR_PROJECT_REF.functions.supabase.co`
**Check**: Does this URL exist in your `.env` file?

### Step 2: Test Edge Function Directly

In terminal, test the edge function:

```bash
curl -X POST https://YOUR_PROJECT_REF.functions.supabase.co/generate-flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6ZmpqeXRudHVkd3h2bXd6eHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODc0NjQsImV4cCI6MjA3NzI2MzQ2NH0.GDIpChY0rH9O1wyAlQTrbvFctz2sv9eLZBYVZnWpCiM" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6ZmpqeXRudHVkd3h2bXd6eHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODc0NjQsImV4cCI6MjA3NzI2MzQ2NH0.GDIpChY0rH9O1wyAlQTrbvFctz2sv9eLZBYVZnWpCiM" \
  -d '{"text":"Photosynthesis is the process by which plants convert light energy into chemical energy. It occurs in chloroplasts."}'
```

**Possible Responses**:

1. **Success (200)**: Function works, issue is in frontend
2. **404**: Function not deployed
3. **401**: Auth issue
4. **500**: Function error (check Supabase logs)
5. **CORS error**: Need to update `ALLOWED_ORIGIN`

### Step 3: Check CORS Configuration

The edge function needs to allow requests from `http://localhost:5174` (your dev server port).

**In Supabase Dashboard**:
1. Go to Edge Functions → Secrets
2. Check `ALLOWED_ORIGIN` value
3. Should be: `http://localhost:5174` (note: 5174, not 5173)

**OR update in the edge function code**:

```typescript
// In supabase/functions/generate-flashcards/index.ts
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5174';
```

Then redeploy:
```bash
supabase functions deploy generate-flashcards
```

### Step 4: Check if Function is Deployed

In Supabase Dashboard:
1. Go to **Edge Functions**
2. Look for `generate-flashcards`
3. Status should be **ACTIVE**

If not deployed:
```bash
supabase functions deploy generate-flashcards
```

### Step 5: Check OpenAI API Key

The function won't work without an OpenAI API key.

**In Supabase Dashboard**:
1. Edge Functions → Secrets
2. Check for `OPENAI_API_KEY`
3. Should start with `sk-proj-...` or `sk-...`

If missing, add it:
1. Get key from https://platform.openai.com/api-keys
2. Add as secret in Supabase Dashboard

### Step 6: Check Browser Network Tab

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try generating again
4. Look for the request to `generate-flashcards`

**What to check**:
- **Request URL**: Should be `https://...functions.supabase.co/generate-flashcards`
- **Status**: Look at the HTTP status code
- **Response**: Click on the request → Preview/Response tab

**Common Issues**:

| Status | Meaning | Fix |
|--------|---------|-----|
| (failed) | CORS or network error | Update ALLOWED_ORIGIN |
| 404 | Function not found | Deploy the function |
| 401 | Auth error | Check anon key in .env |
| 500 | Server error | Check Supabase logs |
| 502 | Bad gateway | Function crashed, check logs |

### Step 7: Check Supabase Logs

**In Supabase Dashboard**:
1. Go to Edge Functions
2. Click on `generate-flashcards`
3. Click **Logs** tab
4. Look for recent errors

**Common errors**:
- `OPENAI_API_KEY not found` → Add secret
- `Rate limit exceeded` → Wait or upgrade OpenAI plan
- `Invalid JSON` → Function code issue

## Quick Fixes

### Fix 1: Update CORS (Most Common)

```bash
# In Supabase Dashboard → Edge Functions → Secrets
# Update or add:
ALLOWED_ORIGIN=http://localhost:5174
```

Then refresh your app.

### Fix 2: Deploy Function

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy
supabase functions deploy generate-flashcards
```

### Fix 3: Verify .env

Check [.env](.env):
```bash
VITE_SUPABASE_FUNCTION_URL=https://YOUR_PROJECT_REF.functions.supabase.co
```

No `/functions/v1` at the end!

### Fix 4: Add OpenAI Key

In Supabase Dashboard → Edge Functions → Secrets:
```
OPENAI_API_KEY=sk-proj-your-key-here
```

## Testing Checklist

- [ ] Edge function shows as ACTIVE in Supabase Dashboard
- [ ] `ALLOWED_ORIGIN` includes `http://localhost:5174`
- [ ] `OPENAI_API_KEY` is set in Supabase secrets
- [ ] `VITE_SUPABASE_FUNCTION_URL` is correct in `.env`
- [ ] Dev server running on port 5174 (check terminal)
- [ ] Can curl the function successfully from terminal
- [ ] Browser console shows no CORS errors
- [ ] Network tab shows 200 response (or specific error)

## Still Not Working?

### Option 1: Check Current Setup

Run this in browser console (F12):
```javascript
// Check environment variables
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Function URL:', import.meta.env.VITE_SUPABASE_FUNCTION_URL);
console.log('Has anon key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// Test fetch directly
fetch('https://YOUR_PROJECT_REF.functions.supabase.co/generate-flashcards', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6ZmpqeXRudHVkd3h2bXd6eHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODc0NjQsImV4cCI6MjA3NzI2MzQ2NH0.GDIpChY0rH9O1wyAlQTrbvFctz2sv9eLZBYVZnWpCiM',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6ZmpqeXRudHVkd3h2bXd6eHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODc0NjQsImV4cCI6MjA3NzI2MzQ2NH0.GDIpChY0rH9O1wyAlQTrbvFctz2sv9eLZBYVZnWpCiM'
  },
  body: JSON.stringify({ text: 'Test note about biology' })
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
```

### Option 2: Temporary Workaround

If the edge function isn't working, you can temporarily use the mock data while debugging:

**In `src/components/GenerateView.tsx`**, add this temporary fallback:

```typescript
try {
  const response = await callFunction(...);
  // ... existing code
} catch (err: any) {
  console.error('Generation error:', err);

  // TEMPORARY: Use mock data for testing
  if (confirm('Edge function error. Use mock data for testing?')) {
    const mockContent: GeneratedContent = {
      title,
      subject,
      flashcards: [
        { id: '1', front: 'What is photosynthesis?', back: 'The process by which plants convert light energy into chemical energy.' },
        { id: '2', front: 'Where does photosynthesis occur?', back: 'In the chloroplasts of plant cells.' },
      ],
      summary: 'Mock summary for testing purposes.',
    };
    onGenerate(mockContent);
    return;
  }

  setError(...);
}
```

## Most Likely Issue

**90% chance**: CORS configuration

The dev server is on port **5174**, but the edge function's `ALLOWED_ORIGIN` might be set to port 5173.

**Quick fix**:
1. Supabase Dashboard → Edge Functions → Secrets
2. Update `ALLOWED_ORIGIN` to `http://localhost:5174`
3. Refresh your app
4. Try again

## Need More Help?

Share:
1. Browser console errors (F12 → Console)
2. Network tab screenshot showing the failed request
3. Supabase edge function logs
4. Output of the curl command from Step 2
