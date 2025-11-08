const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const DEFAULT_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
const JSON_MODEL = Deno.env.get('OPENAI_MODEL_JSON') ?? DEFAULT_MODEL;
const API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_TIMEOUT = 20_000;
const DEFAULT_RETRIES = 2;

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

interface ChatOptions {
  system?: string;
  messages: Message[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  json?: boolean;
  timeout_ms?: number;
  retries?: number;
}

export class OpenAIRequestError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'OpenAIRequestError';
    this.status = status;
  }
}

function shouldRetry(status: number | undefined): boolean {
  return status === 429 || (typeof status === 'number' && status >= 500);
}

async function requestWithTimeout(body: unknown, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const openai = {
  async chat(options: ChatOptions): Promise<{ content: string; model: string; json: boolean }> {
    if (!OPENAI_API_KEY) {
      throw new OpenAIRequestError('OPENAI_API_KEY not configured');
    }

    const timeoutMs = options.timeout_ms ?? DEFAULT_TIMEOUT;
    const retries = options.retries ?? DEFAULT_RETRIES;
    const messages = options.system
      ? [{ role: 'system', content: options.system }, ...options.messages]
      : options.messages;
    const useJsonMode = Boolean(options.json);
    const payload = {
      model: options.model ?? (useJsonMode ? JSON_MODEL : DEFAULT_MODEL),
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.max_tokens ?? 1400,
      ...(useJsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    };

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await requestWithTimeout(payload, timeoutMs);
        const text = await response.text();

        if (!response.ok) {
          let detail = text;
          try {
            const parsed = JSON.parse(text);
            detail = parsed.error?.message ?? detail;
          } catch {
            // ignore
          }
          const error = new OpenAIRequestError(detail.slice(0, 400), response.status);
          if (attempt < retries && shouldRetry(response.status)) {
            throw error;
          }
          throw error;
        }

        const json = JSON.parse(text) as {
          choices?: Array<{ message?: { content?: string } }>;
          model?: string;
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            total_tokens?: number;
          };
        };
        const content = json.choices?.[0]?.message?.content;
        if (!content) {
          throw new OpenAIRequestError('openai_empty_response');
        }
        return {
          content,
          model: json.model ?? payload.model,
          json: useJsonMode,
          usage: json.usage,
        };
      } catch (error) {
        if (error instanceof OpenAIRequestError) {
          if (attempt === retries || !shouldRetry(error.status)) {
            throw error;
          }
        } else if (error instanceof DOMException && error.name === 'AbortError') {
          if (attempt === retries) {
            throw new OpenAIRequestError('openai_timeout');
          }
        } else if (attempt === retries) {
          throw error;
        }

        const backoff = 500 * 2 ** attempt;
        console.warn('[openai] retrying', { attempt: attempt + 1, retries, backoff });
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }

    throw new OpenAIRequestError('openai_unreachable');
  },
};
