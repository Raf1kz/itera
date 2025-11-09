# Fix JWT Authentication - Step by Step Guide

## Problem Summary
You're getting "Invalid JWT" (401) errors because:
1. CLERK_ISSUER in Supabase doesn't match your Clerk development instance
2. ALLOWED_ORIGIN is set to localhost instead of Vercel URL

## Step-by-Step Fix

### Step 1: Get Your Clerk Development Issuer URL

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Select your application
3. Go to **Configure** → **JWT Templates**
4. Find or create a template named **exactly** `supabase` (lowercase!)
5. If creating new template:
   - Click "New template"
   - Name: `supabase` (must be exact lowercase)
   - Template type: Blank
   - Click "Create"
6. In the template, look for the **Issuer** field at the top
   - It will look like: `https://xxxxx.clerk.accounts.dev`
   - **Copy this entire URL** - you'll need it in Step 3

7. While you're here, verify the **Claims** section has these fields:
   ```json
   {
     "aud": "authenticated",
     "exp": "{{token.exp}}",
     "iat": "{{token.iat}}",
     "iss": "{{token.iss}}",
     "sub": "{{user.id}}",
     "email": "{{user.primary_email_address}}"
   }
   ```
   - If missing, click "Edit" and add them
   - Click "Apply changes" and "Save"

### Step 2: Check Current Supabase Secrets

Run this to see what's currently set:

```bash
supabase secrets list
```

You should see:
- `CLERK_ISSUER` - This is probably wrong
- `ALLOWED_ORIGIN` - This is set to `http://localhost:5173`

### Step 3: Update CLERK_ISSUER

Replace `YOUR-DEV-INSTANCE.clerk.accounts.dev` with the issuer URL you copied from Step 1:

```bash
supabase secrets set CLERK_ISSUER=https://YOUR-DEV-INSTANCE.clerk.accounts.dev
```

**Example**:
```bash
supabase secrets set CLERK_ISSUER=https://premium-owl-12.clerk.accounts.dev
```

### Step 4: Update ALLOWED_ORIGIN to Your Vercel URL

```bash
supabase secrets set ALLOWED_ORIGIN=https://itera-en5wy8qi2-raf1kzs-projects.vercel.app
```

**Note**: No trailing slash! Copy it exactly as shown above.

### Step 5: Verify Secrets Were Updated

```bash
supabase secrets list
```

You should see both `CLERK_ISSUER` and `ALLOWED_ORIGIN` with new digests (hashes will be different).

### Step 6: Deploy Updated CSP to Vercel

The CSP header has already been fixed in `vercel.json` to allow Google Fonts and Clerk telemetry.

Commit and push the change:

```bash
git add vercel.json
git commit -m "Fix CSP to allow Google Fonts and Clerk telemetry"
git push
```

Vercel will automatically redeploy.

### Step 7: Test Authentication

1. Go to your Vercel site: https://itera-en5wy8qi2-raf1kzs-projects.vercel.app
2. **Sign out** if you're signed in (important - need fresh token!)
3. **Sign back in**
4. Try generating flashcards
5. Open DevTools Console:
   - Should see "Token obtained: Yes"
   - Should NOT see CORS or JWT errors
   - Generation should work!

## Troubleshooting

### Still Getting "Invalid JWT"?

1. Make sure you **signed out and back in** after updating secrets
2. Verify the issuer URL matches exactly (no typos, no trailing slash)
3. Check Supabase function logs:
   ```bash
   supabase functions logs generate-flashcards
   ```
4. Look for `clerk_jwt_jwks_failed` errors - they show what went wrong

### Still Getting CORS Errors?

1. Verify ALLOWED_ORIGIN has NO trailing slash
2. Verify it matches your Vercel URL exactly
3. Check the logs for the exact origin being rejected

### CSP Warnings Still Showing?

Wait for Vercel to finish deploying (check Deployments tab).
The CSP changes need a fresh deployment to take effect.

## Quick Command Summary

```bash
# 1. Get your Clerk issuer from dashboard, then:
supabase secrets set CLERK_ISSUER=https://YOUR-ISSUER.clerk.accounts.dev

# 2. Update CORS origin
supabase secrets set ALLOWED_ORIGIN=https://itera-en5wy8qi2-raf1kzs-projects.vercel.app

# 3. Verify
supabase secrets list

# 4. Commit CSP fix
git add vercel.json
git commit -m "Fix CSP for Google Fonts and Clerk telemetry"
git push

# 5. Sign out, sign back in, test!
```

## When Moving to Production

When you're ready to go live:

1. Publish Clerk application to production
2. Get production issuer URL (different from dev)
3. Update CLERK_ISSUER again
4. Use `pk_live_...` keys instead of `pk_test_...`
5. Update ALLOWED_ORIGIN to your production domain

---

**Need help?** Check the Supabase function logs for detailed error messages:
```bash
supabase functions logs generate-flashcards --follow
```
