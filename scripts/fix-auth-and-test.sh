#!/usr/bin/env bash
set -euo pipefail

export SUPABASE_URL="${SUPABASE_URL:-https://YOUR_PROJECT_REF.supabase.co}"
: "${TEST_JWT:?Set TEST_JWT to a valid Clerk token from the 'supabase' template'}"

decode_b64url() {
  python - <<'PY' "$1"
import base64
import sys

token_part = sys.argv[1]
padding = '=' * ((4 - len(token_part) % 4) % 4)
print(base64.urlsafe_b64decode(token_part + padding).decode())
PY
}

JWT_HEADER_RAW="${TEST_JWT%%.*}"
JWT_PAYLOAD_RAW="${TEST_JWT#*.}"
JWT_PAYLOAD_RAW="${JWT_PAYLOAD_RAW%%.*}"

JWT_HEADER_JSON="$(decode_b64url "${JWT_HEADER_RAW}")"
JWT_PAYLOAD_JSON="$(decode_b64url "${JWT_PAYLOAD_RAW}")"

ALG="$(python - <<'PY' "${JWT_HEADER_JSON}"
import json, sys
try:
    header = json.loads(sys.argv[1])
    print(header.get("alg", ""))
except Exception:
    print("")
PY
)"

ISS="$(python - <<'PY' "${JWT_PAYLOAD_JSON}"
import json, sys
try:
    payload = json.loads(sys.argv[1])
    print(payload.get("iss", ""))
except Exception:
    print("")
PY
)"

AUD="$(python - <<'PY' "${JWT_PAYLOAD_JSON}"
import json, sys
try:
    payload = json.loads(sys.argv[1])
    print(payload.get("aud", ""))
except Exception:
    print("")
PY
)"

echo "ALG=${ALG}"
echo "ISS=${ISS}"
echo "AUD=${AUD}"

if [[ "${ALG}" != "RS256" ]]; then
  echo "ERROR: JWT alg is not RS256 (got ${ALG:-unset}). Fix Clerk template to RS256 and reissue token."
  exit 1
fi

if [[ -z "${ISS}" ]]; then
  echo "ERROR: Missing iss in token."
  exit 1
fi

echo "Setting Supabase secret CLERK_ISSUER='${ISS}'"
supabase secrets set CLERK_ISSUER="${ISS}"

echo "Deploying generate-flashcards function…"
supabase functions deploy generate-flashcards --project-ref YOUR_PROJECT_REF

echo "Testing POST with provided token…"
HTTP_STATUS=$(curl -s -o /tmp/fix-auth-response.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${TEST_JWT}" \
  -H "Content-Type: application/json" \
  -d '{"text":"ping","options":{"targetCards":1,"makeSummary":false,"summaryDetail":"concise"}}' \
  "${SUPABASE_URL}/functions/v1/generate-flashcards")

head -n 20 /tmp/fix-auth-response.json

if [[ "${HTTP_STATUS}" == "200" ]]; then
  echo "SUCCESS: Edge function responded with 200."
  exit 0
fi

echo "HTTP status ${HTTP_STATUS}"
if [[ "${HTTP_STATUS}" == "401" ]]; then
  echo "401 persists. Possible causes:"
  echo " - Supabase CLERK_ISSUER secret still mismatched."
  echo " - JWKS unavailable; ensure network and issuer URL are valid."
  echo " - Token audience mismatch or stale token; request a new one."
fi

exit 1
