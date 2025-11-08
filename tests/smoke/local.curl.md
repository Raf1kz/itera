# Local Smoke Tests

Run these after `supabase start` to verify edge functions locally.

## generate-flashcards

```bash
curl -X POST "http://localhost:54321/functions/v1/generate-flashcards" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d '{"text":"Explain how mitochondria generate ATP during cellular respiration."}'
```

## ai-companion

```bash
curl -X POST "http://localhost:54321/functions/v1/ai-companion" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d @tests/fixtures/ai-companion-sample.json
```

The companion sample payload should include a `deck` array and an `fsrs` tuple list. Use `tests/fixtures/ai-companion-sample.json` to keep the JSON concise for local QA.
