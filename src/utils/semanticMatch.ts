export type SemanticMatchMethod = 'substring' | 'jaccard';

export interface SemanticMatchResult {
  ok: boolean;
  score: number;
  method: SemanticMatchMethod;
}

function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  const normalized = normalize(text);
  if (!normalized) return [];
  return normalized.split(' ');
}

function ngrams(tokens: string[], size: number): string[] {
  if (tokens.length < size || size <= 0) return [];
  const grams: string[] = [];
  for (let i = 0; i <= tokens.length - size; i++) {
    grams.push(tokens.slice(i, i + size).join(' '));
  }
  return grams;
}

function jaccard(aTokens: string[], bTokens: string[]): number {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const setA = new Set(aTokens);
  const setB = new Set(bTokens);
  let intersection = 0;

  for (const token of setA) {
    if (setB.has(token)) {
      intersection += 1;
    }
  }

  const unionSize = new Set([...setA, ...setB]).size;
  return unionSize === 0 ? 0 : intersection / unionSize;
}

export function computeSemanticMatch(userInput: string, expected: string): SemanticMatchResult {
  const normalizedUser = normalize(userInput);
  const normalizedExpected = normalize(expected);

  if (!normalizedUser || !normalizedExpected) {
    return { ok: false, score: 0, method: 'jaccard' };
  }

  if (
    normalizedUser.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedUser)
  ) {
    return { ok: true, score: 1, method: 'substring' };
  }

  const userTokens = tokenize(userInput);
  const expectedTokens = tokenize(expected);
  const unigramScore = jaccard(userTokens, expectedTokens);
  const bigramScore = jaccard(ngrams(userTokens, 2), ngrams(expectedTokens, 2));
  const bestScore = Math.max(unigramScore, bigramScore);

  if (bestScore >= 0.6) {
    return { ok: true, score: bestScore, method: 'jaccard' };
  }

  return { ok: false, score: bestScore, method: 'jaccard' };
}

export function semanticMatch(userInput: string, expected: string): boolean {
  return computeSemanticMatch(userInput, expected).ok;
}
