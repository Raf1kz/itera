# FlashStudy Technical Status & Cleanup Guide

## Current State: ✅ Working

Generation is working with temporary admin bypass while Clerk JWT template configuration is pending.

---

## 🚨 TEMPORARY CODE (Remove After Fixing Clerk)

### 1. Edge Function Admin Bypass
**File:** `/supabase/functions/generate-flashcards/index.ts`

**Lines 134-140 & 97-102:**
```typescript
// TEMPORARY: Allow admin user to bypass auth for testing
const ADMIN_USER_ID = 'user_ADMIN_ID_PLACEHOLDER';
const bypassAuth = url.searchParams.get('admin_bypass') === '1';
if (!userId && bypassAuth) {
  console.warn('admin_bypass_used', { requestId: ctx.requestId });
  userId = ADMIN_USER_ID;
}
```

**Why It's Temporary:**
- Bypasses Clerk authentication completely
- Uses query parameter to override auth
- Should be removed once Clerk JWT template is properly configured

**How to Remove:**
1. Configure Clerk JWT template named "supabase" (see instructions below)
2. Delete the bypass code blocks
3. Redeploy edge function
4. Remove `?admin_bypass=1` from frontend calls

---

### 2. Frontend Using Supabase Anon Key Instead of Clerk JWT
**File:** `/src/components/GenerateView.tsx`

**Lines 77-82 & 99-104:**
```typescript
// Use Supabase anon key for bypass (satisfies Supabase auth requirement)
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const debugResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-flashcards?debug=1&admin_bypass=1`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${anonKey}`
  },
});
```

**Why It's Temporary:**
- Should be using Clerk JWT token, not Supabase anon key
- Anon key doesn't identify the user properly
- Relies on admin bypass hack

**How to Remove:**
1. Configure Clerk JWT template
2. Change back to using `headers['Authorization']` with Clerk token
3. Remove anon key hardcoding
4. Remove `?admin_bypass=1` parameter

---

## ✅ PERMANENT CODE (Good to Keep)

### 1. Ultra High-Quality Summaries
**File:** `/supabase/functions/generate-flashcards/index.ts`
- 5,000 max tokens (up from 1,400)
- 120s timeout (up from 60s)
- Comprehensive markdown-formatted summaries with structured sections

### 2. Language Detection
**Files:** `/supabase/functions/generate-flashcards/index.ts`, schema, migrations
- Auto-detects input language using `franc-min`
- Enforces output in same language as input
- Stores language code in database

### 3. Client-Side PDF/DOCX Extraction
**Files:** `/src/lib/fileExtractors.ts`, `/src/components/UnifiedUpload.tsx`
- Extracts text from PDF/DOCX/TXT in browser
- Progress UI with file-by-file status
- Error handling for failed extractions

### 4. Markdown Summary Rendering
**File:** `/src/components/SummaryDetail.tsx`
- React-markdown with GitHub Flavored Markdown
- Syntax highlighting for code blocks
- Custom styled components for headers, tables, etc.

### 5. URL Content Fetching
**File:** `/supabase/functions/_shared/extractors.ts`
- Fetches and strips HTML from URLs
- 30-second timeout
- Works server-side

### 6. Admin Role System
**Files:** `/src/lib/roles.ts`, `.env`
- Checks `VITE_ADMIN_USER_IDS` environment variable
- Grants access to "Soon" features
- Properly configured with your admin ID: `user_ADMIN_ID_PLACEHOLDER`

---

## 🔧 HOW TO FIX CLERK AUTHENTICATION (Remove Temporary Code)

### Step 1: Create Clerk JWT Template

1. Go to **Clerk Dashboard** → Configure → JWT Templates
2. Click "New template"
3. **Name:** `supabase` (MUST be exactly this, lowercase)
4. **Lifetime:** 3600 seconds
5. **Claims:**
```json
{
  "aud": "authenticated",
  "exp": "{{token.exp}}",
  "iat": "{{token.iat}}",
  "iss": "{{token.iss}}",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "user_metadata": {
    "email": "{{user.primary_email_address}}",
    "email_verified": {{user.primary_email_address_verified}},
    "full_name": "{{user.full_name}}",
    "avatar_url": "{{user.profile_image_url}}"
  }
}
```
6. **Save**

### Step 2: Verify Supabase Secrets

Run:
```bash
supabase secrets list | grep CLERK
```

Should show:
- `CLERK_ISSUER`: https://YOUR_CLERK_ACCOUNT.clerk.accounts.dev
- `CLERK_JWT_PUBLIC_KEY`: (should be empty or removed)

If `CLERK_JWT_PUBLIC_KEY` exists, remove it:
```bash
supabase secrets unset CLERK_JWT_PUBLIC_KEY
```

### Step 3: Remove Bypass Code

**In `/supabase/functions/generate-flashcards/index.ts`:**
1. Delete lines 134-140 (POST bypass)
2. Delete lines 97-102 (debug endpoint bypass)
3. Remove `bypassUsed` from debug response

**In `/src/components/GenerateView.tsx`:**
1. Replace anon key with Clerk token:
```typescript
// Before (temporary):
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
headers: { 'Authorization': `Bearer ${anonKey}` }

// After (proper):
headers: authHeader ? { Authorization: authHeader } : {}
```
2. Remove `?admin_bypass=1` from URLs
3. Use `headers` object with Clerk JWT

### Step 4: Test & Deploy

1. Sign out and sign back in to get fresh Clerk token
2. Test generation locally
3. Deploy edge function: `supabase functions deploy generate-flashcards`
4. Test in production

---

## 📊 Database Schema Changes

### Migrations Applied

1. **`20251102000000_add_language_column.sql`** ✅
   - Added `language` column to `cards` and `summaries`
   - Added indexes for language filtering

2. **`20251102000001_add_card_type.sql`** ❌ REVERTED
   - Added `card_type` and `card_data` columns
   - Not currently used (reverted to simple Q&A only)
   - Can be re-implemented later for card variety

---

## 🎯 What Needs to Be Done

### Immediate (To Remove Temporary Code):
- [ ] Configure Clerk JWT template named "supabase"
- [ ] Test Clerk authentication
- [ ] Remove admin bypass code from edge function
- [ ] Remove anon key workaround from frontend
- [ ] Redeploy and test

### Future Enhancements (From Original Plan):
- [ ] **Part 7**: Card Type Variations (Q&A, Cloze, MCQ) - partially implemented, reverted
- [ ] **Part 8**: AI Confidence Scoring
- [ ] **Part 9**: Post-Generation Review Screen
- [ ] **Part 10**: Individual Card Regeneration
- [ ] **Part 11**: User Feedback System

---

## 🐛 Known Issues

### None Currently
All major issues resolved. Generation working with bypass.

---

## 📝 Important Notes

1. **Admin ID:** Your admin account is `user_ADMIN_ID_PLACEHOLDER`
2. **Environment:** `.env` file now correctly configured
3. **Authentication:** Temporarily bypassed, needs Clerk JWT template
4. **Generation:** Working with 5K tokens, ultra-quality summaries
5. **File Upload:** PDF, DOCX, TXT all working with client-side extraction

---

## 🔒 Security Considerations

**Current State:**
- Admin bypass allows anyone with the URL parameter to generate as admin
- NOT production-ready
- MUST fix Clerk authentication before production use

**After Fixing:**
- Proper JWT validation per request
- User-specific content isolation
- No bypass backdoors

---

Last Updated: Nov 4, 2025
Status: Working with temporary bypass
Priority: Fix Clerk JWT template configuration
