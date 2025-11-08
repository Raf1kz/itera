import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============================================================================
// CONFIGURATION & ENVIRONMENT
// ============================================================================

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const PRIMARY_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-5-mini';
const FALLBACK_MODEL = PRIMARY_MODEL.startsWith('gpt-5') ? 'gpt-4o-mini' : 'gpt-5-mini';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';
const OPENAI_EMBED_MODEL = Deno.env.get('OPENAI_EMBED_MODEL') ?? 'text-embedding-3-small';

// Token budget configuration
const MAX_WEAK_CARDS = 20;
const MAX_INPUT_CHARS = 4000;

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  Vary: 'Origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const FSRSCardSchema = z.object({
  id: z.string(),
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.enum(['new', 'learning', 'review', 'relearning']),
  lastReview: z.string().optional(),
  due: z.string().optional(),
});

const CardExtendedSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  type: z.string(),
  category: z.string().optional(),
  hint: z.string().optional(),
});

const InputSchema = z.object({
  deck: z.array(CardExtendedSchema),
  fsrs: z.array(z.tuple([z.string(), FSRSCardSchema])),
  userQuery: z.string().optional(),
});

const QuestionSchema = z.object({
  q: z.string(),
  expected: z.string(),
});

const OutputSchema = z.object({
  summary: z.string(),
  recommendations: z.array(z.string()),
  questions: z.array(QuestionSchema),
});

type InputPayload = z.infer<typeof InputSchema>;
type OutputPayload = z.infer<typeof OutputSchema>;

// ============================================================================
// ERROR TAXONOMY & RESPONSES
// ============================================================================

enum ErrorType {
  CONFIG_ERROR = 'CONFIG_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUDGET_ERROR = 'BUDGET_ERROR',
  LLM_ERROR = 'LLM_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

function jsonErr(code: number, msg: string, type: ErrorType, details?: string): Response {
  if (details) {
    console.error(`[${type}] ${details}`);
  }

  return new Response(JSON.stringify({ error: msg }), {
    status: code,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function ok(data: any): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// ============================================================================
// TELEMETRY
// ============================================================================

type TelemetryStatus = 'ok' | 'error';

function logTelemetry(entry: {
  fn: string;
  model: string;
  inputChars: number;
  outputItems: number;
  durationMs: number;
  status: TelemetryStatus;
}) {
  console.log(
    `[TELEMETRY] ${JSON.stringify({
      fn: entry.fn,
      model: entry.model,
      input_chars: entry.inputChars,
      output_items: entry.outputItems,
      duration_ms: entry.durationMs,
      status: entry.status,
    })}`
  );
}

// ============================================================================
// SEMANTIC MATCHING HELPERS
// ============================================================================

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
      intersection++;
    }
  }

  const unionSize = new Set([...setA, ...setB]).size;
  return unionSize === 0 ? 0 : intersection / unionSize;
}

type FallbackResult = {
  ok: boolean;
  score: number;
  method: 'substring' | 'jaccard';
};

function semanticMatchFallback(user: string, expected: string): FallbackResult {
  const normalizedUser = normalize(user);
  const normalizedExpected = normalize(expected);

  if (!normalizedUser || !normalizedExpected) {
    return { ok: false, score: 0, method: 'jaccard' };
  }

  if (normalizedUser.includes(normalizedExpected) || normalizedExpected.includes(normalizedUser)) {
    return { ok: true, score: 1, method: 'substring' };
  }

  const userTokens = tokenize(user);
  const expectedTokens = tokenize(expected);

  const unigramScore = jaccard(userTokens, expectedTokens);
  const bigramScore = jaccard(ngrams(userTokens, 2), ngrams(expectedTokens, 2));
  const bestScore = Math.max(unigramScore, bigramScore);

  if (bestScore >= 0.6) {
    return { ok: true, score: bestScore, method: 'jaccard' };
  }

  return { ok: false, score: bestScore, method: 'jaccard' };
}

// ============================================================================
// EMBEDDING HELPERS
// ============================================================================

async function embed(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBED_MODEL,
      input: text,
    }),
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`Embed error: ${response.status} ${bodyText.slice(0, 120)}`);
  }

  const data = JSON.parse(bodyText);
  const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector)) {
    throw new Error('Invalid embedding response');
  }

  return vector as number[];
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dot / denominator;
}

type GradeResult = {
  ok: boolean;
  score: number;
  method: 'embedding' | 'jaccard' | 'substring';
  modelUsed: string;
};

async function gradeAnswer(user: string, expected: string): Promise<GradeResult> {
  const fallback = semanticMatchFallback(user, expected);
  let bestScore = fallback.score;
  let method: GradeResult['method'] = fallback.method;
  let ok = fallback.ok;
  let modelUsed = ok ? 'fallback' : 'fallback';

  const shouldEmbed =
    Boolean(OPENAI_API_KEY) &&
    Boolean(OPENAI_EMBED_MODEL) &&
    normalize(user).length > 0 &&
    normalize(expected).length > 0;

  if (shouldEmbed) {
    try {
      const truncate = (text: string) => (text.length > 2000 ? text.slice(0, 2000) : text);

      const [userVec, expectedVec] = await Promise.all([
        withRetries(() => embed(truncate(user))),
        withRetries(() => embed(truncate(expected))),
      ]);

      const similarity = cosine(userVec, expectedVec);
      modelUsed = OPENAI_EMBED_MODEL;

      if (Number.isFinite(similarity) && similarity >= 0.75) {
        return {
          ok: true,
          score: similarity,
          method: 'embedding',
          modelUsed,
        };
      }

      if (Number.isFinite(similarity) && similarity > bestScore) {
        bestScore = similarity;
        method = 'embedding';
        ok = ok || similarity >= 0.75;
        modelUsed = OPENAI_EMBED_MODEL;
      }
    } catch {
      // Swallow errors and fall back to semantic heuristics
    }
  }

  return {
    ok,
    score: bestScore,
    method,
    modelUsed,
  };
}

// ============================================================================
// RETRY/BACKOFF WRAPPER
// ============================================================================

async function withRetries<T>(fn: () => Promise<T>, attempts = 3, baseDelay = 500): Promise<T> {
  let lastErr: any;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;

      const errStr = String(e);
      const isTransient = /429|5\d\d|timeout|rate limit|network/i.test(errStr);

      if (!isTransient) break;
      if (i === attempts - 1) break;

      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${attempts} after ${delay}ms: ${errStr.slice(0, 100)}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastErr;
}

// ============================================================================
// LLM INTERFACE
// ============================================================================

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

async function requestOpenAI(model: string, messages: Message[]): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  const bodyText = await response.text();

  if (!response.ok) {
    let errorMsg = `OpenAI ${response.status}`;
    try {
      const errorJson = JSON.parse(bodyText);
      errorMsg = errorJson.error?.message || errorMsg;
    } catch {
      errorMsg = bodyText.slice(0, 400);
    }

    if (response.status === 429) {
      throw new Error(`RATE_LIMIT: ${errorMsg}`);
    }

    throw new Error(`${errorMsg}`);
  }

  const data = JSON.parse(bodyText);
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  return content;
}

async function callOpenAI(messages: Message[]): Promise<{ content: string; model: string }> {
  const models = Array.from(new Set([PRIMARY_MODEL, FALLBACK_MODEL]));
  let lastError: unknown = new Error('OpenAI call failed');

  for (const model of models) {
    try {
      const content = await withRetries(() => requestOpenAI(model, messages));
      return { content, model };
    } catch (err) {
      lastError = err;
      console.error(`[MODEL_FAIL] ${model}: ${String(err)}`);
    }
  }

  throw lastError;
}

// ============================================================================
// WEAK CARD SELECTION
// ============================================================================

interface WeakCard {
  card: any;
  fsrs: any;
  stability: number;
}

export function selectWeakCards(deck: any[], fsrsMap: Map<string, any>): WeakCard[] {
  const weakCards: WeakCard[] = [];

  for (const card of deck) {
    const fsrs = fsrsMap.get(card.id);
    if (!fsrs) continue;

    // Skip new cards (not studied yet)
    if (fsrs.state === 'new') continue;

    weakCards.push({
      card,
      fsrs,
      stability: fsrs.stability,
    });
  }

  // Sort by stability (lowest first = weakest)
  weakCards.sort((a, b) => a.stability - b.stability);

  // Take top MAX_WEAK_CARDS
  return weakCards.slice(0, MAX_WEAK_CARDS);
}

function truncateToCharLimit(weakCards: WeakCard[], maxChars: number): WeakCard[] {
  const result: WeakCard[] = [];
  let currentChars = 0;

  for (const wc of weakCards) {
    const cardStr = JSON.stringify({
      question: wc.card.question,
      answer: wc.card.answer,
      type: wc.card.type,
      category: wc.card.category,
      stability: wc.fsrs.stability,
      difficulty: wc.fsrs.difficulty,
      lapses: wc.fsrs.lapses,
    });

    if (currentChars + cardStr.length > maxChars) break;

    result.push(wc);
    currentChars += cardStr.length;
  }

  return result;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const rateLimitBuckets = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitBuckets.get(ip) ?? [];
  const recent = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitBuckets.set(ip, recent);
    return true;
  }

  recent.push(now);
  rateLimitBuckets.set(ip, recent);
  return false;
}

export function resetRateLimits() {
  rateLimitBuckets.clear();
}

// ============================================================================
// AI COMPANION LOGIC
// ============================================================================

async function generateCompanionResponse(
  weakCards: WeakCard[],
  userQuery?: string
): Promise<{ result: OutputPayload; model: string }> {
  const cardsContext = weakCards.map((wc) => ({
    question: wc.card.question,
    answer: wc.card.answer,
    type: wc.card.type,
    category: wc.card.category || 'Général',
    stability: wc.fsrs.stability.toFixed(2),
    difficulty: wc.fsrs.difficulty.toFixed(2),
    lapses: wc.fsrs.lapses,
  }));

  const systemPrompt = `You are an AI study companion helping students master their weak flashcards.

Your task:
1. Analyze the student's weakest cards (lowest stability = needs more practice)
2. Provide a brief summary of their weak areas
3. Give 3-5 actionable recommendations to improve
4. Generate 2-4 quiz questions to test their understanding of weak cards

Guidelines:
- Focus on cards with low stability and high lapses
- Questions should be open-ended, not just card repetition
- Expected answers should be concise but complete
- Be encouraging and constructive

Output must be valid JSON with this exact structure:
{
  "summary": "Brief analysis of weak areas",
  "recommendations": ["Recommendation 1", "Recommendation 2", ...],
  "questions": [
    {"q": "Question text?", "expected": "Expected answer"},
    ...
  ]
}`;

  const userContent = userQuery
    ? `User query: "${userQuery}"\n\nWeak cards:\n${JSON.stringify(cardsContext, null, 2)}`
    : `Weak cards:\n${JSON.stringify(cardsContext, null, 2)}`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  const { content, model } = await callOpenAI(messages);

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('LLM JSON parse failed:', content.slice(0, 500));
    throw new Error(`Failed to parse LLM JSON: ${e}`);
  }

  const validated = OutputSchema.parse(parsed);

  return { result: validated, model };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function handleAiCompanionRequest(
  req: Request,
  connInfo?: { remoteAddr?: { hostname?: string } }
): Promise<Response> {
  const started = Date.now();
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  const ip =
    forwarded.split(',')[0]?.trim() ||
    (connInfo?.remoteAddr && 'hostname' in connInfo.remoteAddr
      ? connInfo.remoteAddr.hostname
      : 'unknown');
  let modelUsed = PRIMARY_MODEL;
  let inputChars = 0;
  let outputItems = 0;
  let status: TelemetryStatus = 'error';

  const finalize = (response: Response): Response => {
    logTelemetry({
      fn: 'ai-companion',
      model: modelUsed,
      inputChars,
      outputItems,
      durationMs: Date.now() - started,
      status,
    });
    return response;
  };

  if (req.method === 'OPTIONS') {
    status = 'ok';
    return finalize(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    );
  }

  if (req.method !== 'POST') {
    return finalize(jsonErr(405, 'Method not allowed', ErrorType.VALIDATION_ERROR));
  }

  if (isRateLimited(ip)) {
    return finalize(
      jsonErr(429, 'Rate limit exceeded', ErrorType.RATE_LIMIT, `Too many requests from ${ip}`)
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return finalize(jsonErr(400, 'Invalid JSON body', ErrorType.VALIDATION_ERROR, String(e)));
  }

  inputChars = JSON.stringify(body).length;

  if (body && body.mode === 'grade') {
    const userInput = typeof body.user === 'string' ? body.user : null;
    const expectedInput = typeof body.expected === 'string' ? body.expected : null;

    if (!userInput || !expectedInput) {
      return finalize(
        jsonErr(
          400,
          'Invalid grading payload',
          ErrorType.VALIDATION_ERROR,
          "Fields 'user' and 'expected' must be strings"
        )
      );
    }

    inputChars = userInput.length + expectedInput.length;

    const grade = await gradeAnswer(userInput, expectedInput);
    const score = Number(Math.max(0, Math.min(1, grade.score)).toFixed(3));
    const payload: Record<string, unknown> = {
      ok: grade.ok,
      score,
    };
    if (grade.method) {
      payload.method = grade.method;
    }

    outputItems = 1;
    modelUsed = grade.modelUsed || 'fallback';
    status = 'ok';

    return finalize(ok(payload));
  }

  if (!OPENAI_API_KEY) {
    return finalize(
      jsonErr(
        500,
        'Missing OPENAI_API_KEY',
        ErrorType.CONFIG_ERROR,
        'OpenAI API key not configured'
      )
    );
  }

  let inputPayload: InputPayload;
  try {
    inputPayload = InputSchema.parse(body);
  } catch (e: any) {
    return finalize(jsonErr(400, 'Input validation failed', ErrorType.VALIDATION_ERROR, e.message));
  }

  const fsrsMap = new Map(inputPayload.fsrs);
  const weakCards = selectWeakCards(inputPayload.deck, fsrsMap);

  if (weakCards.length === 0) {
    status = 'ok';
    outputItems = 0;
    return finalize(
      ok({
        summary: 'No weak cards found. Keep studying to track your progress!',
        recommendations: ['Continue adding cards to your deck', 'Review existing cards regularly'],
        questions: [],
      })
    );
  }

  const budgetedCards = truncateToCharLimit(weakCards, MAX_INPUT_CHARS);
  inputChars = JSON.stringify(
    budgetedCards.map(({ card, fsrs }) => ({
      id: card.id,
      stability: fsrs.stability,
      difficulty: fsrs.difficulty,
      lapses: fsrs.lapses,
    }))
  ).length;

  try {
    const { result, model } = await generateCompanionResponse(
      budgetedCards,
      inputPayload.userQuery
    );
    modelUsed = model;
    outputItems = result.questions.length;
    status = 'ok';
    return finalize(ok(result));
  } catch (e: any) {
    const errStr = String(e);

    if (/RATE_LIMIT/.test(errStr)) {
      return finalize(jsonErr(429, 'Rate limit exceeded', ErrorType.RATE_LIMIT, errStr));
    }

    if (e instanceof z.ZodError || /parse|json/i.test(errStr)) {
      return finalize(jsonErr(502, 'Failed to parse LLM response', ErrorType.PARSE_ERROR, errStr));
    }

    return finalize(jsonErr(502, 'LLM request failed', ErrorType.LLM_ERROR, errStr));
  }
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve((req, info) => handleAiCompanionRequest(req, info));
}
