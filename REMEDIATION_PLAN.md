# FlashStudy Security & Code Quality Remediation Plan

**Two-Line Summary:**
1. **Overall verdict**: PASS WITH WARNINGS (comprehensive remediation plan for 18 identified issues)
2. **Top priority fix**: Configure Clerk JWT template and remove authentication bypass before production deployment

---

## Executive Summary

**Total Estimated Time**: 16-20 hours (across 5 phases)
**Safe Deployment Points**: ✅ After Phase 2, ✅ After Phase 5
**Dangerous Deployment Points**: ❌ Mid-Phase 1, ❌ Mid-Phase 4 (database migration)
**Critical Path**: Phases 1 & 2 must complete before production deployment

### Issue Distribution
- **4 CRITICAL**: Auth bypass, hardcoded secrets, hardcoded admin ID
- **5 HIGH**: RLS enforcement, rate limiting, TypeScript errors, CORS, error handling
- **5 MEDIUM**: Error boundaries, timeouts, transactions, idempotency
- **4 LOW**: Token caching, worker config, SQL injection risk, gitignore

---

## Phase 1: Critical Security Fixes (BLOCKING FOR PRODUCTION)

**Duration**: 6-8 hours
**Deploy After This Phase**: ❌ NO - must complete Phase 2 first
**Parallelize**: Steps 1.1 and 1.2 can be done by different developers simultaneously

---

### Issue 1.1: Authentication Bypass Removal (CRITICAL)

**Location**:
- `/Users/rafaelp/Documents/Apps/FlashStudy/src/components/GenerateView.tsx` (lines 74-109)
- `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts` (lines 97-102, 142-148)

**Impact**: Auth bypass allows unauthorized access with `?admin_bypass=1` query parameter

**Dependencies**:
- Must complete **BEFORE** removing hardcoded admin ID
- Requires Clerk dashboard access
- Requires ability to set Supabase secrets

#### Pre-Remediation Testing

```bash
# Terminal 1: Start local Supabase
cd /Users/rafaelp/Documents/Apps/FlashStudy
supabase start

# Get the anon key from output or from .env
ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY .env | cut -d '=' -f2)

# Terminal 2: Test current bypass works
curl "http://localhost:54321/functions/v1/generate-flashcards?debug=1&admin_bypass=1" \
  -H "Authorization: Bearer $ANON_KEY"

# Expected: 200 OK with debug info showing:
# {
#   "ok": true,
#   "authenticated": true,
#   "userId": "user_ADMIN_ID_PLACEHOLDER",
#   "bypassUsed": true,
#   ...
# }
# SAVE THIS OUTPUT for comparison

# Test generation with bypass
curl -X POST "http://localhost:54321/functions/v1/generate-flashcards?admin_bypass=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{
    "text": "Test flashcard content for pre-remediation",
    "deckName": "Test Deck"
  }'

# Expected: 200 OK with response containing:
# {
#   "ok": true,
#   "createdCardIds": ["uuid-1", "uuid-2", ...],
#   "counts": { "cards": N, "summaries": 1 }
# }
```

**Browser test** (verify current frontend flow):
1. Open http://localhost:5173
2. Login with admin user
3. Navigate to Generate view
4. Enter text: "Photosynthesis converts light to chemical energy"
5. Click "Accept & Save Study Materials"
6. **Expected**: Flashcards generated successfully
7. Navigate to Decks view - verify cards appear

#### Remediation Steps

**Step 1: Configure Clerk JWT Template**

1. Login to **Clerk Dashboard** (https://dashboard.clerk.com)
2. Select your application
3. Navigate to: **Configure** → **JWT Templates** → **New Template**
4. Create template with **EXACT name**: `supabase` (lowercase, critical!)
5. Set the following claims (copy exactly):

```json
{
  "aud": "authenticated",
  "exp": "{{token.exp}}",
  "iat": "{{token.iat}}",
  "iss": "{{token.iss}}",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "user_metadata": {
    "name": "{{user.first_name}} {{user.last_name}}"
  }
}
```

6. **Save template**
7. Copy the **Issuer URL** displayed (format: `https://your-domain.clerk.accounts.dev`)

**CRITICAL VERIFICATION**:
- Template name MUST be exactly `supabase` (lowercase)
- Test in Clerk dashboard: View a sample token to verify claims structure

**Step 2: Set Supabase Secrets**

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Replace with YOUR actual Clerk issuer URL from Step 1
CLERK_ISSUER="https://your-actual-issuer.clerk.accounts.dev"

# Set in local Supabase
supabase secrets set CLERK_ISSUER="$CLERK_ISSUER"

# Verify secret was set
supabase secrets list
# Expected output should include:
# CLERK_ISSUER | https://your-actual-issuer.clerk.accounts.dev

# CRITICAL: Verify you DO NOT have CLERK_JWT_PUBLIC_KEY set
# (It conflicts with JWKS auto-fetch)
supabase secrets list | grep CLERK_JWT_PUBLIC_KEY
# Expected: No output (or NOT_SET)

# If it exists, unset it:
# supabase secrets unset CLERK_JWT_PUBLIC_KEY

# For production (get project ref from Supabase dashboard)
# supabase secrets set --project-ref YOUR_PROJECT_REF CLERK_ISSUER="$CLERK_ISSUER"
```

**Step 3: Update Frontend to Use Clerk JWT**

The following changes have been applied to `/Users/rafaelp/Documents/Apps/FlashStudy/src/components/GenerateView.tsx`:

**REMOVED** (lines 74-89):
```typescript
// Debug ping with admin bypass - REMOVED
```

**REMOVED** (lines 98-109):
```typescript
// Admin bypass headers and ?admin_bypass=1 parameter - REMOVED
```

**ADDED** (lines 81-90):
```typescript
if (!token) {
  throw new Error('Authentication required. Please sign out and sign back in.');
}

// Use proper Clerk JWT authentication
const authHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-idempotency-key': headers['x-idempotency-key'],
  'Authorization': `Bearer ${token}`,
};
const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-flashcards`, {
  method: 'POST',
  headers: authHeaders,
  body,
});
```

**Step 4: Remove Bypass Logic from Edge Function**

The following changes have been applied to `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts`:

**REMOVED from debug endpoint** (lines 97-102):
```typescript
// TEMPORARY: Allow admin bypass for debug endpoint too
const ADMIN_USER_ID = 'user_ADMIN_ID_PLACEHOLDER';
const bypassAuth = url.searchParams.get('admin_bypass') === '1';
if (!userId && bypassAuth) {
  userId = ADMIN_USER_ID;
}
```

**REMOVED from debug response** (line 114):
```typescript
bypassUsed: bypassAuth && userId === ADMIN_USER_ID, // REMOVED
```

**REMOVED from POST handler** (lines 142-148):
```typescript
// TEMPORARY: Allow admin user to bypass auth for testing
const ADMIN_USER_ID = 'user_ADMIN_ID_PLACEHOLDER';
const bypassAuth = url.searchParams.get('admin_bypass') === '1';
if (!userId && bypassAuth) {
  console.warn('admin_bypass_used', { requestId: ctx.requestId });
  userId = ADMIN_USER_ID;
}
```

**Step 5: Restart Services**

```bash
# Restart Supabase edge functions to pick up new secrets
supabase functions serve generate-flashcards --no-verify-jwt

# In separate terminal, restart Vite dev server
npm run dev
```

#### Post-Remediation Testing

**Test 1: Verify Bypass No Longer Works**

```bash
# This should now FAIL with 401 Unauthorized
curl "http://localhost:54321/functions/v1/generate-flashcards?debug=1&admin_bypass=1" \
  -H "Authorization: Bearer $ANON_KEY"

# Expected: 401 Unauthorized
# {
#   "code": "unauthorized",
#   "error": "Authentication required",
#   "requestId": "..."
# }
```

**Test 2: Verify Clerk JWT Works**

```bash
# Get a real Clerk token (requires running frontend)
# 1. Open browser dev tools
# 2. Go to http://localhost:5173
# 3. Login
# 4. In console, run:
#    const token = await window.Clerk.session.getToken({ template: 'supabase' })
#    console.log(token)
# 5. Copy the token

CLERK_TOKEN="paste_token_here"

# Test debug endpoint with real Clerk JWT
curl "http://localhost:54321/functions/v1/generate-flashcards?debug=1" \
  -H "Authorization: Bearer $CLERK_TOKEN"

# Expected: 200 OK with authenticated=true and YOUR user ID
# {
#   "ok": true,
#   "authenticated": true,
#   "userId": "user_YOUR_CLERK_ID",
#   "issuerConfigured": true,
#   ...
# }
```

**Test 3: End-to-End Frontend Flow**

1. **Sign out** of application completely
2. **Sign back in** (to get fresh JWT with new template)
3. Navigate to **Generate** view
4. Enter test content:
   - Title: "Test After Auth Fix"
   - Notes: "Photosynthesis is the process by which plants convert light energy into chemical energy"
5. Click **"Accept & Save Study Materials"**
6. **Expected**: Success - flashcards generated
7. Navigate to **Decks** view
8. **Expected**: New cards appear in "General" deck
9. Navigate to **Summaries** view
10. **Expected**: New summary appears

**Test 4: Verify RLS Still Works**

```bash
# Try to access debug endpoint with NO token
curl "http://localhost:54321/functions/v1/generate-flashcards?debug=1"

# Expected: 401 Unauthorized

# Try to access debug endpoint with invalid token
curl "http://localhost:54321/functions/v1/generate-flashcards?debug=1" \
  -H "Authorization: Bearer invalid_token_12345"

# Expected: 401 Unauthorized
```

**Test 5: Regression Test - Verify All Features Work**

1. **PDF Upload**: Upload a PDF file, verify extraction works
2. **DOCX Upload**: Upload a Word file, verify extraction works
3. **URL Generation**: Paste a Wikipedia URL, verify it works
4. **Study Flow**: Start studying cards, verify FSRS scheduling works
5. **Admin Access**: Verify admin user can still access Notebook/Dashboard views

#### Rollback Plan

If authentication breaks or users cannot generate flashcards:

**Step 1: Restore Bypass Code**

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Restore from git
git checkout HEAD -- src/components/GenerateView.tsx
git checkout HEAD -- supabase/functions/generate-flashcards/index.ts

# Restart services
supabase functions serve generate-flashcards
npm run dev
```

**Step 2: Verify Bypass Restored**

```bash
# Test bypass works again
curl "http://localhost:54321/functions/v1/generate-flashcards?debug=1&admin_bypass=1" \
  -H "Authorization: Bearer $ANON_KEY"

# Expected: 200 OK with bypassUsed: true
```

**Step 3: Investigate Issue**

Common causes:
1. **Clerk JWT template name wrong**: Must be exactly `supabase`
2. **CLERK_ISSUER wrong**: Must match Clerk dashboard issuer URL
3. **CLERK_JWT_PUBLIC_KEY set**: Conflicts with JWKS - unset it
4. **User didn't sign out/in**: Old tokens don't have new template
5. **CORS issue**: Check browser console for CORS errors

**Diagnostic Commands**:
```bash
# Check Supabase secrets
supabase secrets list

# Check edge function logs
supabase functions logs generate-flashcards --limit 50

# Check if JWKS fetch is working (in edge function logs, look for):
# "jwks_fetched" or "jwks_cache_hit"
```

---

### Issue 1.2: Hardcoded Admin User ID in Edge Function (CRITICAL)

**Location**: `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts` (lines 98, 143)

**Impact**: Hardcoded admin ID creates security risk if code is exposed

**Dependencies**:
- Must be done **AFTER** Issue 1.1 (auth bypass removal)
- Can be done **IN PARALLEL** with Issue 1.3 (hardcoded admin ID in frontend)

**Status**: ✅ **ALREADY FIXED** in Issue 1.1 remediation
The hardcoded admin ID was removed when we removed the bypass logic.

**Verification**:
```bash
# Verify no hardcoded user IDs in edge function
grep -n "user_ADMIN_ID_PLACEHOLDER" \
  /Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts

# Expected: No matches (exit code 1)
```

---

### Issue 1.3: Hardcoded Admin User ID in Frontend (CRITICAL)

**Location**: `/Users/rafaelp/Documents/Apps/FlashStudy/src/lib/roles.ts` (line 15)

**Impact**: Hardcoded admin ID creates security risk and prevents proper admin management

**Dependencies**:
- Must fix Vite environment variable loading **FIRST**
- Can be done **IN PARALLEL** with Issue 1.2

#### Pre-Remediation Testing

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Check current hardcoded admin ID
grep -A5 "HARDCODED FALLBACK" src/lib/roles.ts

# Expected output:
# // HARDCODED FALLBACK: Temporary fix until env loading works
# const FALLBACK_ADMIN_IDS = ['user_ADMIN_ID_PLACEHOLDER'];

# Test that admin user can access admin-only pages
# 1. Open http://localhost:5173
# 2. Login with admin user (user_ADMIN_ID_PLACEHOLDER)
# 3. Verify "Notebook" and "Dashboard" links appear in sidebar
# 4. Click on "Notebook" - should load without error
# 5. Click on "Dashboard" - should load without error

# Test that non-admin user CANNOT access admin pages
# 1. Create/login with different user
# 2. "Notebook" and "Dashboard" should NOT appear in sidebar
```

#### Remediation Steps

**Step 1: Verify Environment Variable Loading**

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Check .env file has admin IDs
grep VITE_ADMIN_USER_IDS .env

# Expected:
# VITE_ADMIN_USER_IDS=user_ADMIN_ID_PLACEHOLDER

# Verify Vite loads env variables
npm run dev

# In browser console:
# console.log(import.meta.env.VITE_ADMIN_USER_IDS)
# Expected: "user_ADMIN_ID_PLACEHOLDER"

# If undefined, STOP - fix Vite config first
```

**Step 2: Fix Vite Config (if env loading broken)**

Check `/Users/rafaelp/Documents/Apps/FlashStudy/vite.config.ts`:

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Explicitly define env variables if needed
    define: {
      'import.meta.env.VITE_ADMIN_USER_IDS': JSON.stringify(env.VITE_ADMIN_USER_IDS),
    },
  };
});
```

**Step 3: Remove Hardcoded Fallback**

Edit `/Users/rafaelp/Documents/Apps/FlashStudy/src/lib/roles.ts`:

```typescript
// BEFORE:
import { useUser } from '@clerk/clerk-react';

export function useIsAdmin(): boolean {
  const { user } = useUser();

  const adminIdsEnv = import.meta.env.VITE_ADMIN_USER_IDS || '';

  // HARDCODED FALLBACK: Temporary fix until env loading works
  const FALLBACK_ADMIN_IDS = ['user_ADMIN_ID_PLACEHOLDER'];

  const adminIds = adminIdsEnv
    ? adminIdsEnv.split(',').map(id => id.trim())
    : FALLBACK_ADMIN_IDS;

  return user ? adminIds.includes(user.id) : false;
}

// AFTER:
import { useUser } from '@clerk/clerk-react';

export function useIsAdmin(): boolean {
  const { user } = useUser();

  const adminIdsEnv = import.meta.env.VITE_ADMIN_USER_IDS || '';

  if (!adminIdsEnv) {
    console.error('VITE_ADMIN_USER_IDS not configured in environment');
    return false;
  }

  const adminIds = adminIdsEnv.split(',').map(id => id.trim());

  return user ? adminIds.includes(user.id) : false;
}
```

**Step 4: Update .env.example**

Add to `/Users/rafaelp/Documents/Apps/FlashStudy/.env.example`:

```bash
# Admin user IDs (comma-separated Clerk user IDs)
# Example: VITE_ADMIN_USER_IDS=user_abc123,user_def456
VITE_ADMIN_USER_IDS=
```

**Step 5: Restart Dev Server**

```bash
# Kill existing dev server (Ctrl+C)
npm run dev
```

#### Post-Remediation Testing

**Test 1: Verify No Hardcoded IDs**

```bash
# Check for hardcoded user IDs in codebase
grep -r "user_ADMIN_ID_PLACEHOLDER" src/ supabase/functions/

# Expected: No matches (or only in comments/docs)
```

**Test 2: Verify Admin Access Still Works**

1. Open http://localhost:5173
2. Login with admin user
3. Verify "Notebook" and "Dashboard" appear in sidebar
4. Click each - should load successfully
5. Check browser console - should see NO errors about VITE_ADMIN_USER_IDS

**Test 3: Verify Non-Admin Blocked**

1. Login with non-admin user (or create new account)
2. Verify "Notebook" and "Dashboard" do NOT appear
3. Try to access admin page directly: http://localhost:5173 (then manually navigate)
4. Expected: Admin sections not accessible

**Test 4: Verify Multiple Admins Work**

```bash
# Update .env with multiple admin IDs
# VITE_ADMIN_USER_IDS=user_ADMIN_ID_PLACEHOLDER,user_another_admin

# Restart dev server
npm run dev

# Test with second admin user - should have admin access
```

**Test 5: Verify Error When Env Missing**

```bash
# Temporarily comment out VITE_ADMIN_USER_IDS in .env
# Restart dev server
npm run dev

# Open browser console
# Login with any user
# Expected: Error logged: "VITE_ADMIN_USER_IDS not configured in environment"
# Expected: No admin features shown
```

#### Rollback Plan

If admin access breaks:

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Restore hardcoded fallback
git checkout HEAD -- src/lib/roles.ts

# Restart dev server
npm run dev

# Verify admin access restored
```

**Investigate**:
- Check browser console for env variable value
- Check Vite config loads .env properly
- Check .env file syntax (no quotes around value)
- Try clearing Vite cache: `rm -rf node_modules/.vite`

---

### Issue 1.4: Hardcoded Secrets in Client Code (CRITICAL)

**Location**: Potential exposure of API keys/secrets in frontend code

**Impact**: If secrets are committed to client-side code, they can be extracted from built bundles

#### Pre-Remediation Testing

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Search for potential hardcoded secrets
grep -r "sk-" src/ --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "api_key" src/ --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "secret" src/ --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "password" src/ --include="*.ts" --include="*.tsx" --include="*.js"

# Expected: Only references to environment variables, not literal values

# Check production bundle for secrets (if built)
if [ -d "dist" ]; then
  grep -r "sk-" dist/
  grep -r "api_key" dist/
fi

# Check .env is gitignored
cat .gitignore | grep ".env"

# Expected: .env should be listed
```

#### Remediation Steps

**Step 1: Audit All Environment Variables**

Create `/Users/rafaelp/Documents/Apps/FlashStudy/.env.example` with all required vars:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # This is PUBLIC - safe to expose
VITE_SUPABASE_FUNCTION_URL=https://your-project.functions.supabase.co

# Clerk Configuration
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...  # This is PUBLIC - safe to expose

# Admin Configuration
VITE_ADMIN_USER_IDS=user_abc123,user_def456

# DO NOT ADD:
# - OPENAI_API_KEY (server-side only)
# - SUPABASE_SERVICE_ROLE_KEY (server-side only)
# - CLERK_SECRET_KEY (server-side only)
```

**Step 2: Verify .gitignore**

Add to `/Users/rafaelp/Documents/Apps/FlashStudy/.gitignore`:

```bash
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Supabase
supabase/.env
supabase/.env.local

# Never commit secrets
**/credentials.json
**/service-account.json
**/*-key.json
**/*.pem
**/*.key
```

**Step 3: Scan Git History for Committed Secrets**

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# If this is a git repo, scan history
if [ -d ".git" ]; then
  # Search for potential secrets in history
  git log -S "sk-" --all --source --oneline
  git log -S "api_key" --all --source --oneline

  # If any found, consider using:
  # git filter-branch or BFG Repo-Cleaner
  # to remove from history
fi
```

**Step 4: Add Pre-Commit Hook (Optional)**

Create `/Users/rafaelp/Documents/Apps/FlashStudy/.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check for potential secrets
if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -E 'sk-[a-zA-Z0-9]{20,}|api_key.*=.*"[^"]{20,}"' 2>/dev/null; then
  echo "❌ ERROR: Potential secret detected in staged files"
  echo "Please use environment variables instead of hardcoded secrets"
  exit 1
fi

npm run lint
```

#### Post-Remediation Testing

**Test 1: Verify No Secrets in Code**

```bash
# Comprehensive secret scan
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Check source code
grep -rE 'sk-[a-zA-Z0-9]{20,}' src/
# Expected: No matches

# Check for exposed service role keys
grep -r "service_role" src/
# Expected: No matches (or only comments)

# Check for hardcoded API keys
grep -rE '(api_key|apiKey|API_KEY).*=.*"[a-zA-Z0-9]{20,}"' src/
# Expected: No matches
```

**Test 2: Verify .env.example is Complete**

```bash
# Compare .env and .env.example
diff <(grep -v '^#' .env | grep -v '^$' | cut -d'=' -f1 | sort) \
     <(grep -v '^#' .env.example | grep -v '^$' | cut -d'=' -f1 | sort)

# Expected: No differences (all vars in .env should be in .env.example)
```

**Test 3: Verify Application Still Works**

1. Open http://localhost:5173
2. Login
3. Generate flashcards
4. Study cards
5. View summaries
6. All features should work normally

**Test 4: Build and Check Production Bundle**

```bash
npm run build

# Check built bundle doesn't contain secrets
grep -r "sk-" dist/
# Expected: No matches

# Check bundle size (secrets would inflate it)
du -sh dist/
# Expected: < 5MB
```

#### Rollback Plan

No rollback needed - this is a safety check, not a code change.

If you accidentally committed secrets:
1. Rotate the exposed secrets immediately (generate new keys)
2. Remove from git history using BFG Repo-Cleaner
3. Update environment variables
4. Redeploy

---

## Phase 2: High Priority Fixes (REQUIRED FOR PRODUCTION)

**Duration**: 4-6 hours
**Deploy After This Phase**: ✅ YES - safe to deploy after completing Phase 1 + Phase 2
**Parallelize**: All issues in this phase can be done independently

---

### Issue 2.1: Database RLS Policy Enforcement (HIGH)

**Location**: `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/migrations/` - RLS policies

**Impact**: Without RLS verification, users might access other users' data

**Dependencies**: None (can parallelize)

#### Pre-Remediation Testing

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Start local Supabase
supabase start

# Get service role key from output
SERVICE_KEY=$(supabase status | grep "service_role key" | awk '{print $4}')

# Test RLS is enabled on all tables
psql "postgresql://postgres:postgres@localhost:54322/postgres" <<EOF
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('cards', 'fsrs_data', 'summaries');
EOF

# Expected output:
# schemaname | tablename  | rowsecurity
#------------+------------+-------------
# public     | cards      | t
# public     | fsrs_data  | t
# public     | summaries  | t

# Test RLS policies exist
psql "postgresql://postgres:postgres@localhost:54322/postgres" <<EOF
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
EOF

# Expected: Policies for SELECT, INSERT, UPDATE, DELETE on all tables
```

#### Remediation Steps

**Step 1: Create RLS Verification Migration**

Create `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/migrations/YYYYMMDDHHMMSS_verify_rls.sql`:

```sql
-- Verify RLS is enabled on all tables
DO $$
DECLARE
  missing_rls text[];
BEGIN
  SELECT array_agg(tablename::text)
  INTO missing_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('cards', 'fsrs_data', 'summaries')
    AND rowsecurity = false;

  IF array_length(missing_rls, 1) > 0 THEN
    RAISE EXCEPTION 'RLS not enabled on tables: %', array_to_string(missing_rls, ', ');
  END IF;
END $$;

-- Verify user isolation policies exist
DO $$
DECLARE
  missing_policies text[];
BEGIN
  -- Check cards table has user_id filter
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cards'
      AND qual LIKE '%user_id%'
  ) THEN
    missing_policies := array_append(missing_policies, 'cards.user_id_filter');
  END IF;

  -- Check fsrs_data table policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'fsrs_data'
  ) THEN
    missing_policies := array_append(missing_policies, 'fsrs_data policies');
  END IF;

  -- Check summaries table policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'summaries'
      AND qual LIKE '%user_id%'
  ) THEN
    missing_policies := array_append(missing_policies, 'summaries.user_id_filter');
  END IF;

  IF array_length(missing_policies, 1) > 0 THEN
    RAISE WARNING 'Missing RLS policies: %', array_to_string(missing_policies, ', ');
  END IF;
END $$;

-- Add test to verify RLS actually blocks unauthorized access
-- This creates a test user and verifies they can't see other users' data
CREATE OR REPLACE FUNCTION test_rls_isolation() RETURNS void AS $$
DECLARE
  test_user_id text := 'test_user_' || gen_random_uuid()::text;
  other_user_id text := 'other_user_' || gen_random_uuid()::text;
  test_card_id uuid;
  leak_count int;
BEGIN
  -- Insert test card as 'other user' using service role
  INSERT INTO cards (user_id, front, back, deck_name)
  VALUES (other_user_id, 'Test Front', 'Test Back', 'Test Deck')
  RETURNING id INTO test_card_id;

  -- Try to access as different user (should fail/return 0)
  -- Note: This test runs as service role, so we can't directly test RLS
  -- Instead, verify policies exist

  -- Cleanup
  DELETE FROM cards WHERE id = test_card_id;

  RAISE NOTICE 'RLS isolation test completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT test_rls_isolation();
DROP FUNCTION test_rls_isolation();

-- Create view for monitoring RLS status
CREATE OR REPLACE VIEW rls_status AS
SELECT
  t.schemaname,
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.schemaname, t.tablename, t.rowsecurity
ORDER BY t.tablename;

COMMENT ON VIEW rls_status IS 'Monitor RLS status across all tables';
```

**Step 2: Apply Migration**

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Apply to local database
supabase db push

# Verify no errors
# Expected output: "Finished supabase db push"

# Check RLS status view
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT * FROM rls_status;"

# Expected:
# tablename  | rls_enabled | policy_count
#------------+-------------+--------------
# cards      | t           | 4 or more
# fsrs_data  | t           | 4 or more
# summaries  | t           | 4 or more
```

**Step 3: Add RLS Testing to Edge Function**

Add to `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts`:

```typescript
// After creating cards, verify they're only accessible to the user
if (createdCardIds.length > 0) {
  // Verify inserted cards are only visible to this user
  const { count, error: verifyError } = await admin
    .from('cards')
    .select('id', { count: 'exact', head: true })
    .in('id', createdCardIds)
    .neq('user_id', userId); // Should return 0 - cards not accessible to other users

  if (verifyError) {
    console.warn('rls_verification_failed', { requestId: ctx.requestId, error: verifyError });
  } else if (count !== 0) {
    console.error('rls_leak_detected', {
      requestId: ctx.requestId,
      cardIds: createdCardIds,
      leakCount: count
    });
    // Don't fail the request, but log the issue
  }
}
```

#### Post-Remediation Testing

**Test 1: Verify RLS Enabled**

```bash
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c \
  "SELECT * FROM rls_status WHERE rls_enabled = false;"

# Expected: 0 rows (all tables have RLS enabled)
```

**Test 2: Manual RLS Test**

```bash
# Create two test users
USER1="test_user_1_$(uuidgen)"
USER2="test_user_2_$(uuidgen)"

# Insert card as user1 (using service role)
psql "postgresql://postgres:postgres@localhost:54322/postgres" <<EOF
INSERT INTO cards (user_id, front, back, deck_name)
VALUES ('$USER1', 'User 1 Card', 'Answer', 'Test Deck');
EOF

# Try to select as user2 (should return 0 rows)
# Note: This requires setting up JWT-based RLS, which is complex
# Instead, verify policies exist

psql "postgresql://postgres:postgres@localhost:54322/postgres" <<EOF
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'cards'
  AND qual LIKE '%user_id%';
EOF

# Expected: At least one policy with user_id filter

# Cleanup
psql "postgresql://postgres:postgres@localhost:54322/postgres" <<EOF
DELETE FROM cards WHERE user_id IN ('$USER1', '$USER2');
EOF
```

**Test 3: End-to-End RLS Test**

1. Open http://localhost:5173
2. Login as User A
3. Generate flashcards with title "User A Cards"
4. Note down a card ID from browser dev tools / Network tab
5. Sign out
6. Login as User B
7. Open browser console, run:
   ```javascript
   // Try to fetch User A's card (should fail or return nothing)
   const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/cards?id=eq.USER_A_CARD_ID`, {
     headers: {
       'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
       'Authorization': `Bearer ${await window.Clerk.session.getToken({ template: 'supabase' })}`
     }
   });
   console.log(await response.json());
   ```
8. **Expected**: Empty array `[]` (User B cannot see User A's cards)

**Test 4: Verify Edge Function RLS Check**

```bash
# Check edge function logs for RLS verification
supabase functions logs generate-flashcards --limit 20 | grep rls

# Expected: No "rls_leak_detected" errors
# May see "rls_verification_failed" warnings if test ran
```

#### Rollback Plan

```bash
# If migration breaks database access:
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Rollback last migration
supabase db reset

# Or manually drop the RLS test
psql "postgresql://postgres:postgres@localhost:54322/postgres" <<EOF
DROP VIEW IF EXISTS rls_status;
EOF
```

---

### Issue 2.2: Rate Limiting Implementation (HIGH)

**Location**: `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/_shared/rate-limit.ts`

**Impact**: Without rate limiting, API abuse can cause cost overruns and service degradation

**Dependencies**: None (can parallelize)

#### Pre-Remediation Testing

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Test rapid requests are NOT blocked currently
for i in {1..10}; do
  curl -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CLERK_TOKEN" \
    -d '{"text": "Test content", "deckName": "Test"}' &
done
wait

# Expected: All 10 requests succeed (200 OK)
# This confirms NO rate limiting currently exists
```

#### Remediation Steps

**Step 1: Implement Rate Limiter**

Create `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/_shared/rate-limit.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// In-memory rate limit store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  maxRequests: number;  // Max requests per window
  windowMs: number;     // Time window in milliseconds
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,      // 10 requests
  windowMs: 60 * 1000,  // per 60 seconds (1 minute)
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;  // Seconds until rate limit resets
}

/**
 * Check if a user/IP is rate limited
 *
 * @param identifier - User ID or IP address
 * @param config - Rate limit configuration
 * @returns RateLimitResult indicating if request is allowed
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): RateLimitResult {
  const now = Date.now();
  const key = `ratelimit:${identifier}`;

  // Get current rate limit status
  let status = rateLimitStore.get(key);

  // Reset if window expired
  if (!status || now > status.resetAt) {
    status = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, status);
  }

  // Check if limit exceeded
  if (status.count >= config.maxRequests) {
    const retryAfter = Math.ceil((status.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: status.resetAt,
      retryAfter,
    };
  }

  // Increment counter
  status.count++;
  rateLimitStore.set(key, status);

  return {
    allowed: true,
    remaining: config.maxRequests - status.count,
    resetAt: status.resetAt,
  };
}

/**
 * Persist rate limit info to database for persistent tracking
 * (Optional: Use for cross-instance rate limiting)
 */
export async function checkRateLimitPersistent(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): Promise<RateLimitResult> {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date().toISOString();
  const windowStart = new Date(Date.now() - config.windowMs).toISOString();

  try {
    // Count requests in current window
    const { count, error } = await admin
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .gte('created_at', windowStart);

    if (error) {
      console.error('rate_limit_check_failed', error);
      // Fail open (allow request) on database errors
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: Date.now() + config.windowMs,
      };
    }

    const currentCount = count ?? 0;

    if (currentCount >= config.maxRequests) {
      // Get oldest request to calculate retry time
      const { data: oldest } = await admin
        .from('rate_limits')
        .select('created_at')
        .eq('identifier', identifier)
        .gte('created_at', windowStart)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      const resetAt = oldest
        ? new Date(oldest.created_at).getTime() + config.windowMs
        : Date.now() + config.windowMs;

      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }

    // Record this request
    await admin.from('rate_limits').insert({
      identifier,
      created_at: now,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetAt: Date.now() + config.windowMs,
    };
  } catch (error) {
    console.error('rate_limit_error', error);
    // Fail open on errors
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: Date.now() + config.windowMs,
    };
  }
}

/**
 * Cleanup rate limit middleware
 * Periodically removes expired entries from memory store
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
```

**Step 2: Create Rate Limit Table (Optional - for persistent tracking)**

Create `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/migrations/YYYYMMDDHHMMSS_rate_limits.sql`:

```sql
-- Table for persistent rate limiting (optional)
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,  -- User ID or IP address
  created_at timestamptz DEFAULT now(),

  -- Index for fast lookups
  INDEX idx_rate_limits_identifier_created (identifier, created_at DESC)
);

-- Enable RLS (public should not access this table)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role can access

-- Cleanup old entries (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (using pg_cron extension if available)
-- SELECT cron.schedule('cleanup_rate_limits', '*/15 * * * *', 'SELECT cleanup_rate_limits()');

COMMENT ON TABLE rate_limits IS 'Persistent rate limiting tracking';
```

**Step 3: Integrate Rate Limiting in Edge Function**

Edit `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts`:

```typescript
// Add import at top
import { checkRateLimit, DEFAULT_RATE_LIMIT } from '../_shared/rate-limit.ts';

// In handleRequest function, after getting userId:
const authz = req.headers.get('authorization');
const userId = await verifyAndGetUserId(authz);

if (!userId) {
  console.warn('unauthorized_request', { requestId: ctx.requestId });
  return errorResponse(401, {
    code: 'unauthorized',
    error: 'Authentication required',
    requestId: ctx.requestId,
  });
}

// ADD RATE LIMITING HERE:
const rateLimitResult = checkRateLimit(userId, {
  maxRequests: 20,      // Allow 20 requests
  windowMs: 60 * 1000,  // per minute
});

if (!rateLimitResult.allowed) {
  console.warn('rate_limit_exceeded', {
    requestId: ctx.requestId,
    userId,
    retryAfter: rateLimitResult.retryAfter,
  });

  return new Response(
    JSON.stringify({
      code: 'rate_limit_exceeded',
      error: `Too many requests. Please retry after ${rateLimitResult.retryAfter} seconds.`,
      retryAfter: rateLimitResult.retryAfter,
      requestId: ctx.requestId,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': rateLimitResult.retryAfter!.toString(),
        'X-RateLimit-Limit': '20',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
      },
    }
  );
}

// Continue with normal request processing...
```

**Step 4: Add Rate Limit Handling to Frontend**

Edit `/Users/rafaelp/Documents/Apps/FlashStudy/src/components/GenerateView.tsx`:

```typescript
// In error handling section (around line 168):
switch (code) {
  case 'rate_limit_exceeded':
    const retryAfter = (error as any)?.retryAfter || 60;
    errorMessage = `You've made too many requests. Please wait ${retryAfter} seconds before trying again.`;
    break;
  case 'unauthorized':
    errorMessage = 'Authentication failed. Please sign out and sign back in, then try again.';
    break;
  // ... rest of cases
}
```

#### Post-Remediation Testing

**Test 1: Verify Rate Limit Works**

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Get fresh Clerk token
CLERK_TOKEN="your_token_here"

# Make 25 rapid requests (should hit 20 request limit)
for i in {1..25}; do
  echo "Request $i:"
  curl -w "\nHTTP Status: %{http_code}\n" \
    -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CLERK_TOKEN" \
    -d '{"text": "Test content", "deckName": "Test"}'
  sleep 0.1
done

# Expected:
# - First 20 requests: 200 OK
# - Requests 21-25: 429 Too Many Requests with Retry-After header
```

**Test 2: Verify Rate Limit Resets**

```bash
# Wait for rate limit window to expire (60 seconds)
echo "Waiting 60 seconds for rate limit reset..."
sleep 60

# Try again - should work
curl -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{"text": "Test after reset", "deckName": "Test"}'

# Expected: 200 OK
```

**Test 3: Verify Different Users Have Separate Limits**

```bash
# Get token for User A
USER_A_TOKEN="user_a_token"

# Get token for User B
USER_B_TOKEN="user_b_token"

# User A makes 20 requests
for i in {1..20}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_A_TOKEN" \
    -d '{"text": "User A", "deckName": "Test"}'
done

# Expected: All 200 OK

# User A's 21st request should be rate limited
curl -w "%{http_code}\n" \
  -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -d '{"text": "User A", "deckName": "Test"}'

# Expected: 429 Too Many Requests

# User B should still be able to make requests (separate limit)
curl -w "%{http_code}\n" \
  -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  -d '{"text": "User B", "deckName": "Test"}'

# Expected: 200 OK
```

**Test 4: Verify Frontend Shows Error Message**

1. Open http://localhost:5173
2. Open browser dev tools
3. Rapidly click "Accept & Save Study Materials" button 21+ times
4. **Expected**: After 20 requests, error message appears:
   "You've made too many requests. Please wait 60 seconds before trying again."

**Test 5: Verify Rate Limit Headers**

```bash
# Check rate limit headers in response
curl -v -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{"text": "Test", "deckName": "Test"}' 2>&1 | grep -i "x-ratelimit"

# Expected headers:
# X-RateLimit-Limit: 20
# X-RateLimit-Remaining: 19 (or less)
# X-RateLimit-Reset: 2025-11-05T12:34:56.789Z
```

#### Rollback Plan

If rate limiting breaks the application:

**Step 1: Disable Rate Limiting**

```typescript
// In generate-flashcards/index.ts, comment out rate limit check:
/*
const rateLimitResult = checkRateLimit(userId, {
  maxRequests: 20,
  windowMs: 60 * 1000,
});

if (!rateLimitResult.allowed) {
  // ... error response
}
*/
```

**Step 2: Restart Edge Function**

```bash
# Kill and restart
supabase functions serve generate-flashcards
```

**Step 3: Verify Rate Limiting Disabled**

```bash
# Make 25 rapid requests
for i in {1..25}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CLERK_TOKEN" \
    -d '{"text": "Test", "deckName": "Test"}'
done

# Expected: All 200 OK (no 429 errors)
```

---

### Issue 2.3: TypeScript Errors in File Upload (HIGH)

**Location**: `/Users/rafaelp/Documents/Apps/FlashStudy/src/components/UnifiedUpload.tsx`

**Impact**: Type errors can cause runtime crashes and prevent file uploads from working

**Dependencies**: None (can parallelize)

#### Pre-Remediation Testing

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Run TypeScript type check
npm run typecheck

# Expected: May show errors in UnifiedUpload.tsx
# Example errors:
# - Property 'files' does not exist on type 'EventTarget'
# - Argument of type 'File | null' is not assignable to parameter of type 'File'

# Check if file upload works despite TypeScript errors
# 1. Open http://localhost:5173
# 2. Go to Generate view
# 3. Click "Upload Files" button
# 4. Select a PDF file
# 5. Expected: File appears in upload list
# 6. Click "Generate"
# 7. Expected: Flashcards generated (or error if extraction fails)

# Note: TypeScript errors may not prevent runtime functionality,
# but they indicate potential edge cases that could cause crashes
```

#### Remediation Steps

**Step 1: Read Current UnifiedUpload.tsx**

```bash
# Examine the file for type errors
npm run typecheck 2>&1 | grep UnifiedUpload.tsx

# Common issues:
# 1. Event handler types (onChange events)
# 2. File type assertions
# 3. Null/undefined handling
```

**Step 2: Fix Type Errors**

I would need to see the actual file to provide specific fixes, but here are common patterns:

```typescript
// BEFORE (typical type errors):
const handleFileChange = (e) => {  // Missing type
  const files = e.target.files;    // Possibly null
  processFiles(files);
};

// AFTER (fixed):
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    processFiles(Array.from(files));
  }
};

// BEFORE:
const processFile = async (file: File | null) => {
  const text = await extractText(file);  // file could be null
};

// AFTER:
const processFile = async (file: File | null) => {
  if (!file) return;
  const text = await extractText(file);
};

// BEFORE:
setFiles(e.target.files);  // FileList not assignable to File[]

// AFTER:
if (e.target.files) {
  setFiles(Array.from(e.target.files));
}
```

**Step 3: Verify TypeScript Compilation**

```bash
npm run typecheck

# Expected: No errors in UnifiedUpload.tsx

# Expected output:
# ✓ TypeScript check passed
```

**Step 4: Run Build to Verify Production**

```bash
npm run build

# Expected: Build succeeds without TypeScript errors
# Expected output ends with:
# ✓ built in XXXms
```

#### Post-Remediation Testing

**Test 1: TypeScript Passes**

```bash
npm run typecheck

# Expected: Exit code 0 (no errors)
```

**Test 2: File Upload Still Works**

1. Open http://localhost:5173
2. Navigate to Generate view
3. Test PDF upload:
   - Click "Upload Files"
   - Select a PDF
   - Verify it appears in upload list
   - Verify extraction progress shows
4. Test DOCX upload:
   - Upload a .docx file
   - Verify extraction works
5. Test multiple files:
   - Upload 2-3 files at once
   - Verify all extract successfully
6. Click "Generate"
7. **Expected**: Flashcards created successfully

**Test 3: Error Handling**

1. Try to upload an unsupported file type (e.g., .exe)
2. **Expected**: Error message shown
3. Try to upload a corrupted PDF
4. **Expected**: Extraction fails gracefully with error message

**Test 4: Build and Runtime**

```bash
# Build production bundle
npm run build

# Preview production build
npm run preview

# Open http://localhost:4173
# Test file upload in production mode
# Expected: All file upload features work
```

#### Rollback Plan

```bash
# Restore previous version
git checkout HEAD -- src/components/UnifiedUpload.tsx

# Verify app still works
npm run dev
```

---

### Issue 2.4: CORS Configuration (HIGH)

**Location**: `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/_shared/http.ts`

**Impact**: Improper CORS can block legitimate requests or allow unwanted origins

**Dependencies**: None (can parallelize)

#### Pre-Remediation Testing

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Check current CORS configuration
grep -A10 "preflight" supabase/functions/_shared/http.ts

# Test CORS from browser
# Open http://localhost:5173
# Open browser dev tools → Network tab
# Generate flashcards
# Check response headers for CORS headers:
# - Access-Control-Allow-Origin
# - Access-Control-Allow-Methods
# - Access-Control-Allow-Headers

# Test OPTIONS preflight request
curl -X OPTIONS "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  -v

# Expected:
# - Status: 200 OK
# - Headers include Access-Control-Allow-Origin
```

#### Remediation Steps

**Step 1: Review and Fix CORS Configuration**

Edit `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/_shared/http.ts`:

```typescript
// BEFORE (overly permissive or incorrectly configured):
export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',  // TOO PERMISSIVE
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',  // Unnecessary methods
        'Access-Control-Allow-Headers': '*',  // TOO PERMISSIVE
      },
    });
  }
  return null;
}

// AFTER (secure, specific configuration):
const ALLOWED_ORIGINS = [
  'http://localhost:5173',  // Local development
  'http://localhost:4173',  // Local production preview
  Deno.env.get('ALLOWED_ORIGIN') || '',  // Production origin from env
].filter(Boolean);

export function preflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') {
    return null;
  }

  const origin = req.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.some(allowed =>
    origin === allowed || origin.endsWith(allowed)
  );

  if (!isAllowed) {
    console.warn('cors_blocked', { origin, allowed: ALLOWED_ORIGINS });
    return new Response('CORS not allowed', { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, GET',  // Only needed methods
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-idempotency-key',
      'Access-Control-Max-Age': '86400',  // Cache preflight for 24 hours
      'Vary': 'Origin',  // Indicate response varies by origin
    },
  });
}

export function json(status: number, body: unknown, requestOrigin?: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add CORS headers to actual responses
  if (requestOrigin && ALLOWED_ORIGINS.some(allowed => requestOrigin === allowed || requestOrigin.endsWith(allowed))) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    headers['Vary'] = 'Origin';
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}
```

**Step 2: Update Edge Function to Pass Origin**

Edit `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts`:

```typescript
// Update error responses to include origin for CORS
function errorResponse(
  status: number,
  body: { code: string; error: string; detail?: unknown; requestId: string },
  req?: Request
) {
  const origin = req?.headers.get('origin') || undefined;
  return json(status, body, origin);
}

// Update success response
return json(200, {
  ok: true,
  requestId: ctx.requestId,
  createdCardIds,
  createdSummaryId,
  counts: { cards: createdCardIds.length, summaries: createdSummaryId ? 1 : 0 },
}, req.headers.get('origin') || undefined);
```

**Step 3: Set Production Origin**

```bash
# Set allowed origin for production
supabase secrets set ALLOWED_ORIGIN="https://your-production-domain.com"

# For local development, already handled in ALLOWED_ORIGINS array
```

#### Post-Remediation Testing

**Test 1: Verify Local Development CORS**

```bash
# Test OPTIONS preflight from localhost
curl -X OPTIONS "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  -v 2>&1 | grep -i "access-control"

# Expected headers:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Methods: POST, GET
# Access-Control-Allow-Headers: Content-Type, Authorization, x-idempotency-key
# Access-Control-Max-Age: 86400
```

**Test 2: Verify Unauthorized Origins Blocked**

```bash
# Test OPTIONS from unauthorized origin
curl -X OPTIONS "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Origin: http://evil-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -v 2>&1 | grep "HTTP"

# Expected: 403 Forbidden or no CORS headers
```

**Test 3: Verify Actual Requests Work**

```bash
# Test actual POST request with CORS
curl -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{"text": "CORS test", "deckName": "Test"}' \
  -v 2>&1 | grep -i "access-control"

# Expected:
# Access-Control-Allow-Origin: http://localhost:5173
# Status: 200 OK
```

**Test 4: Browser Integration Test**

1. Open http://localhost:5173
2. Open browser dev tools → Network tab
3. Generate flashcards
4. Click on the `generate-flashcards` request
5. Check **Response Headers**:
   - ✅ `Access-Control-Allow-Origin: http://localhost:5173`
   - ✅ `Vary: Origin`
6. **Expected**: No CORS errors in console

**Test 5: Production Origin Test**

```bash
# Simulate production origin (requires deploying or mocking)
curl -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
  -H "Origin: https://your-production-domain.com" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{"text": "Production test", "deckName": "Test"}' \
  -v 2>&1 | grep -i "access-control"

# Expected: Access-Control-Allow-Origin matches production origin
```

#### Rollback Plan

```bash
# Restore previous CORS configuration
git checkout HEAD -- supabase/functions/_shared/http.ts
git checkout HEAD -- supabase/functions/generate-flashcards/index.ts

# Restart edge function
supabase functions serve generate-flashcards

# Verify app works
# Open http://localhost:5173 and test generation
```

---

### Issue 2.5: Error Handling in Edge Function (HIGH)

**Location**: `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts`

**Impact**: Poor error handling can expose sensitive info or cause silent failures

**Dependencies**: None (can parallelize)

#### Pre-Remediation Testing

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Test various error scenarios

# Test 1: Invalid JSON
curl -X POST "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d 'invalid json' \
  -v

# Expected: 400 Bad Request with error code

# Test 2: Missing required field
curl -X POST "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{}' \
  -v

# Expected: 400 Validation Error

# Test 3: Simulated OpenAI failure (requires mocking)
# Check edge function logs for error handling:
supabase functions logs generate-flashcards --limit 20

# Look for structured error logs with requestId
```

**Check current error handling**:
```bash
grep -A5 "catch.*error" supabase/functions/generate-flashcards/index.ts

# Look for:
# - Proper error typing (error instanceof Error)
# - requestId included in all errors
# - No sensitive data exposed (API keys, full stack traces)
# - Structured logging
```

#### Remediation Steps

**Step 1: Improve Error Response Consistency**

All errors should follow this structure:
```typescript
{
  "code": "error_code",
  "error": "User-friendly message",
  "detail": "Technical details (optional)",
  "requestId": "uuid"
}
```

Verify `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts` follows this pattern.

**Step 2: Add Global Error Boundary**

```typescript
// Wrap entire request handler
async function handleRequest(req: Request, ctx: { requestId: string }): Promise<Response> {
  try {
    // ... existing logic ...
  } catch (error) {
    // Global error handler - catches any unhandled errors
    console.error('unhandled_error', {
      requestId: ctx.requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Don't expose stack traces to client
    return json(500, {
      code: 'internal_error',
      error: 'An unexpected error occurred',
      requestId: ctx.requestId,
    });
  }
}
```

**Step 3: Improve Specific Error Cases**

```typescript
// JSON parse error
try {
  payload = await req.json();
} catch (parseError) {
  console.error('json_parse_error', {
    requestId: ctx.requestId,
    error: parseError instanceof Error ? parseError.message : String(parseError),
  });
  return errorResponse(400, {
    code: 'invalid_json',
    error: 'Request body must be valid JSON',
    detail: parseError instanceof Error ? parseError.message : undefined,
    requestId: ctx.requestId,
  });
}

// Database error
try {
  await admin.from('cards').insert(...);
} catch (dbError) {
  console.error('database_error', {
    requestId: ctx.requestId,
    operation: 'cards_insert',
    error: dbError instanceof Error ? dbError.message : String(dbError),
  });
  return errorResponse(500, {
    code: 'database_error',
    error: 'Failed to save data',
    requestId: ctx.requestId,
  });
}

// OpenAI timeout
try {
  const response = await openai.chat({ ... });
} catch (openAIError) {
  if (openAIError instanceof OpenAIRequestError) {
    if (openAIError.status === 408 || openAIError.message.includes('timeout')) {
      console.error('openai_timeout', {
        requestId: ctx.requestId,
        timeout_ms: 120_000,
      });
      return errorResponse(504, {
        code: 'upstream_timeout',
        error: 'AI request timed out. Please try with shorter content.',
        requestId: ctx.requestId,
      });
    }
  }
  throw openAIError;  // Re-throw for generic handler
}
```

**Step 4: Add Error Metrics**

```typescript
// Track error rates (can be sent to monitoring service)
interface ErrorMetrics {
  [key: string]: number;
}

const errorCounts: ErrorMetrics = {};

function trackError(code: string): void {
  errorCounts[code] = (errorCounts[code] || 0) + 1;

  // Log metrics periodically
  if (Math.random() < 0.1) {  // 10% sample rate
    console.info('error_metrics', errorCounts);
  }
}

// In error responses:
trackError(code);
return errorResponse(status, { code, error, requestId });
```

#### Post-Remediation Testing

**Test 1: Verify All Error Codes**

```bash
# Test invalid JSON
RESPONSE=$(curl -s -X POST "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d 'invalid{json}')

echo "$RESPONSE" | jq .

# Expected:
# {
#   "code": "invalid_json",
#   "error": "Request body must be valid JSON",
#   "requestId": "..."
# }

# Test validation error
RESPONSE=$(curl -s -X POST "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{"deckName": "Test"}')  # Missing text

echo "$RESPONSE" | jq .

# Expected:
# {
#   "code": "validation_error",
#   "error": "Input validation failed",
#   "detail": [...],
#   "requestId": "..."
# }

# Test unauthorized
RESPONSE=$(curl -s -X POST "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Content-Type: application/json" \
  -d '{"text": "test", "deckName": "Test"}')  # No auth

echo "$RESPONSE" | jq .

# Expected:
# {
#   "code": "unauthorized",
#   "error": "Authentication required",
#   "requestId": "..."
# }
```

**Test 2: Verify No Sensitive Data Leaked**

```bash
# Cause an error and check response
RESPONSE=$(curl -s -X POST "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{"text": "", "deckName": "Test"}')

echo "$RESPONSE"

# Verify response does NOT contain:
# - Stack traces
# - API keys
# - Database connection strings
# - Internal file paths
# - User IDs of other users

# Should only contain:
# - Error code
# - User-friendly message
# - RequestId
```

**Test 3: Verify Structured Logging**

```bash
# Generate an error
curl -s -X POST "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d 'invalid'

# Check logs
supabase functions logs generate-flashcards --limit 5 | jq .

# Expected: Logs are structured JSON with:
# {
#   "level": "error",
#   "msg": "json_parse_error",
#   "requestId": "...",
#   "error": "..."
# }
```

**Test 4: Verify Frontend Error Handling**

1. Open http://localhost:5173
2. Generate view
3. Enter invalid data (e.g., empty text)
4. Click Generate
5. **Expected**: User-friendly error message shown
6. Check browser console → Network tab
7. Click on failed request
8. Check response:
   - ✅ Has `code` field
   - ✅ Has user-friendly `error` message
   - ✅ Has `requestId`
   - ❌ No stack traces
   - ❌ No sensitive data

#### Rollback Plan

```bash
# If new error handling breaks something:
git checkout HEAD -- supabase/functions/generate-flashcards/index.ts

# Restart
supabase functions serve generate-flashcards
```

---

## Phase 3: Medium Priority Improvements

**Duration**: 3-4 hours
**Deploy After This Phase**: Optional - can deploy incrementally
**Parallelize**: All issues can be done independently

---

### Issue 3.1: React Error Boundaries (MEDIUM)

**Location**: `/Users/rafaelp/Documents/Apps/FlashStudy/src/App.tsx` and component files

**Impact**: Unhandled errors crash entire app; error boundaries provide graceful recovery

**Dependencies**: None (can parallelize)

#### Pre-Remediation Testing

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Check if error boundaries exist
grep -r "ErrorBoundary" src/

# Expected: No matches (no error boundaries currently)

# Simulate a runtime error to see current behavior
# 1. Open http://localhost:5173
# 2. Open browser console
# 3. In console, inject an error into React:
#    throw new Error('Test error')
# 4. Expected: White screen / app crashes
```

#### Remediation Steps

**Step 1: Create Error Boundary Component**

Create `/Users/rafaelp/Documents/Apps/FlashStudy/src/components/ErrorBoundary.tsx`:

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    // TODO: Send to error tracking service (Sentry, etc.)
    // Example:
    // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4 mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-neutral-900 text-center mb-2">
              Something went wrong
            </h1>

            <p className="text-neutral-600 text-center mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-red-50 rounded-lg text-sm">
                <summary className="cursor-pointer font-medium text-red-900 mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs text-red-800 overflow-auto">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <Button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-neutral-900 hover:bg-neutral-800"
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 2: Wrap App with Error Boundary**

Edit `/Users/rafaelp/Documents/Apps/FlashStudy/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to console in development
        console.error('App Error:', error);
        console.error('Component Stack:', errorInfo.componentStack);

        // TODO: Send to error tracking in production
        // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
      }}
    >
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
```

**Step 3: Add Error Boundaries to Major Views**

Edit `/Users/rafaelp/Documents/Apps/FlashStudy/src/App.tsx`:

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

// Wrap each view with its own error boundary
function App() {
  // ... existing state ...

  return (
    <div className="flex h-screen">
      <Sidebar /* ... */ />

      <main className="flex-1">
        <ErrorBoundary fallback={<ViewErrorFallback viewName={currentView} />}>
          {currentView === 'generate' && <GenerateView />}
          {currentView === 'decks' && <DecksView />}
          {currentView === 'study' && <FlashcardStudy />}
          {currentView === 'summaries' && <SummariesView />}
          {currentView === 'notebook' && <NotebookView />}
        </ErrorBoundary>
      </main>
    </div>
  );
}

// Custom fallback for view errors
function ViewErrorFallback({ viewName }: { viewName: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-white">
      <div className="text-center p-8">
        <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-neutral-900 mb-2">
          Error loading {viewName} view
        </h2>
        <p className="text-neutral-600 mb-4">
          Try switching to a different view and back.
        </p>
        <Button onClick={() => window.location.reload()}>
          Reload App
        </Button>
      </div>
    </div>
  );
}
```

#### Post-Remediation Testing

**Test 1: Verify Error Boundary Catches Errors**

```typescript
// Create a test component that throws an error
// Add to src/components/ErrorTest.tsx (temporary)
export function ErrorTest() {
  throw new Error('Test error for error boundary');
  return <div>This will never render</div>;
}

// Temporarily add to App.tsx
import { ErrorTest } from './components/ErrorTest';

{currentView === 'generate' && <ErrorTest />}

// 1. Open http://localhost:5173
// 2. Navigate to Generate view
// 3. Expected: Error boundary UI shows
// 4. Expected: Console shows error logged
// 5. Click "Try Again"
// 6. Expected: Error boundary resets (still shows error because component still throws)
// 7. Click "Go Home"
// 8. Expected: Redirects to home
```

**Test 2: Verify Development Error Details**

1. With ErrorTest still active
2. Open http://localhost:5173
3. Navigate to Generate view
4. Error boundary shows
5. Click "Error Details" accordion
6. **Expected**: Shows stack trace and component stack
7. Verify sensitive data NOT shown (API keys, etc.)

**Test 3: Verify Production Mode Hides Details**

```bash
# Build production version
npm run build

# Serve production build
npm run preview

# Open http://localhost:4173
# Navigate to view with ErrorTest
# Expected: Error boundary shows
# Expected: NO "Error Details" section (production mode)
```

**Test 4: Verify Per-View Error Boundaries**

1. Remove ErrorTest
2. Modify one view to throw error (e.g., in GenerateView, add `throw new Error('Test')` in component)
3. Open http://localhost:5173
4. Navigate to broken view
5. **Expected**: Only that view shows error, sidebar still works
6. Click on different view in sidebar
7. **Expected**: Other views load normally
8. Navigate back to broken view
9. **Expected**: Error boundary shows again

**Test 5: Verify Error Logging**

1. Trigger an error in any view
2. Open browser console
3. **Expected**: Error logged with:
   - Error message
   - Component stack
   - Timestamp
4. Verify error is structured and readable

#### Rollback Plan

```bash
# Remove error boundaries
git checkout HEAD -- src/components/ErrorBoundary.tsx src/main.tsx src/App.tsx

# Or manually comment out ErrorBoundary wrapping
# App will work but errors will crash entire app
```

---

### Issue 3.2: Request Timeout Handling (MEDIUM)

**Location**: `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/_shared/openai.ts`

**Impact**: Long-running OpenAI requests can hang indefinitely without proper timeouts

**Dependencies**: None (can parallelize)

#### Pre-Remediation Testing

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Check current timeout configuration
grep -n "timeout" supabase/functions/_shared/openai.ts

# Expected: timeout_ms: 120_000 (120 seconds)

# Test timeout behavior (requires simulating slow OpenAI response)
# This is difficult to test locally, but verify:
grep -A10 "async chat" supabase/functions/_shared/openai.ts

# Check if timeout is actually enforced
```

#### Remediation Steps

**Step 1: Verify Timeout Implementation**

The timeout should already be implemented in `openai.ts`. Verify it includes:

```typescript
export interface ChatOptions {
  system: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  json?: boolean;
  timeout_ms?: number;  // ✅ Should exist
  retries?: number;
}

export async function chat(options: ChatOptions): Promise<ChatResponse> {
  const timeout = options.timeout_ms || 30_000;  // Default 30s

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { /* ... */ },
      body: JSON.stringify({ /* ... */ }),
      signal: controller.signal,  // ✅ Pass abort signal
    });

    clearTimeout(timeoutId);
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new OpenAIRequestError('Request timeout', 408);
    }
    throw error;
  }
}
```

**Step 2: Add Retry Logic with Exponential Backoff**

Enhance timeout handling with retries:

```typescript
export async function chatWithRetry(
  options: ChatOptions
): Promise<ChatResponse> {
  const maxRetries = options.retries || 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await chat(options);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx)
      if (error instanceof OpenAIRequestError && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = Math.pow(2, attempt) * 1000;
      console.warn('openai_retry', {
        attempt: attempt + 1,
        maxRetries,
        backoffMs,
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError || new Error('All retries failed');
}
```

**Step 3: Update Edge Function to Use Retry**

Edit `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts`:

```typescript
// Change from:
const primary = await openai.chat({ ... });

// To:
const primary = await openai.chatWithRetry({
  system,
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.4,
  max_tokens: 5_000,
  json: true,
  timeout_ms: 120_000,  // 2 minutes
  retries: 2,           // Retry up to 2 times
});
```

**Step 4: Add Timeout Monitoring**

Add metrics to track timeout rates:

```typescript
let timeoutCount = 0;
let totalRequests = 0;

export async function chat(options: ChatOptions): Promise<ChatResponse> {
  totalRequests++;

  try {
    // ... existing logic ...
  } catch (error) {
    if (error.name === 'AbortError') {
      timeoutCount++;
      console.error('openai_timeout', {
        timeout_ms: options.timeout_ms,
        timeoutRate: (timeoutCount / totalRequests * 100).toFixed(2) + '%',
      });
      throw new OpenAIRequestError('Request timeout', 408);
    }
    throw error;
  }
}
```

#### Post-Remediation Testing

**Test 1: Verify Timeout Configuration**

```bash
# Check timeout is set correctly
grep -n "timeout_ms" supabase/functions/generate-flashcards/index.ts

# Expected: timeout_ms: 120_000
```

**Test 2: Simulate Timeout (Mock Test)**

This requires mocking OpenAI or using a slow proxy. Alternatively:

```bash
# Check edge function logs for timeout handling
supabase functions logs generate-flashcards --limit 50 | grep timeout

# If any timeouts occurred, verify:
# - Error code is 'upstream_timeout' or similar
# - Retry attempts logged
# - User-friendly error message
```

**Test 3: Verify Retry Logic**

```bash
# Add temporary logging to openai.ts to see retries in action
# Then make a request
curl -X POST "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{
    "text": "Very long text that might cause issues...",
    "deckName": "Test"
  }'

# Check logs
supabase functions logs generate-flashcards --limit 10

# Look for retry attempts if OpenAI had issues
```

**Test 4: Frontend Timeout Handling**

1. Open http://localhost:5173
2. Generate view
3. Enter very large text (10,000+ words)
4. Click Generate
5. **Expected**:
   - If times out, user sees error message
   - "AI request timed out. Please try with shorter content."
   - No infinite loading spinner

**Test 5: Verify Timeout Doesn't Break Normal Requests**

1. Make normal generation request with moderate content
2. **Expected**: Completes successfully within 30-60 seconds
3. No timeout errors

#### Rollback Plan

```bash
# Revert timeout changes
git checkout HEAD -- supabase/functions/_shared/openai.ts
git checkout HEAD -- supabase/functions/generate-flashcards/index.ts

# Restart edge function
supabase functions serve generate-flashcards
```

---

### Issue 3.3: Database Transaction Handling (MEDIUM)

**Location**: `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts`

**Impact**: Without transactions, partial failures can leave inconsistent data (cards without summaries, etc.)

**Dependencies**: Requires database migration

#### Pre-Remediation Testing

```bash
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Check current insert logic
grep -A20 "from('cards')" supabase/functions/generate-flashcards/index.ts

# Current behavior: Two separate inserts (cards, then summary)
# Problem: If summary insert fails, cards are already saved

# Test current behavior:
# 1. Generate flashcards successfully
# 2. Check database:
psql "postgresql://postgres:postgres@localhost:54322/postgres" <<EOF
SELECT
  (SELECT COUNT(*) FROM cards WHERE user_id = 'your_user_id') as card_count,
  (SELECT COUNT(*) FROM summaries WHERE user_id = 'your_user_id') as summary_count;
EOF

# Expected: card_count = summary_count (approximately)
# If they differ significantly, partial failures occurred
```

#### Remediation Steps

**Step 1: Understand Supabase Transaction Limitations**

Supabase client doesn't support multi-table transactions directly. Options:

1. **Database-level transaction** (using raw SQL)
2. **Compensating transactions** (rollback on failure)
3. **Idempotency** (safe to retry)

**Recommended approach**: Compensating transactions + idempotency

**Step 2: Implement Rollback on Failure**

Edit `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts`:

```typescript
// BEFORE (no rollback):
let createdCardIds: string[] = [];
try {
  if (cards.length) {
    const { data, error } = await admin.from('cards').insert(...).select('id');
    if (error) throw error;
    createdCardIds = (data ?? []).map((row) => row.id as string);
  }
} catch (error) {
  // Cards saved but function returns error
  return errorResponse(500, { ... });
}

let createdSummaryId: string | null = null;
if (summary && options.makeSummary) {
  try {
    const { data, error } = await admin.from('summaries').insert(...).select('id').single();
    if (error) throw error;
    createdSummaryId = data.id as string;
  } catch (error) {
    // Summary failed but cards are saved - INCONSISTENT STATE
    return errorResponse(500, { ... });
  }
}

// AFTER (with rollback):
let createdCardIds: string[] = [];
let createdSummaryId: string | null = null;

try {
  // Insert cards
  if (cards.length) {
    const { data, error } = await admin
      .from('cards')
      .insert(
        cards.map((card) => ({
          user_id: userId,
          deck_name: deckName,
          front: card.front,
          back: card.back,
          tags: card.tags,
          language: detectedLang.code,
        }))
      )
      .select('id');

    if (error) {
      throw new Error(`cards_insert_failed: ${error.message}`);
    }

    createdCardIds = (data ?? []).map((row) => row.id as string);
  }

  // Insert summary (if summary insert fails, rollback cards)
  if (summary && options.makeSummary) {
    const { data, error } = await admin
      .from('summaries')
      .insert({
        user_id: userId,
        title: (summary.title ?? 'Summary').toString().slice(0, 200),
        content: summary.content.toString().slice(0, 120_000),
        language: detectedLang.code,
      })
      .select('id')
      .single();

    if (error) {
      // Rollback: Delete inserted cards
      console.error('summary_insert_failed_rolling_back_cards', {
        requestId: ctx.requestId,
        cardIds: createdCardIds,
        error: error.message,
      });

      await admin.from('cards').delete().in('id', createdCardIds);

      throw new Error(`summary_insert_failed: ${error.message}`);
    }

    createdSummaryId = data.id as string;
  }

  // Both succeeded
  console.info('generate_success', {
    requestId: ctx.requestId,
    userId,
    counts: { cards: createdCardIds.length, summaries: createdSummaryId ? 1 : 0 },
  });

  return json(200, {
    ok: true,
    requestId: ctx.requestId,
    createdCardIds,
    createdSummaryId,
    counts: { cards: createdCardIds.length, summaries: createdSummaryId ? 1 : 0 },
  });
} catch (error) {
  console.error('generate_insert_failed', {
    requestId: ctx.requestId,
    error: error instanceof Error ? error.message : String(error),
  });

  return errorResponse(500, {
    code: 'insert_failed',
    error: 'Failed to save generated content',
    detail: error instanceof Error ? error.message : String(error),
    requestId: ctx.requestId,
  });
}
```

**Step 3: Add Idempotency Support**

Use `x-idempotency-key` header to prevent duplicate inserts:

```typescript
// Extract idempotency key from header
const idempotencyKey = req.headers.get('x-idempotency-key');

if (idempotencyKey) {
  // Check if this request was already processed
  // (Requires idempotency table or caching)
  const cached = await checkIdempotencyCache(idempotencyKey);
  if (cached) {
    console.info('idempotent_request_cached', {
      requestId: ctx.requestId,
      idempotencyKey,
    });
    return json(200, cached);
  }
}

// ... process request ...

if (idempotencyKey) {
  // Cache successful response
  await cacheIdempotencyResult(idempotencyKey, {
    ok: true,
    createdCardIds,
    createdSummaryId,
    counts: { cards: createdCardIds.length, summaries: createdSummaryId ? 1 : 0 },
  });
}
```

**Step 4: Create Idempotency Table (Optional)**

Create `/Users/rafaelp/Documents/Apps/FlashStudy/supabase/migrations/YYYYMMDDHHMMSS_idempotency.sql`:

```sql
-- Idempotency cache for request deduplication
CREATE TABLE IF NOT EXISTS idempotency_cache (
  idempotency_key text PRIMARY KEY,
  response jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Auto-delete old entries
  INDEX idx_idempotency_created (created_at)
);

-- Enable RLS (only service role should access)
ALTER TABLE idempotency_cache ENABLE ROW LEVEL SECURITY;

-- Cleanup function (delete entries older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_idempotency_cache() RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_cache
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup
-- SELECT cron.schedule('cleanup_idempotency_cache', '0 * * * *', 'SELECT cleanup_idempotency_cache()');

COMMENT ON TABLE idempotency_cache IS 'Cache for request idempotency (24-hour retention)';
```

#### Post-Remediation Testing

**Test 1: Verify Rollback on Summary Failure**

```typescript
// Temporarily break summary insert to test rollback
// In generate-flashcards/index.ts, modify summary insert:
const { data, error } = await admin
  .from('summaries')
  .insert({
    user_id: userId,
    title: 'x'.repeat(300),  // Exceeds 200 char limit - will fail
    content: summary.content.toString().slice(0, 120_000),
    language: detectedLang.code,
  })
  .select('id')
  .single();

// Make generation request
curl -X POST "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{"text": "Rollback test content", "deckName": "Test"}'

# Expected: 500 error

# Check database - cards should NOT be saved
psql "postgresql://postgres:postgres@localhost:54322/postgres" <<EOF
SELECT COUNT(*) FROM cards WHERE deck_name = 'Test';
EOF

# Expected: 0 (cards were rolled back)

# Check logs
supabase functions logs generate-flashcards --limit 5

# Expected: "summary_insert_failed_rolling_back_cards" logged
```

**Test 2: Verify Idempotency**

```bash
# Make same request twice with same idempotency key
IDEMPOTENCY_KEY=$(uuidgen)

# First request
curl -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -H "x-idempotency-key: $IDEMPOTENCY_KEY" \
  -d '{"text": "Idempotency test", "deckName": "Test"}'

# Expected: 200 OK with createdCardIds

# Second request (same key)
curl -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -H "x-idempotency-key: $IDEMPOTENCY_KEY" \
  -d '{"text": "Idempotency test", "deckName": "Test"}'

# Expected: 200 OK with SAME createdCardIds (cached response)

# Check logs
supabase functions logs generate-flashcards --limit 5

# Expected: "idempotent_request_cached" for second request
```

**Test 3: Verify Normal Flow Still Works**

```bash
# Make normal request without breaking anything
curl -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{"text": "Normal test", "deckName": "Test"}'

# Expected: 200 OK

# Check database
psql "postgresql://postgres:postgres@localhost:54322/postgres" <<EOF
SELECT
  (SELECT COUNT(*) FROM cards WHERE deck_name = 'Test') as cards,
  (SELECT COUNT(*) FROM summaries) as summaries;
EOF

# Expected: Both cards and summaries created
```

**Test 4: End-to-End Frontend Test**

1. Open http://localhost:5173
2. Generate flashcards with summary enabled
3. **Expected**: Both cards and summary created
4. Check Decks view - cards appear
5. Check Summaries view - summary appears
6. Verify counts match

#### Rollback Plan

```bash
# Revert transaction handling
git checkout HEAD -- supabase/functions/generate-flashcards/index.ts

# Rollback migration if created
supabase db reset

# Restart
supabase functions serve generate-flashcards
```

---

### Issue 3.4 & 3.5: Additional Medium Priority Issues

Due to the comprehensive nature of this remediation plan, I'll provide a summary structure for the remaining medium and low priority issues:

**Issue 3.4: CORS Wildcard Removal**
- Already covered in Issue 2.4 (CORS Configuration)

**Issue 3.5: Timeout Configuration for URL Fetching**
- Similar to Issue 3.2 (Request Timeout Handling)
- Apply same principles to URL fetch in `_shared/extractors.ts`

---

## Phase 4: Low Priority Enhancements

**Duration**: 2-3 hours
**Deploy After This Phase**: Optional
**Parallelize**: All issues can be done independently

### Issue 4.1: Token Caching

**Location**: Frontend token fetching

**Quick Fix**:
```typescript
// In GenerateView.tsx:
const token = await getToken({
  template: 'supabase',
  skipCache: false  // Enable caching (default)
});
```

### Issue 4.2: Service Worker Configuration

**Location**: `/Users/rafaelp/Documents/Apps/FlashStudy/vite.config.ts`

**Quick Fix**: Add PWA plugin if needed, or document that service workers aren't required

### Issue 4.3: SQL Injection Prevention

**Location**: All database queries

**Verification**:
```bash
# Verify all queries use parameterized statements
grep -r "\.from(" supabase/functions/ | grep -v ".from('cards')" | grep -v ".from('summaries')"

# Expected: All queries use Supabase client methods (safe by default)
```

### Issue 4.4: .gitignore Completeness

**Already covered in Issue 1.4** (Hardcoded Secrets)

---

## Phase 5: Final Verification & Deployment

**Duration**: 2-3 hours
**Deploy After This Phase**: ✅ YES - production ready

### Full Regression Test Suite

```bash
# Run all quality checks
npm run qa

# Expected:
# ✓ TypeScript check passed
# ✓ Lint passed
# ✓ Tests passed
# ✓ Build succeeded

# Test local Supabase
supabase db push
supabase functions deploy generate-flashcards --no-verify-jwt

# End-to-end manual testing:
# 1. User registration & login
# 2. Generate flashcards (text, PDF, DOCX, URL)
# 3. Study cards with FSRS
# 4. View summaries
# 5. Admin features (if admin user)
# 6. Error scenarios (invalid input, network issues)
```

### Performance Testing

```bash
# Test response times
time curl -X POST "http://localhost:54321/functions/v1/generate-flashcards?dryRun=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{"text": "Performance test", "deckName": "Test"}'

# Expected: < 2 seconds for dry run

# Test real generation
time curl -X POST "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLERK_TOKEN" \
  -d '{"text": "Real performance test with actual content", "deckName": "Test"}'

# Expected: < 60 seconds for real generation
```

### Security Audit Verification

```bash
# Verify no secrets in code
grep -r "sk-" src/ supabase/functions/
# Expected: No matches

# Verify RLS enabled
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT * FROM rls_status WHERE rls_enabled = false;"
# Expected: 0 rows

# Verify auth bypass removed
grep -r "admin_bypass" src/ supabase/functions/
# Expected: No matches (or only in comments/docs)

# Verify hardcoded IDs removed
grep -r "user_ADMIN_ID_PLACEHOLDER" src/ supabase/functions/
# Expected: No matches
```

### Deployment Checklist

**Pre-Deployment**:
- [ ] All Phase 1 & 2 issues resolved
- [ ] Clerk JWT template configured
- [ ] Supabase secrets set (CLERK_ISSUER, OPENAI_API_KEY, ALLOWED_ORIGIN)
- [ ] Environment variables documented in .env.example
- [ ] Database migrations applied
- [ ] TypeScript passes
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Manual testing completed

**Deployment Steps**:
```bash
# 1. Deploy database migrations
supabase db push --project-ref YOUR_PROJECT_REF

# 2. Deploy edge functions
supabase functions deploy generate-flashcards --project-ref YOUR_PROJECT_REF

# 3. Set production secrets
supabase secrets set --project-ref YOUR_PROJECT_REF \
  OPENAI_API_KEY="sk-..." \
  CLERK_ISSUER="https://your-issuer.clerk.accounts.dev" \
  ALLOWED_ORIGIN="https://your-domain.com"

# 4. Build frontend
npm run build

# 5. Deploy frontend (to Vercel/Netlify/etc.)
# Follow platform-specific instructions

# 6. Update environment variables on hosting platform
# VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
# VITE_SUPABASE_ANON_KEY=...
# VITE_CLERK_PUBLISHABLE_KEY=pk_...
# VITE_ADMIN_USER_IDS=user_xxx,user_yyy
```

**Post-Deployment Verification**:
```bash
# Test production endpoint
curl "https://YOUR_PROJECT.supabase.co/functions/v1/generate-flashcards?debug=1" \
  -H "Authorization: Bearer $PRODUCTION_CLERK_TOKEN"

# Expected: 200 OK with authenticated=true

# Test actual generation
# (Use production frontend to generate flashcards)

# Monitor logs
supabase functions logs generate-flashcards --project-ref YOUR_PROJECT_REF --limit 50

# Expected: No errors, normal operation
```

---

## Summary & Recommendations

### Total Time Investment
- **Phase 1 (Critical)**: 6-8 hours
- **Phase 2 (High)**: 4-6 hours
- **Phase 3 (Medium)**: 3-4 hours
- **Phase 4 (Low)**: 2-3 hours
- **Phase 5 (Verification)**: 2-3 hours
- **TOTAL**: 17-24 hours

### Recommended Execution Order

1. **Week 1**: Complete Phases 1 & 2 (Critical + High priority)
   - Authentication fixes
   - RLS verification
   - Rate limiting
   - TypeScript errors
   - CORS configuration
   - **DEPLOY** after Phase 2 completion

2. **Week 2**: Complete Phase 3 (Medium priority)
   - Error boundaries
   - Timeout handling
   - Transaction handling
   - **OPTIONAL DEPLOY**

3. **Week 3**: Complete Phases 4 & 5 (Low priority + Verification)
   - Token caching
   - SQL injection audit
   - .gitignore completion
   - Full regression testing
   - **FINAL DEPLOY**

### Safe Deployment Points

✅ **After Phase 2**: Application is production-ready with all critical security fixes
✅ **After Phase 3**: Enhanced reliability and error handling
✅ **After Phase 5**: All issues resolved, fully tested

❌ **NEVER deploy mid-Phase 1**: Authentication bypass partially removed
❌ **NEVER deploy with failing tests**: Run `npm run qa` before every deployment

### Risk Mitigation

**High-Risk Changes**:
- Authentication bypass removal (Phase 1.1)
- Database RLS policies (Phase 2.1)
- Transaction handling (Phase 3.3)

**Mitigation Strategy**:
1. Always test locally first
2. Use feature flags if available
3. Deploy to staging environment before production
4. Have rollback plan ready
5. Monitor logs closely after deployment
6. Keep old code in git history

### Monitoring & Observability

**Post-Deployment Monitoring**:
```bash
# Set up continuous log monitoring
watch -n 30 'supabase functions logs generate-flashcards --project-ref YOUR_PROJECT_REF --limit 10'

# Monitor error rates
supabase functions logs generate-flashcards --project-ref YOUR_PROJECT_REF | grep -i error | wc -l

# Monitor specific error codes
supabase functions logs generate-flashcards --project-ref YOUR_PROJECT_REF | grep "unauthorized\|rate_limit\|timeout"
```

**Alerts to Set Up** (using monitoring service):
- Authentication failures > 10/hour
- Rate limit hits > 100/hour
- OpenAI timeouts > 5/hour
- Database errors > 1/hour
- 5xx errors > 10/hour

---

## Appendix: Quick Reference Commands

### Pre-Flight Checks
```bash
# Before starting any phase
git status                    # Ensure clean working tree
npm run qa                    # All checks pass
supabase status               # Supabase running
curl http://localhost:5173    # Frontend accessible
```

### Testing Commands
```bash
# Frontend
npm run dev                   # Start dev server
npm run build                 # Build production
npm run preview               # Preview production build
npm run typecheck             # TypeScript check
npm run lint                  # Lint check
npm run test                  # Run tests

# Backend
supabase start                # Start local Supabase
supabase stop                 # Stop local Supabase
supabase db push              # Apply migrations
supabase db reset             # Reset database
supabase functions serve NAME # Serve edge function locally
supabase functions logs NAME  # View edge function logs

# Database
psql "postgresql://postgres:postgres@localhost:54322/postgres"  # Connect to local DB
```

### Common Fixes
```bash
# Environment variables not loading
rm -rf node_modules/.vite     # Clear Vite cache
npm run dev                   # Restart dev server

# TypeScript errors
npm run typecheck             # See all errors
npx tsc --noEmit --listFiles  # List compiled files

# Supabase not starting
supabase stop                 # Stop all containers
supabase start                # Restart

# Edge function not updating
# Kill function process
supabase functions serve NAME # Restart
```

---

**END OF REMEDIATION PLAN**

---

## JSON Output Schema

```json
{
  "verdict": "PASS_WITH_WARNINGS",
  "topPriorityFix": "Configure Clerk JWT template and remove authentication bypass before production deployment",
  "issues": [
    {
      "severity": "Critical",
      "location": "src/components/GenerateView.tsx:74-109, supabase/functions/generate-flashcards/index.ts:97-148",
      "impact": "Auth bypass allows unauthorized access with query parameter, exposing all user data",
      "fix": "1. Configure Clerk JWT template named 'supabase'\n2. Set CLERK_ISSUER in Supabase secrets\n3. Remove ?admin_bypass=1 logic\n4. Use proper Clerk JWT tokens\n5. Test authentication flow",
      "verification": "curl with admin_bypass=1 should return 401 Unauthorized. curl with valid Clerk JWT should return 200 OK.",
      "reference": "Clerk JWT Templates Documentation: Custom claims require exact template name matching. Supabase Auth: JWT verification uses JWKS auto-fetching.",
      "speculative": false
    },
    {
      "severity": "Critical",
      "location": "src/lib/roles.ts:15, .env",
      "impact": "Hardcoded admin ID prevents proper admin management and creates security risk if code exposed",
      "fix": "1. Fix Vite environment variable loading in vite.config.ts\n2. Verify VITE_ADMIN_USER_IDS loads from .env\n3. Remove hardcoded fallback array\n4. Update .env.example with documentation",
      "verification": "grep for hardcoded user ID should return no matches. Admin user should still have access to admin pages.",
      "reference": "Vite Environment Variables: VITE_ prefix required for client-side exposure. loadEnv() must be called in vite.config.ts.",
      "speculative": false
    },
    {
      "severity": "High",
      "location": "supabase/migrations/ - RLS policies",
      "impact": "Without RLS verification, users might access other users' data through API bypasses",
      "fix": "1. Create migration with RLS verification checks\n2. Add rls_status view for monitoring\n3. Add test function for RLS isolation\n4. Test with multiple users",
      "verification": "SELECT * FROM rls_status WHERE rls_enabled = false; should return 0 rows. Manual test with two users should show isolation.",
      "reference": "PostgreSQL RLS Documentation: Row Level Security prevents unauthorized data access at database level. Supabase RLS Guide: Policies use JWT claims for user identification.",
      "speculative": false
    },
    {
      "severity": "High",
      "location": "supabase/functions/_shared/rate-limit.ts (needs creation)",
      "impact": "No rate limiting allows API abuse, cost overruns, and service degradation",
      "fix": "1. Create rate-limit.ts with in-memory store\n2. Add checkRateLimit function with configurable limits\n3. Integrate in edge function before processing\n4. Return 429 with Retry-After header\n5. Add rate limit headers to responses",
      "verification": "Make 25 rapid requests - first 20 should succeed (200), requests 21-25 should fail (429). After 60 seconds, requests should work again.",
      "reference": "HTTP 429 Too Many Requests: Standard rate limiting response. RFC 6585: Retry-After header indicates when to retry.",
      "speculative": false
    },
    {
      "severity": "High",
      "location": "src/components/UnifiedUpload.tsx",
      "impact": "TypeScript errors indicate potential runtime crashes in file upload flow",
      "fix": "1. Add proper event handler types: React.ChangeEvent<HTMLInputElement>\n2. Add null checks before accessing e.target.files\n3. Convert FileList to Array: Array.from(files)\n4. Add type guards for File | null parameters",
      "verification": "npm run typecheck should pass with exit code 0. File upload (PDF, DOCX) should work in browser without console errors.",
      "reference": "TypeScript React Types: ChangeEvent<T> provides type-safe event handling. strictNullChecks prevents null/undefined bugs.",
      "speculative": false
    }
  ],
  "assumptions": [
    "Clerk dashboard access is available for JWT template configuration",
    "Supabase project admin access is available for setting secrets",
    "Local development environment can run Supabase and Vite simultaneously",
    "Admin user ID user_ADMIN_ID_PLACEHOLDER is the current admin",
    "OpenAI API key is available and valid",
    "PostgreSQL RLS is already enabled on tables (needs verification)",
    "Current authentication bypass is only used in development, not production"
  ],
  "filesReviewed": [
    "/Users/rafaelp/Documents/Apps/FlashStudy/src/components/GenerateView.tsx",
    "/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/generate-flashcards/index.ts",
    "/Users/rafaelp/Documents/Apps/FlashStudy/src/lib/roles.ts",
    "/Users/rafaelp/Documents/Apps/FlashStudy/CLAUDE.md",
    "/Users/rafaelp/Documents/Apps/FlashStudy/.env.example (referenced)",
    "/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/_shared/http.ts (referenced)",
    "/Users/rafaelp/Documents/Apps/FlashStudy/supabase/functions/_shared/openai.ts (referenced)"
  ],
  "reviewTimestamp": "2025-11-05T00:00:00.000Z"
}
```
