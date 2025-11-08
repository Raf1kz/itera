# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Itera (FlashStudy)** is an AI-powered flashcard generation app with spaced repetition learning. It generates flashcards and rich markdown summaries from study notes, PDFs, DOCX files, and URLs using OpenAI GPT-4o-mini.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions in Deno runtime)
- **Authentication**: Clerk (JWT-based)
- **AI**: OpenAI GPT-4o-mini with language detection (franc-min)
- **Spaced Repetition**: FSRS algorithm

---

## Development Commands

### Local Development
```bash
npm run dev              # Start Vite dev server (port 5173)
npm run build            # Production build
npm run preview          # Preview production build
```

### Code Quality
```bash
npm run typecheck        # TypeScript type checking
npm run lint             # Biome linting
npm run lint:fix         # Auto-fix linting issues
npm run format           # Check formatting
npm run format:fix       # Auto-fix formatting
npm run test             # Run Vitest tests
npm run test:watch       # Watch mode for tests
npm run qa               # Full quality gate (typecheck + lint + test + build)
```

### Supabase Commands
```bash
# Local Supabase setup
supabase start           # Start local Supabase (PostgreSQL, Auth, Edge Functions)
supabase db push         # Apply migrations to local DB
supabase db reset        # Reset local DB (re-runs all migrations)

# Edge function development
supabase functions serve generate-flashcards    # Serve function locally
supabase functions logs generate-flashcards     # View logs
supabase functions deploy generate-flashcards   # Deploy to production

# Secrets management
supabase secrets set OPENAI_API_KEY=sk-...     # Set edge function secrets
supabase secrets list                           # List all secrets
```

### Testing Edge Functions
```bash
# Debug endpoint (GET)
curl "http://localhost:54321/functions/v1/generate-flashcards?debug=1" \
  -H "Authorization: Bearer ANON_KEY"

# Generate flashcards (POST)
curl -X POST http://localhost:54321/functions/v1/generate-flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ANON_KEY" \
  -d '{"text": "Photosynthesis converts light to chemical energy."}'
```

---

## Architecture

### Frontend Structure

**View-based architecture** with a single `App.tsx` managing view state:
- **Views**: `GenerateView`, `DecksView`, `FlashcardStudy`, `SummariesView`, `NotebookView`, `StudyView`
- **Navigation**: Sidebar-based with admin-only sections (Notebook, Dashboard)
- **State Management**: React hooks + TanStack Query for server state

**Key directories**:
- `src/components/` - All React components (35+ files)
- `src/lib/` - Utilities (fileExtractors, roles, etc.)
- `src/utils/` - API clients and helpers
- `src/fsrs.ts` - FSRS spaced repetition algorithm implementation

### Backend Architecture (Supabase Edge Functions)

**Primary function**: `generate-flashcards` (Deno runtime)

**Structure**:
```
supabase/functions/
├── generate-flashcards/
│   ├── index.ts       # Main handler (GET debug, POST generate)
│   ├── schema.ts      # Zod schemas + response normalization
│   └── parser.ts      # Extract generation payload from OpenAI response
└── _shared/           # Reusable utilities across functions
    ├── auth.ts        # Clerk JWT verification (JWKS-based)
    ├── openai.ts      # OpenAI client with retry logic
    ├── extractors.ts  # Server-side URL fetching
    ├── http.ts        # HTTP helpers (json, preflight)
    ├── request-id.ts  # Request ID middleware
    └── rate-limit.ts  # Rate limiting logic
```

**Edge function endpoints**:
- `GET ?debug=1` - Returns environment diagnostics (auth status, issuer, etc.)
- `POST` - Generates flashcards + summary from text/URL

### Authentication Flow (⚠️ Currently Using Temporary Bypass)

**Production flow** (not yet fully configured):
1. Frontend calls `getToken({ template: 'supabase' })` from Clerk
2. Clerk returns JWT with custom claims for Supabase
3. Edge function verifies JWT using JWKS (auto-fetched from Clerk issuer)
4. User ID extracted from JWT `sub` claim

**Current temporary workaround** (see TECHNICAL_STATUS.md):
- Frontend uses Supabase anon key instead of Clerk JWT
- Edge function checks `?admin_bypass=1` query parameter
- Hardcoded admin user ID bypasses authentication
- **Must be removed before production** - see [TECHNICAL_STATUS.md](TECHNICAL_STATUS.md)

**Admin role system**:
- Admin user IDs defined in `VITE_ADMIN_USER_IDS` env variable (comma-separated)
- Currently hardcoded in `src/lib/roles.ts` as fallback due to env loading issues
- Grants access to Notebook and Dashboard views

### File Processing Architecture

**Client-side extraction** (browser):
- **Why**: Deno runtime in edge functions doesn't support Node.js PDF/DOCX libraries
- **Libraries**: `pdfjs-dist` (PDF), `mammoth` (DOCX)
- **Flow**:
  1. User uploads file in `UnifiedUpload.tsx`
  2. `fileExtractors.ts` extracts text in browser
  3. Extracted text sent to edge function as plain JSON
  4. Progress UI shows per-file extraction status

**Server-side extraction** (edge function):
- **URLs only**: `extractors.ts` fetches and strips HTML from URLs
- **Timeout**: 30 seconds for URL fetching

### AI Generation Pipeline

**Configuration**:
- Model: `gpt-4o-mini`
- Max tokens: **5,000** (for ultra high-quality summaries)
- Timeout: **120 seconds**
- Temperature: 0.4

**Language detection**:
- Uses `franc-min` to detect input language (ISO 639-3 codes)
- AI prompt enforces: "CRITICAL: Respond ONLY in {language}"
- Detected language stored in database (`cards.language`, `summaries.language`)

**Summary structure** (comprehensive markdown):
- Executive Summary
- Learning Objectives
- Key Concepts & Definitions
- Detailed Explanation
- Visual Summary (tables/diagrams)
- Common Mistakes & Misconceptions
- Practical Applications
- Practice & Verification
- Connections & Context
- Study Tips & Memory Aids
- Final Takeaways

**Rendering**:
- `SummaryDetail.tsx` uses `react-markdown` + `remark-gfm` (GitHub Flavored Markdown)
- Syntax highlighting via `react-syntax-highlighter` (oneDark theme)

### Database Schema

**Core tables**:

1. **`cards`** - Flashcard content
   - RLS policies: Users can only access their own cards
   - Fields: `id`, `user_id`, `question`, `answer`, `type`, `hint`, `category`, `difficulty`, `bloom`, `tags`, `status`, `deck_name`, `language`

2. **`fsrs_data`** - Spaced repetition scheduling
   - One-to-one with cards (card_id as PK)
   - Fields: `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`, `lapses`, `state`, `last_review`, `due`

3. **`summaries`** - Rich markdown summaries
   - Fields: `id`, `user_id`, `title`, `content` (markdown), `deck_name`, `language`

**Row Level Security (RLS)**:
- All tables have RLS enabled
- Policies allow users to CRUD only their own data
- Anonymous users supported (`user_id IS NULL`)
- User ID from Clerk JWT: `auth.jwt()->>'sub'`

**Indexes**:
- `idx_cards_user_id`, `idx_cards_status`, `idx_cards_user_status`
- `idx_fsrs_user_id`, `idx_fsrs_due`, `idx_fsrs_state`
- `idx_cards_language`, `idx_summaries_language`

---

## Critical Implementation Details

### Clerk JWT Template Configuration

**Required template name**: `supabase` (lowercase, exact match)

**Claims structure**:
```json
{
  "aud": "authenticated",
  "exp": "{{token.exp}}",
  "iat": "{{token.iat}}",
  "iss": "{{token.iss}}",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "user_metadata": { ... }
}
```

**Issuer**: Must be set in Supabase secrets as `CLERK_ISSUER`
- Edge function auto-fetches JWKS from `{issuer}/.well-known/jwks.json`
- Do NOT set `CLERK_JWT_PUBLIC_KEY` manually (conflicts with JWKS)

### Environment Variables

**Client (.env)**:
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_FUNCTION_URL=https://xxx.functions.supabase.co
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_ADMIN_USER_IDS=user_xxx,user_yyy  # Comma-separated admin Clerk user IDs
```

**Server (Supabase secrets)**:
```bash
OPENAI_API_KEY=sk-...           # Required
OPENAI_MODEL=gpt-4o-mini        # Optional (defaults to gpt-4o-mini)
ALLOWED_ORIGIN=http://localhost:5173  # CORS origin
CLERK_ISSUER=https://xxx.clerk.accounts.dev  # Required for JWT verification
SUPABASE_URL=...                # Auto-set by Supabase
SUPABASE_SERVICE_ROLE_KEY=...   # Auto-set by Supabase
```

### FSRS Algorithm

**Implementation**: `src/fsrs.ts`

**Key functions**:
- `getNextReviewInterval()` - Calculate next review based on rating
- `updateCardSchedule()` - Update FSRS parameters after review
- `getStudyQueue()` - Get cards due for review (sorted by due date)

**States**: `new`, `learning`, `review`, `relearning`

**Rating scale**: 1 (Again) to 4 (Easy)

---

## Known Issues & Temporary Code

See [TECHNICAL_STATUS.md](TECHNICAL_STATUS.md) for comprehensive documentation.

**Critical temporary code**:
1. **Admin bypass in edge function** ([generate-flashcards/index.ts](supabase/functions/generate-flashcards/index.ts) lines 97-102, 134-140)
   - Query parameter `?admin_bypass=1` bypasses Clerk auth
   - Hardcoded admin user ID

2. **Supabase anon key workaround** ([GenerateView.tsx](src/components/GenerateView.tsx) lines 77-82, 99-104)
   - Using anon key instead of Clerk JWT
   - Must restore proper auth flow

3. **Hardcoded admin ID fallback** ([roles.ts](src/lib/roles.ts) lines 14-19)
   - Temporary fix for `VITE_ADMIN_USER_IDS` not loading from .env
   - Vite environment variables not reloading properly

**Action required**: Remove all bypass code after configuring Clerk JWT template.

---

## Testing

### Unit Tests
- Framework: Vitest
- Location: `tests/**/*.test.ts`, `src/**/*.{test,spec}.{ts,tsx}`
- Run: `npm run test` or `npm run test:watch`

### Edge Function Testing
- Debug endpoint validates auth without calling OpenAI
- Dry run mode: `?dryRun=1` returns mock data and tests persistence
- Production testing: Check `supabase functions logs generate-flashcards`

### Error Codes (Edge Function)
- `unauthorized` - Clerk token missing/expired
- `upstream_unavailable` - OpenAI timeout/5xx
- `llm_parse_error` - Malformed JSON from OpenAI
- `internal_error` - Unexpected failure (check logs with requestId)

---

## Deployment

### Frontend
```bash
npm run build
# Deploy dist/ to Vercel/Netlify/etc.
```

### Edge Functions
```bash
supabase functions deploy generate-flashcards --project-ref YOUR_REF
supabase secrets set --project-ref YOUR_REF OPENAI_API_KEY=sk-...
supabase secrets set --project-ref YOUR_REF CLERK_ISSUER=https://...
```

### Database Migrations
```bash
supabase db push --project-ref YOUR_REF
```

---

## Admin User Configuration

**Current admin user ID**: `user_ADMIN_ID_PLACEHOLDER`

**Locations to update** when changing admin:
1. `.env` - `VITE_ADMIN_USER_IDS`
2. `src/lib/roles.ts` - Hardcoded fallback (line 15)
3. `supabase/functions/generate-flashcards/index.ts` - Bypass admin ID (lines 98, 143)

---

## Additional Resources

- [README.md](README.md) - Full setup instructions
- [TECHNICAL_STATUS.md](TECHNICAL_STATUS.md) - Current implementation status and cleanup tasks
- Supabase docs: https://supabase.com/docs
- Clerk docs: https://clerk.com/docs
- FSRS algorithm: https://github.com/open-spaced-repetition/fsrs4anki
