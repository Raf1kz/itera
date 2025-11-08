# Edge Function Testing Guide

This document provides runnable tests for the `generate-flashcards` Edge Function.

## Prerequisites

- Supabase CLI installed (`brew install supabase/tap/supabase`)
- OpenAI API key
- `jq` for JSON formatting (optional, `brew install jq`)

## Setup

### 1. Start Local Supabase

```bash
supabase start
```

This will start Supabase services on `http://localhost:54321`

### 2. Set Edge Function Secrets

```bash
# Required: OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-your-actual-key-here

# Optional: Model selection
supabase secrets set OPENAI_MODEL=gpt-4o-mini

# Optional: CORS origin
supabase secrets set ALLOWED_ORIGIN=http://localhost:5173
```

### 3. Get Your Anon Key

```bash
# Get anon key from Supabase
supabase status

# Look for "anon key" in the output
# Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Local Tests

### Test 1: Basic Generation (French)

```bash
curl -i -X POST http://localhost:54321/functions/v1/generate-flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "text": "La photosynthèse est le processus par lequel les plantes convertissent l'\''énergie lumineuse en énergie chimique. La chlorophylle est le pigment vert dans les plantes qui capture la lumière du soleil."
  }'
```

**Expected Response:**
```json
{
  "summary": "Description de la photosynthèse",
  "cards": [
    {
      "id": "...",
      "question": "Qu'est-ce que la photosynthèse ?",
      "answer": "Le processus par lequel les plantes convertissent l'énergie lumineuse en énergie chimique",
      "type": "Définition",
      "category": "Photosynthèse"
    }
  ],
  "metadata": {
    "model": "gpt-4o-mini",
    "timestamp": "2025-10-28T...",
    "inputLength": 167,
    "cardCount": 2
  }
}
```

### Test 2: CORS Preflight

```bash
curl -i -X OPTIONS http://localhost:54321/functions/v1/generate-flashcards \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization"
```

**Expected Response:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, apikey, x-client-info
```

### Test 3: Error Handling - Empty Text

```bash
curl -i -X POST http://localhost:54321/functions/v1/generate-flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"text": ""}'
```

**Expected Response:**
```json
{
  "error": "Empty text",
  "type": "VALIDATION_ERROR",
  "details": "Text field cannot be empty"
}
```

### Test 4: Error Handling - Missing Text Field

```bash
curl -i -X POST http://localhost:54321/functions/v1/generate-flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{}'
```

**Expected Response:**
```json
{
  "error": "Missing or invalid 'text' field",
  "type": "VALIDATION_ERROR",
  "details": "Request must include 'text' field as string"
}
```

### Test 5: Large Input (Chunking Test)

```bash
# Create a large text file
cat > /tmp/large_notes.txt << 'EOF'
La photosynthèse est un processus crucial pour la vie sur Terre.

Les plantes utilisent la chlorophylle pour capturer l'énergie lumineuse.

La respiration cellulaire est le processus inverse de la photosynthèse.

Les mitochondries sont les centrales énergétiques de la cellule.

L'ADN contient l'information génétique de tous les organismes vivants.

La transcription est le processus de copie de l'ADN en ARN.

La traduction est le processus de synthèse des protéines à partir de l'ARN.
EOF

curl -X POST http://localhost:54321/functions/v1/generate-flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d "{\"text\": \"$(cat /tmp/large_notes.txt | tr '\n' ' ')\"}" | jq
```

### Test 6: English Input

```bash
curl -X POST http://localhost:54321/functions/v1/generate-flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "text": "Photosynthesis is the process by which plants convert light energy into chemical energy. Chlorophyll is the green pigment in plants that captures sunlight."
  }' | jq
```

## Production Tests

### Test 1: Production Endpoint

```bash
# Replace PROJECT_REF with your actual Supabase project reference
# Replace ANON_KEY with your production anon key
curl -i -X POST https://PROJECT_REF.functions.supabase.co/generate-flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PROD_ANON_KEY" \
  -H "apikey: YOUR_PROD_ANON_KEY" \
  -d '{
    "text": "La photosynthèse convertit l'\''énergie lumineuse en énergie chimique."
  }'
```

### Test 2: Production with Custom Domain

If you have a custom domain mapped to your Edge Function:

```bash
curl -i -X POST https://api.yourdomain.com/generate-flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PROD_ANON_KEY" \
  -H "apikey: YOUR_PROD_ANON_KEY" \
  -d '{
    "text": "Your study notes here..."
  }'
```

## Troubleshooting

### Error: "Service misconfigured"

**Cause:** OPENAI_API_KEY not set

**Solution:**
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key
```

### Error: CORS Error in Browser

**Cause:** ALLOWED_ORIGIN doesn't match your frontend origin

**Solution:**
```bash
supabase secrets set ALLOWED_ORIGIN=http://localhost:5173
```

### Error: "Rate limit exceeded"

**Cause:** Too many requests to OpenAI API

**Solution:**
- Wait a moment and retry
- The function will automatically retry with exponential backoff
- Check your OpenAI API rate limits

### Error: "Invalid JSON response"

**Cause:** OpenAI returned non-JSON response

**Solution:**
- Check OpenAI API status
- Try a different model: `supabase secrets set OPENAI_MODEL=gpt-4o`
- Check function logs: `supabase functions logs generate-flashcards`

## Monitoring

### View Function Logs (Local)

```bash
supabase functions logs generate-flashcards --local
```

### View Function Logs (Production)

```bash
supabase functions logs generate-flashcards --project-ref YOUR_PROJECT_REF
```

### Test Response Time

```bash
time curl -X POST http://localhost:54321/functions/v1/generate-flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"text": "Quick test"}' > /dev/null
```

## Performance Benchmarks

Typical response times (with gpt-4o-mini):

- **Small input** (< 500 chars): 2-4 seconds
- **Medium input** (500-2000 chars): 4-8 seconds
- **Large input** (2000-8000 chars): 8-15 seconds

Token usage estimates:

- **Small input**: ~200-500 tokens
- **Medium input**: ~500-1500 tokens
- **Large input**: ~1500-3000 tokens

## Acceptance Criteria Checklist

- [ ] ✅ Local generation works with French and English inputs
- [ ] ✅ CORS preflight succeeds for configured origin
- [ ] ✅ Error responses include proper error taxonomy
- [ ] ✅ Large inputs are chunked deterministically
- [ ] ✅ Response includes provenance metadata
- [ ] ✅ Invalid cards never reach client (server validates)
- [ ] ✅ Model can be switched via OPENAI_MODEL secret
- [ ] ✅ Rate limits trigger automatic retry with backoff
- [ ] ✅ Production endpoint works with proper credentials

## Next Steps

1. **Deploy to Production:**
   ```bash
   supabase functions deploy generate-flashcards --project-ref YOUR_REF
   ```

2. **Set Production Secrets:**
   ```bash
   supabase secrets set --project-ref YOUR_REF OPENAI_API_KEY=sk-...
   supabase secrets set --project-ref YOUR_REF ALLOWED_ORIGIN=https://yourdomain.com
   ```

3. **Monitor Production:**
   ```bash
   supabase functions logs generate-flashcards --project-ref YOUR_REF --follow
   ```
