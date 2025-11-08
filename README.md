# FlashStudy

AI-powered flashcard generation app with spaced repetition learning using FSRS algorithm.

## Features

- 🤖 **AI Flashcard Generation** - Generate flashcards from study notes using OpenAI GPT
- 📚 **Smart Study Sessions** - FSRS (Free Spaced Repetition Scheduler) algorithm
- 🔐 **User Authentication** - Email/password and Google OAuth via Supabase
- ☁️ **Cloud Sync** - Sync your flashcards across devices
- 📊 **Progress Tracking** - Track mastery, streaks, and study statistics
- 🎨 **Modern UI** - Clean, minimal design built with React and Tailwind CSS

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Zod** for validation
- **Lucide React** for icons

### Backend
- **Supabase** for authentication and database
- **Edge Functions** (Deno) for serverless AI generation
- **OpenAI GPT** for flashcard generation
- **PostgreSQL** with Row Level Security

### Algorithms
- **FSRS** - Modern spaced repetition algorithm
- **Deterministic chunking** for token budget management

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase CLI (`brew install supabase/tap/supabase`)
- OpenAI API key
- Supabase account (free tier works)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd FlashStudy
pnpm install
```

### 2. Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your Supabase credentials
# Get these from: https://app.supabase.com/project/_/settings/api
```

### 3. Local Development with Supabase

```bash
# Start Supabase services (PostgreSQL, Auth, Edge Functions)
supabase start

# Set Edge Function secrets
supabase secrets set OPENAI_API_KEY=sk-your-key-here
supabase secrets set OPENAI_MODEL=gpt-4o-mini
supabase secrets set ALLOWED_ORIGIN=http://localhost:5173

# Apply database migrations
supabase db push

# Start the dev server
pnpm dev
```

The app will be available at **http://localhost:5173**

### 4. Test Edge Function

```bash
# Get your anon key
supabase status

# Test the function
curl -X POST http://localhost:54321/functions/v1/generate-flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"text": "Photosynthesis converts light energy to chemical energy."}'
```

See [EDGE_FUNCTION_TESTS.md](./EDGE_FUNCTION_TESTS.md) for comprehensive testing guide.

## Project Structure

```
FlashStudy/
├── src/
│   ├── components/        # React components
│   │   ├── AuthModal.tsx
│   │   ├── UserProfile.tsx
│   │   └── Toast.tsx
│   ├── contexts/          # React context providers
│   │   └── AuthContext.tsx
│   ├── utils/             # Utility functions
│   │   ├── functions.ts   # Edge function client
│   │   ├── validation.ts  # Card validation
│   │   ├── storage.ts     # Supabase storage
│   │   ├── queue.ts       # Study queue logic
│   │   └── export.ts      # Import/export
│   ├── fsrs.ts           # FSRS algorithm
│   ├── App.tsx           # Main application
│   └── main.tsx          # Entry point
├── supabase/
│   ├── functions/
│   │   └── generate-flashcards/
│   │       ├── index.ts   # Main edge function
│   │       └── chunk.ts   # Text chunking
│   └── migrations/        # Database migrations
├── public/               # Static assets
└── docs/                 # Documentation
```

## Development

### Run Dev Server

```bash
pnpm dev
```

### Build for Production

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

### Type Checking

```bash
pnpm typecheck
```

## Local Testing

Run the full quality gate before commits:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
```

## Tracing

Edge functions emit structured telemetry lines to stdout to simplify diagnostics when serving or running in Supabase:

```
[TELEMETRY] {"fn":"generate-flashcards","model":"gpt-5-mini","input_chars":1200,"output_items":12,"duration_ms":820,"status":"ok"}
```

- `fn` identifies the function (`generate-flashcards` or `ai-companion`)
- `model` records the OpenAI model used after fallback logic
- `input_chars` / `output_items` capture request/response scale markers
- `duration_ms` reports end-to-end latency
- `status` is `ok` or `error`

Use `supabase functions logs --follow` or local `supabase functions serve` to stream these traces during QA.

## Edge Function Development

### Local Testing

```bash
# Serve function locally
supabase functions serve generate-flashcards

# View logs
supabase functions logs generate-flashcards --local
```

### Deploy to Production

```bash
# Deploy function
supabase functions deploy generate-flashcards --project-ref YOUR_REF

# Set production secrets
supabase secrets set --project-ref YOUR_REF OPENAI_API_KEY=sk-...
supabase secrets set --project-ref YOUR_REF ALLOWED_ORIGIN=https://yourdomain.com

# View production logs
supabase functions logs generate-flashcards --project-ref YOUR_REF
```

## Database

### Apply Migrations

```bash
# Local
supabase db push

# Production
supabase db push --project-ref YOUR_REF
```

### Create New Migration

```bash
supabase migration new your_migration_name
```

### Reset Local Database

```bash
supabase db reset
```

## Authentication Setup

### Google OAuth Setup

1. **Configure Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs:
     - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

2. **Configure Supabase:**
   - Go to Authentication → Providers → Google
   - Enable and add your Client ID and Secret

See [GOOGLE_AUTH_SETUP.md](./GOOGLE_AUTH_SETUP.md) for detailed instructions.

## Environment Variables

### Client Variables (`.env`)

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_FUNCTION_URL=https://xxx.functions.supabase.co
```

### Server Variables (Supabase Secrets)

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
OPENAI_MODEL=gpt-4o-mini
ALLOWED_ORIGIN=http://localhost:5173
OPENAI_ORG=org-...
OPENAI_PROJECT=proj_...
```

## Production Deployment

### 1. Deploy Frontend

**Vercel:**
```bash
vercel --prod
```

**Netlify:**
```bash
netlify deploy --prod
```

### 2. Deploy Edge Functions

```bash
supabase functions deploy generate-flashcards --project-ref YOUR_REF
```

### 3. Configure Production Secrets

```bash
supabase secrets set --project-ref YOUR_REF OPENAI_API_KEY=sk-...
supabase secrets set --project-ref YOUR_REF ALLOWED_ORIGIN=https://yourdomain.com
```

### 4. Apply Database Migrations

```bash
supabase db push --project-ref YOUR_REF
```

## API Documentation

### Generate Flashcards Endpoint

**POST** `/generate-flashcards`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <anon-key>
apikey: <anon-key>
```

**Request Body:**
```json
{
  "text": "Your study notes here..."
}
```

**Response:**
```json
{
  "summary": "Brief summary",
  "cards": [
    {
      "id": "...",
      "question": "Question text",
      "answer": "Answer text",
      "type": "Définition",
      "hint": "Optional hint",
      "category": "Category"
    }
  ],
  "metadata": {
    "model": "gpt-4o-mini",
    "timestamp": "2025-10-28T...",
    "inputLength": 150,
    "cardCount": 5
  }
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "type": "ERROR_TYPE",
  "details": "Additional details"
}
```

Error types:
- `CONFIG_ERROR` - Server misconfiguration
- `VALIDATION_ERROR` - Invalid request
- `BUDGET_ERROR` - Input too large
- `LLM_ERROR` - OpenAI API error
- `PARSE_ERROR` - Invalid AI response
- `RATE_LIMIT` - Rate limit exceeded
- `NETWORK_ERROR` - Network/timeout error

## Testing

See [EDGE_FUNCTION_TESTS.md](./EDGE_FUNCTION_TESTS.md) for:
- Runnable curl examples
- Test cases for all scenarios
- Troubleshooting guide
- Performance benchmarks

## Performance

### Response Times (gpt-4o-mini)
- Small input (< 500 chars): 2-4 seconds
- Medium input (500-2000 chars): 4-8 seconds
- Large input (2000-8000 chars): 8-15 seconds

### Budget Limits
- Max input: 80,000 characters (~20k tokens)
- Max output: 80 cards
- Chunking: 8,000 chars per chunk
- Max chunks: 10 chunks

### Cost Estimates (gpt-4o-mini)
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens
- Average generation: $0.001 - $0.005 per request

## Troubleshooting

### "Service misconfigured" Error

**Cause:** Missing OPENAI_API_KEY

**Fix:**
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key
```

### CORS Errors

**Cause:** ALLOWED_ORIGIN doesn't match your domain

**Fix:**
```bash
supabase secrets set ALLOWED_ORIGIN=http://localhost:5173
```

### Cards Not Generating

1. Check Edge Function logs:
   ```bash
   supabase functions logs generate-flashcards
   ```

2. Verify OpenAI API key is valid

3. Check OpenAI API usage limits

### Edge Function Error Codes

- `unauthorized` &rarr; Clerk token missing or expired. Ensure the "supabase" template is used via `getToken({ template: "supabase" })`.
- `upstream_unavailable` &rarr; OpenAI timed out or returned 5xx. Re-run after verifying quota/connectivity.
- `llm_parse_error` &rarr; Model responded with malformed JSON. The fallback will retry automatically; if it persists, tweak your notes or run `?dryRun=1` to validate persistence.
- `internal_error` &rarr; Unexpected failure on the edge function. Check Supabase logs with the returned `requestId` for details.

### Authentication Issues

1. Check Supabase anon key in `.env`
2. Verify database migrations are applied
3. Check Supabase Auth settings

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs4anki) by Jarrett Ye
- [Supabase](https://supabase.com/) for backend infrastructure
- [OpenAI](https://openai.com/) for GPT models
- [Tailwind CSS](https://tailwindcss.com/) for styling

## Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/flashstudy/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/flashstudy/discussions)
- **Supabase Docs:** [https://supabase.com/docs](https://supabase.com/docs)

---

Built with ❤️ using React, Supabase, and OpenAI
