const JsonObjectMatcher = /{\s*"cards"[\s\S]*}$/;

export function extractGenerationPayload(raw: string): unknown | null {
  const match = raw.match(JsonObjectMatcher);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
