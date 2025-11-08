#!/usr/bin/env bash
set -euo pipefail

export SUPABASE_URL="${SUPABASE_URL:-https://YOUR_PROJECT_REF.supabase.co}"

: "${TEST_JWT:?Set TEST_JWT to a valid Clerk token from the 'supabase' template}"

echo "== Health =="
curl -s -i "${SUPABASE_URL}/functions/v1/generate-flashcards?health=1" | sed -n '1,5p'
echo

echo "== Debug =="
curl -s -i -H "Authorization: Bearer ${TEST_JWT}" \
  "${SUPABASE_URL}/functions/v1/generate-flashcards?debug=1" | sed -n '1,20p'
echo

echo "== POST generate =="
curl -s -i -X POST \
  -H "Authorization: Bearer ${TEST_JWT}" \
  -H "Content-Type: application/json" \
  -d '{"text":"test flashcard generation","options":{"targetCards":1,"makeSummary":false,"summaryDetail":"brief"}}' \
  "${SUPABASE_URL}/functions/v1/generate-flashcards" | sed -n '1,20p'
