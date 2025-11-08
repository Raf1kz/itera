import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============================================================================
// CONFIGURATION & ENVIRONMENT
// ============================================================================

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const PRIMARY_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-5-mini';
const FALLBACK_MODEL = PRIMARY_MODEL.startsWith('gpt-5') ? 'gpt-4o-mini' : 'gpt-5-mini';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';

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

const SessionStatsSchema = z.object({
  cardsReviewed: z.number().int().min(0),
  averageRating: z.number().min(1).max(4),
  totalTimeMs: z.number().int().min(0).optional(),
  clusterPerformance: z.record(z.string(), z.number()).optional(),
});

const InputSchema = z.object({
  deck: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      answer: z.string(),
      type: z.string(),
      category: z.string().optional(),
      bloom_level: z.string().optional(),
    })
  ),
  fsrs: z.array(
    z.tuple([
      z.string(),
      z.object({
        id: z.string(),
        stability: z.number(),
        difficulty: z.number(),
        reps: z.number(),
        lapses: z.number(),
        state: z.enum(['new', 'learning', 'review', 'relearning']),
      }),
    ])
  ),
  sessionStats: SessionStatsSchema,
});

const OutputSchema = z.object({
  summary: z.string().min(120).max(400),
  strengths: z.array(z.string()).min(1).max(5),
  weaknesses: z.array(z.string()).min(1).max(5),
  nextSteps: z.array(z.string()).min(1).max(5),
});

type InputPayload = z.infer<typeof InputSchema>;
type OutputPayload = z.infer<typeof OutputSchema>;

// ============================================================================
// ERROR RESPONSES
// ============================================================================

enum ErrorType {
  CONFIG_ERROR = 'CONFIG_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  LLM_ERROR = 'LLM_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
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
  cardsReviewed: number;
  durationMs: number;
  status: TelemetryStatus;
}) {
  console.log(
    `[TELEMETRY] ${JSON.stringify({
      fn: entry.fn,
      model: entry.model,
      cards_reviewed: entry.cardsReviewed,
      duration_ms: entry.durationMs,
      status: entry.status,
    })}`
  );
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
      temperature: 0.4,
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
// REFLECTION GENERATION
// ============================================================================

async function generateReflection(
  inputPayload: InputPayload
): Promise<{ result: OutputPayload; model: string }> {
  const { deck, fsrs, sessionStats } = inputPayload;
  const fsrsMap = new Map(fsrs);

  // Compute session metrics
  const reviewedCards = deck
    .filter((card) => {
      const fsrsCard = fsrsMap.get(card.id);
      return fsrsCard && fsrsCard.state !== 'new';
    })
    .map((card) => {
      const fsrsCard = fsrsMap.get(card.id)!;
      return {
        question: card.question,
        type: card.type,
        category: card.category || 'Général',
        bloom_level: card.bloom_level,
        stability: fsrsCard.stability.toFixed(2),
        difficulty: fsrsCard.difficulty.toFixed(2),
        lapses: fsrsCard.lapses,
        reps: fsrsCard.reps,
      };
    });

  // Calculate bloom distribution
  const bloomCounts: Record<string, number> = {};
  reviewedCards.forEach((card) => {
    if (card.bloom_level) {
      bloomCounts[card.bloom_level] = (bloomCounts[card.bloom_level] || 0) + 1;
    }
  });

  // Calculate stability stats
  const stabilities = reviewedCards.map((c) => parseFloat(c.stability));
  const avgStability =
    stabilities.length > 0
      ? (stabilities.reduce((a, b) => a + b, 0) / stabilities.length).toFixed(2)
      : '0';
  const minStability = stabilities.length > 0 ? Math.min(...stabilities).toFixed(2) : '0';
  const maxStability = stabilities.length > 0 ? Math.max(...stabilities).toFixed(2) : '0';

  // Build context
  const sessionContext = {
    cardsReviewed: sessionStats.cardsReviewed,
    averageRating: sessionStats.averageRating.toFixed(1),
    totalCards: deck.length,
    reviewedCards: reviewedCards.slice(0, 20), // Limit to 20 for token budget
    bloomDistribution: bloomCounts,
    stabilityStats: {
      average: avgStability,
      min: minStability,
      max: maxStability,
    },
  };

  const systemPrompt = `You are a study reflection assistant helping students understand their learning progress.

Your task:
1. Analyze the student's study session data and FSRS metrics
2. Provide a brief narrative summary (120-200 words) of their session performance
3. Identify 2-4 specific strengths demonstrated in this session
4. Identify 2-4 specific weaknesses or areas needing improvement
5. Suggest 2-4 actionable next steps for continued learning

Guidelines:
- Focus on cards with low stability (< 3.0) as weak areas
- Cards with high lapses (≥ 2) indicate difficulty retaining material
- Average rating below 3.0 suggests the session was challenging
- Consider Bloom taxonomy levels - higher levels (analyze, evaluate, create) show deeper understanding
- Be encouraging but honest about areas needing work
- Next steps should be specific and actionable (not generic advice)

Output must be valid JSON with this exact structure:
{
  "summary": "Narrative reflection of the session (120-200 words)",
  "strengths": ["Specific strength 1", "Specific strength 2", ...],
  "weaknesses": ["Specific weakness 1", "Specific weakness 2", ...],
  "nextSteps": ["Actionable step 1", "Actionable step 2", ...]
}`;

  const userContent = `Session data:\n${JSON.stringify(sessionContext, null, 2)}`;

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

export async function handleReflectionRequest(req: Request): Promise<Response> {
  const started = Date.now();
  let modelUsed = PRIMARY_MODEL;
  let cardsReviewed = 0;
  let status: TelemetryStatus = 'error';

  const finalize = (response: Response): Response => {
    logTelemetry({
      fn: 'reflection-mode',
      model: modelUsed,
      cardsReviewed,
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

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return finalize(jsonErr(400, 'Invalid JSON body', ErrorType.VALIDATION_ERROR, String(e)));
  }

  let inputPayload: InputPayload;
  try {
    inputPayload = InputSchema.parse(body);
  } catch (e: any) {
    return finalize(jsonErr(400, 'Input validation failed', ErrorType.VALIDATION_ERROR, e.message));
  }

  cardsReviewed = inputPayload.sessionStats.cardsReviewed;

  try {
    const { result, model } = await generateReflection(inputPayload);
    modelUsed = model;
    status = 'ok';
    return finalize(ok(result));
  } catch (e: any) {
    const errStr = String(e);

    if (/RATE_LIMIT/.test(errStr)) {
      return finalize(jsonErr(429, 'Rate limit exceeded', ErrorType.LLM_ERROR, errStr));
    }

    if (e instanceof z.ZodError || /parse|json/i.test(errStr)) {
      return finalize(jsonErr(502, 'Failed to parse LLM response', ErrorType.PARSE_ERROR, errStr));
    }

    return finalize(jsonErr(502, 'LLM request failed', ErrorType.LLM_ERROR, errStr));
  }
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve((req) => handleReflectionRequest(req));
}
