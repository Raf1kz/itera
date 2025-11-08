import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAndGetUserId, peekJwtHeader } from '../_shared/auth.ts';
import { json, preflight } from '../_shared/http.ts';
import { openai, OpenAIRequestError } from '../_shared/openai.ts';
import { withRequestId } from '../_shared/request-id.ts';
import { checkRateLimit, getRateLimitInfo } from '../_shared/rate-limiter.ts';
import { GenerateInputSchema, normalizeModelResponse } from './schema.ts';
import { extractGenerationPayload } from './parser.ts';
import { franc, francAll } from 'npm:franc-min@6';
import { extractFile, fetchURL } from '../_shared/extractors.ts';

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
] as const;

for (const key of REQUIRED_ENV) {
  if (!Deno.env.get(key)) {
    throw new Error(`env_missing_${key}`);
  }
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Language code to name mapping for common languages
const LANGUAGE_NAMES: Record<string, string> = {
  'eng': 'English',
  'spa': 'Spanish',
  'fra': 'French',
  'deu': 'German',
  'ita': 'Italian',
  'por': 'Portuguese',
  'rus': 'Russian',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'chi': 'Chinese',
  'ara': 'Arabic',
  'hin': 'Hindi',
  'nld': 'Dutch',
  'pol': 'Polish',
  'tur': 'Turkish',
  'vie': 'Vietnamese',
  'tha': 'Thai',
  'swe': 'Swedish',
  'nor': 'Norwegian',
  'dan': 'Danish',
  'fin': 'Finnish',
};

/**
 * Detect language from input text with confidence threshold
 * @param text - Input text to analyze
 * @returns Language code and name with confidence score
 */
function detectLanguage(text: string): {
  code: string;
  name: string;
  confidence: number;
  fallback: boolean;
} {
  // Require minimum 20 characters for reliable detection
  if (text.length < 20) {
    console.warn('language_detection_insufficient_text', {
      textLength: text.length,
      fallback: 'English',
    });
    return {
      code: 'eng',
      name: 'English',
      confidence: 0,
      fallback: true
    };
  }

  // Get all language predictions with scores
  const results = francAll(text, { minLength: 10 });

  // francAll returns array of [language, score] tuples
  // Higher score = more likely (not a probability, relative score)
  if (results.length === 0 || results[0][0] === 'und') {
    console.warn('language_detection_undetermined', {
      textLength: text.length,
      fallback: 'English',
    });
    return {
      code: 'eng',
      name: 'English',
      confidence: 0,
      fallback: true
    };
  }

  const [detectedCode, score] = results[0];

  // Normalize score to 0-1 range (franc scores are relative, not absolute)
  // If top score is much higher than second, we're more confident
  const confidence = results.length > 1
    ? score / (score + results[1][1])
    : 1.0;

  const code = detectedCode;
  const name = LANGUAGE_NAMES[code] || LANGUAGE_NAMES['eng'];

  console.info('language_detected', {
    code,
    name,
    confidence: confidence.toFixed(2),
    textLength: text.length,
    topAlternative: results.length > 1 ? results[1][0] : null,
  });

  // If confidence is low, log warning but still use detected language
  // (OpenAI is good at handling mixed-language content)
  if (confidence < 0.6) {
    console.warn('language_detection_low_confidence', {
      detected: code,
      confidence: confidence.toFixed(2),
      message: 'Language detection uncertain - OpenAI will adapt',
    });
  }

  return {
    code,
    name,
    confidence,
    fallback: false
  };
}

const DryRunPayload = {
  cards: [
    {
      front: "What is Itera's purpose?",
      back: 'Itera converts study notes into flashcards and deep summaries using OpenAI.',
      tags: ['itera', 'product'],
    },
  ],
  summary: {
    title: 'Itera Dry Run Summary',
    content:
      'Overview: Itera validates persistence without calling OpenAI. Key Concepts: Authentication, persistence, dashboards. Step-by-step Explanation: 1) Authenticate with Clerk, 2) Call edge function, 3) Persist via Supabase service role. Common Pitfalls: Missing JWT or env variables. Worked Example: dryRun=1 call. Key Takeaways: Itera stores flashcards and summaries securely.',
  },
};

function errorResponse(
  status: number,
  body: { code: string; error: string; detail?: unknown; requestId: string }
) {
  return json(status, body);
}

async function handleRequest(req: Request, ctx: { requestId: string }): Promise<Response> {
  const preflightResponse = preflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  try {
    const url = new URL(req.url);

    if (req.method === 'GET' && url.searchParams.get('debug') === '1') {
      // Debug endpoint: Requires valid authentication
      // Useful for troubleshooting JWT configuration issues
      const authz = req.headers.get('authorization') || null;
      let userId = await verifyAndGetUserId(authz);

      // SECURITY: Require authentication for debug endpoint
      if (!userId) {
        console.warn('debug_endpoint_unauthorized', {
          requestId: ctx.requestId,
          message: 'Debug endpoint requires valid authentication',
        });
        return errorResponse(401, {
          code: 'unauthorized',
          error: 'Debug endpoint requires authentication',
        });
      }

      const header = peekJwtHeader(authz);
      const issuer = (Deno.env.get('CLERK_ISSUER') ?? '').trim();
      const hasPem = !!(Deno.env.get('CLERK_JWT_PUBLIC_KEY') ?? '').trim();

      // Sanitized debug info (don't leak full issuer URL)
      return json(200, {
        ok: true,
        authenticated: true,
        userId,
        hasAuth: true,
        issuerConfigured: !!issuer,
        issuerDomain: issuer ? new URL(issuer).hostname : null, // Only domain, not full URL
        hasPemFallback: hasPem,
        tokenAlgorithm: header?.alg,
        tokenKeyId: header?.kid ? `${header.kid.substring(0, 8)}...` : null, // Truncated KID
        requestId: ctx.requestId,
      });
    }

    if (req.method === 'GET' && url.searchParams.get('health') === '1') {
      return json(200, { ok: true, requestId: ctx.requestId });
    }

    if (req.method === 'GET') {
      return errorResponse(405, {
        code: 'method_not_allowed',
        error: 'Method not allowed',
        requestId: ctx.requestId,
      });
    }

    if (req.method !== 'POST') {
      return errorResponse(405, {
        code: 'method_not_allowed',
        error: 'Method not allowed',
        requestId: ctx.requestId,
      });
    }

    const authz = req.headers.get('authorization');
    const userId = await verifyAndGetUserId(authz);

    if (!userId) {
      console.warn('unauthorized_request', { requestId: ctx.requestId });
      return errorResponse(401, {
        code: 'unauthorized',
        error: 'Authentication required',
        requestId: ctx.requestId,
      });
    }

    // Check rate limit (100 requests per hour per user)
    if (!(await checkRateLimit(userId))) {
      const limitInfo = await getRateLimitInfo(userId);
      console.warn('rate_limit_exceeded', {
        requestId: ctx.requestId,
        userId,
        resetAt: limitInfo.resetAt.toISOString(),
      });
      return errorResponse(429, {
        code: 'rate_limit_exceeded',
        error: `Rate limit exceeded. You can make ${limitInfo.limit} requests per hour. Try again after ${limitInfo.resetAt.toISOString()}.`,
        detail: {
          limit: limitInfo.limit,
          remaining: 0,
          resetAt: limitInfo.resetAt.toISOString(),
        },
        requestId: ctx.requestId,
      });
    }

    // Check daily token budget (prevent cost runaway)
    const DAILY_TOKEN_BUDGET = 50_000; // ~$0.10/day per user max (free tier)
    const { data: usageData, error: usageError } = await admin.rpc('get_daily_token_usage', {
      p_user_id: userId,
    });

    if (!usageError && usageData) {
      const dailyTokens = usageData.daily_tokens || 0;
      if (dailyTokens >= DAILY_TOKEN_BUDGET) {
        console.warn('daily_budget_exceeded', {
          requestId: ctx.requestId,
          userId,
          dailyTokens,
          budget: DAILY_TOKEN_BUDGET,
          resetAt: usageData.reset_at,
        });
        return errorResponse(429, {
          code: 'daily_budget_exceeded',
          error: 'Daily AI generation limit reached. Your limit resets in 24 hours.',
          detail: {
            dailyLimit: DAILY_TOKEN_BUDGET,
            tokensUsed: dailyTokens,
            resetAt: usageData.reset_at,
          },
          requestId: ctx.requestId,
        });
      }
    }

    // Parse request body - either JSON or multipart/form-data
    let payload: any = {};
    const contentType = req.headers.get('content-type') || '';
    let extractedTexts: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle file uploads
      try {
        const formData = await req.formData();

        // Extract text from uploaded files
        const files = formData.getAll('files');
        for (const file of files) {
          if (file instanceof File) {
            const buffer = await file.arrayBuffer();
            try {
              const text = await extractFile(file.name, buffer);
              extractedTexts.push(text);
              console.info('file_extracted', {
                requestId: ctx.requestId,
                filename: file.name,
                size: buffer.byteLength,
                charCount: text.length,
              });
            } catch (extractError) {
              console.error('file_extraction_failed', {
                requestId: ctx.requestId,
                filename: file.name,
                error: extractError instanceof Error ? extractError.message : String(extractError),
              });
              return errorResponse(422, {
                code: 'file_extraction_failed',
                error: `Failed to extract text from ${file.name}`,
                detail: extractError instanceof Error ? extractError.message : String(extractError),
                requestId: ctx.requestId,
              });
            }
          }
        }

        // Get other form fields
        payload = {
          text: formData.get('text') || extractedTexts.join('\n\n'),
          url: formData.get('url'),
          deckName: formData.get('deckName'),
          options: formData.get('options') ? JSON.parse(formData.get('options') as string) : {},
        };
      } catch (error) {
        return errorResponse(400, {
          code: 'invalid_form_data',
          error: 'Invalid multipart/form-data',
          detail: error instanceof Error ? error.message : String(error),
          requestId: ctx.requestId,
        });
      }
    } else {
      // Handle JSON
      try {
        payload = await req.json();
      } catch {
        return errorResponse(400, {
          code: 'invalid_json',
          error: 'Invalid JSON body',
          requestId: ctx.requestId,
        });
      }
    }

    // Fetch URL content if provided
    if (payload.url) {
      try {
        const urlText = await fetchURL(payload.url);
        extractedTexts.push(urlText);
        console.info('url_fetched', {
          requestId: ctx.requestId,
          url: payload.url,
          charCount: urlText.length,
        });
      } catch (fetchError) {
        console.error('url_fetch_failed', {
          requestId: ctx.requestId,
          url: payload.url,
          error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        });
        return errorResponse(422, {
          code: 'url_fetch_failed',
          error: `Failed to fetch content from URL`,
          detail: fetchError instanceof Error ? fetchError.message : String(fetchError),
          requestId: ctx.requestId,
        });
      }
    }

    // Combine all text sources
    if (extractedTexts.length > 0) {
      const existingText = payload.text || '';
      payload.text = [existingText, ...extractedTexts].filter(Boolean).join('\n\n');
    }

    const parsed = GenerateInputSchema.safeParse(payload);
    if (!parsed.success) {
      return errorResponse(400, {
        code: 'validation_error',
        error: 'Input validation failed',
        detail: parsed.error.issues,
        requestId: ctx.requestId,
      });
    }

    const { text, deckName, options } = parsed.data;
    const dryRun = url.searchParams.get('dryRun') === '1';

    // Detect language from input text
    const detectedLang = text ? detectLanguage(text) : {
      code: 'eng',
      name: 'English',
      confidence: 1.0,
      fallback: true
    };

    console.info('generate_request', {
      requestId: ctx.requestId,
      userId,
      deckName,
      dryRun,
      targetCards: options.targetCards,
      makeSummary: options.makeSummary,
      summaryDetail: options.summaryDetail,
      detectedLanguage: detectedLang.name,
      languageConfidence: detectedLang.confidence.toFixed(2),
      languageFallback: detectedLang.fallback,
    });

    let generation = DryRunPayload;
    let tokenUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;

    if (!dryRun) {
      const summaryDirective = `Write an ULTRA HIGH-QUALITY structured summary in MARKDOWN format in ${detectedLang.name}. This should be comprehensive, well-organized, and publication-ready.

Structure your summary with these sections (translate ALL section titles to ${detectedLang.name}):

# {Extracted Topic Title in ${detectedLang.name}}

## 📋 {Executive Summary title in ${detectedLang.name}}
[2-3 sentences capturing the core essence]

## 🎯 {Learning Objectives title in ${detectedLang.name}}
{Appropriate introduction in ${detectedLang.name}}:
- Objective 1
- Objective 2
- Objective 3

## 📚 {Key Concepts & Definitions title in ${detectedLang.name}}

### {Concept} 1: {Name}
**{Definition label in ${detectedLang.name}}**: Clear, precise definition
**{Significance label in ${detectedLang.name}}**: Why it matters
**{Example label in ${detectedLang.name}}**: Real-world application

### {Concept} 2: {Name}
[Same structure for each concept]

## 🔬 {Detailed Explanation title in ${detectedLang.name}}

[Comprehensive breakdown with:]
- Step-by-step logical flow
- Cause and effect relationships
- Supporting evidence and examples
- Analogies for complex ideas

## 📊 {Visual Summary title in ${detectedLang.name}}

[Use markdown tables, lists, or diagrams to represent comparisons, hierarchies, processes]

## ⚠️ {Common Mistakes & Misconceptions title in ${detectedLang.name}}

| {Misconception column in ${detectedLang.name}} | {Reality column in ${detectedLang.name}} | {Why It Matters column in ${detectedLang.name}} |
|--------------|---------|----------------|
| Mistake 1 | Correction | Impact |
| Mistake 2 | Correction | Impact |

## 💡 {Practical Applications title in ${detectedLang.name}}

1. **Application 1**: Real-world usage scenario
2. **Application 2**: How professionals use this
3. **Application 3**: Future implications

## 🧪 {Practice & Verification title in ${detectedLang.name}}

**{Check Your Understanding label in ${detectedLang.name}}:**
1. Question → Answer with explanation
2. Question → Answer with explanation

## 🔗 {Connections & Context title in ${detectedLang.name}}

**{Related Topics label in ${detectedLang.name}}**: How this connects to other concepts
**{Prerequisites label in ${detectedLang.name}}**: What you should know first
**{Next Steps label in ${detectedLang.name}}**: What to study next

## 📝 {Study Tips & Memory Aids title in ${detectedLang.name}}

**{Key Formulas label in ${detectedLang.name}}**: Important equations highlighted
**{Mnemonics label in ${detectedLang.name}}**: Memory devices for key concepts
**{Must Remember label in ${detectedLang.name}}**: Non-negotiable takeaways

## 🎓 {Final Takeaways title in ${detectedLang.name}}

**{In Summary label in ${detectedLang.name}}:**
- Core point 1
- Core point 2
- Core point 3

Aim for 800-1200 words of comprehensive, scannable content. ALL text must be in ${detectedLang.name}.`;

      const system = `You are an expert study coach. CRITICAL: Respond ONLY in ${detectedLang.name}. Produce JSON only. No prose outside JSON.`;
      const prompt = `LANGUAGE: The input text is in ${detectedLang.name}. Generate ALL content (flashcards and summary) ENTIRELY in ${detectedLang.name}. This is CRITICAL - match the input language exactly.

IMPORTANT: All section titles, labels, headings, table headers, and content MUST be in ${detectedLang.name}. For example, if the language is French, use "Résumé Exécutif" instead of "Executive Summary", "Objectifs d'Apprentissage" instead of "Learning Objectives", etc.

SOURCE:
${text}

TASKS:
1) Create ${options.targetCards} high-quality Q/A flashcards in ${detectedLang.name}. Each: {front, back, tags[]}. Keep answers precise.
2) ${summaryDirective}

CRITICAL REMINDER: Write the entire summary in ${detectedLang.name}, including ALL section titles, ALL labels, ALL examples, and ALL explanations. Do NOT use any English words.

Return a single JSON object: {"cards":[{front,back,tags}], "summary":{"title":string,"content":string}}`;

      let llmResponse: string | null = null;

      try {
        const primary = await openai.chat({
          system,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 5_000,
          json: true,
          timeout_ms: 120_000,
          retries: 2,
        });
        llmResponse = primary.content;
        tokenUsage = primary.usage;
        try {
          generation = JSON.parse(llmResponse);
        } catch (primaryParseError) {
          console.warn('llm_json_parse_failed', {
            requestId: ctx.requestId,
            detail: (primaryParseError as Error).message,
          });
          const fallback = await openai.chat({
            system,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 5_000,
            json: false,
            timeout_ms: 120_000,
            retries: 2,
          });
          tokenUsage = fallback.usage; // Update with fallback usage
          const extracted = extractGenerationPayload(fallback.content);
          if (!extracted) {
            return errorResponse(422, {
              code: 'llm_parse_error',
              error: 'Unable to parse model output',
              requestId: ctx.requestId,
            });
          }
          generation = extracted;
        }
      } catch (error) {
        if (error instanceof OpenAIRequestError) {
          console.error('openai_failed', {
            requestId: ctx.requestId,
            status: error.status,
            message: error.message,
          });
          return errorResponse(502, {
            code: 'upstream_unavailable',
            error: 'The AI service is temporarily unavailable',
            detail: error.message,
            requestId: ctx.requestId,
          });
        }

        console.error('openai_unhandled_error', {
          requestId: ctx.requestId,
          detail: error instanceof Error ? error.message : String(error),
        });
        return errorResponse(500, {
          code: 'internal_error',
          error: 'Unexpected error while generating content',
          detail: error instanceof Error ? error.message : String(error),
          requestId: ctx.requestId,
        });
      }
    }

    const { cards, summary } = normalizeModelResponse(generation);

    if (!cards.length) {
      return errorResponse(422, {
        code: 'llm_parse_error',
        error: 'Model response did not include valid cards',
        requestId: ctx.requestId,
      });
    }

    let createdCardIds: string[] = [];
    try {
      if (cards.length) {
        const { data, error } = await admin
          .from('cards')
          .insert(
            cards.map((card) => ({
              user_id: userId,
              deck_name: deckName,
              front: card.front,
              back: card.back,
              tags: card.tags,
              language: detectedLang.code,
            }))
          )
          .select('id');

        if (error) {
          throw error;
        }

        createdCardIds = (data ?? []).map((row) => row.id as string);
      }

      // Track token usage for cost monitoring (after successful card insertion)
      if (tokenUsage?.total_tokens) {
        const tokensInput = tokenUsage.prompt_tokens || 0;
        const tokensOutput = tokenUsage.completion_tokens || 0;
        const tokensTotal = tokenUsage.total_tokens;
        // OpenAI gpt-4o-mini pricing: $0.150/1M input, $0.600/1M output
        const costUsd = (tokensInput / 1_000_000) * 0.15 + (tokensOutput / 1_000_000) * 0.6;

        await admin.from('token_usage').insert({
          user_id: userId,
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
          tokens_total: tokensTotal,
          cost_usd: costUsd,
          model: 'gpt-4o-mini',
          request_id: ctx.requestId,
          endpoint: 'generate-flashcards',
        });

        console.info('token_usage_tracked', {
          requestId: ctx.requestId,
          userId,
          tokensTotal,
          costUsd: costUsd.toFixed(6),
        });
      }
    } catch (error) {
      console.error('cards_insert_failed', {
        requestId: ctx.requestId,
        detail: error instanceof Error ? error.message : String(error),
      });
      return errorResponse(500, {
        code: 'cards_insert_failed',
        error: 'Failed to save generated cards',
        detail: error instanceof Error ? error.message : String(error),
        requestId: ctx.requestId,
      });
    }

    let createdSummaryId: string | null = null;
    if (summary && options.makeSummary) {
      try {
        const { data, error } = await admin
          .from('summaries')
          .insert({
            user_id: userId,
            title: (summary.title ?? 'Summary').toString().slice(0, 200),
            content: summary.content.toString().slice(0, 120_000),
            language: detectedLang.code,
          })
          .select('id')
          .single();

        if (error) {
          throw error;
        }

        createdSummaryId = data.id as string;
      } catch (error) {
        console.error('summary_insert_failed', {
          requestId: ctx.requestId,
          detail: error instanceof Error ? error.message : String(error),
        });
        return errorResponse(500, {
          code: 'summary_insert_failed',
          error: 'Failed to save generated summary',
          detail: error instanceof Error ? error.message : String(error),
          requestId: ctx.requestId,
        });
      }
    }

    console.info('generate_success', {
      requestId: ctx.requestId,
      userId,
      counts: { cards: createdCardIds.length, summaries: createdSummaryId ? 1 : 0 },
    });

    return json(200, {
      ok: true,
      requestId: ctx.requestId,
      createdCardIds,
      createdSummaryId,
      counts: { cards: createdCardIds.length, summaries: createdSummaryId ? 1 : 0 },
    });
  } catch (error) {
    console.error('generate_unhandled_error', {
      requestId: ctx.requestId,
      detail: error instanceof Error ? error.message : String(error),
    });
    return json(500, {
      error: 'internal_error',
      detail: error instanceof Error ? error.message : String(error),
      requestId: ctx.requestId,
    });
  }
}

Deno.serve(withRequestId(handleRequest));
