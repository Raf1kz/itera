import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const MODULE_PATH = '../../supabase/functions/ai-companion/index.js';

const baseEnv: Record<string, string> = {
  OPENAI_API_KEY: 'test-key',
  OPENAI_MODEL: 'gpt-5-mini',
  ALLOWED_ORIGIN: 'http://localhost:5173'
};

function setupDeno(overrides: Partial<typeof baseEnv> = {}) {
  const env = { ...baseEnv, ...overrides } as Record<string, string>;
  const serveMock = vi.fn();
  (globalThis as any).Deno = {
    env: { get: (key: string) => env[key] },
    serve: serveMock
  };
  return serveMock;
}

async function importModule() {
  vi.resetModules();
  const versionToken = Math.random().toString(36).slice(2);
  return await import(`${MODULE_PATH}?version=${versionToken}`);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  delete (globalThis as any).Deno;
  delete (globalThis as any).fetch;
  vi.resetModules();
});

const sampleDeck = [
  { id: 'a', question: 'Q1', answer: 'A1', type: 'Définition' },
  { id: 'b', question: 'Q2', answer: 'A2', type: 'Définition' },
  { id: 'c', question: 'Q3', answer: 'A3', type: 'Définition' }
];

const sampleFsrs = new Map<string, any>([
  ['a', { id: 'a', stability: 3, difficulty: 2, elapsedDays: 0, scheduledDays: 0, reps: 2, lapses: 0, state: 'review' }],
  ['b', { id: 'b', stability: 1, difficulty: 2, elapsedDays: 0, scheduledDays: 0, reps: 2, lapses: 1, state: 'review' }],
  ['c', { id: 'c', stability: 5, difficulty: 3, elapsedDays: 0, scheduledDays: 0, reps: 2, lapses: 0, state: 'review' }]
]);

describe('ai-companion edge function', () => {
  it('orders weak cards by ascending stability', async () => {
    setupDeno();
    const { selectWeakCards, resetRateLimits } = await importModule();
    resetRateLimits();

    const weak = selectWeakCards(sampleDeck, sampleFsrs) as Array<{ card: { id: string } }>;
    expect(weak.map((item) => item.card.id)).toEqual(['b', 'a', 'c']);
  });

  it('returns 502 when LLM output fails schema validation', async () => {
    setupDeno();

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        choices: [
          { message: { content: JSON.stringify({ summary: 'oops' }) } }
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    (globalThis as any).fetch = fetchMock;

    const { handleAiCompanionRequest, resetRateLimits } = await importModule();
    resetRateLimits();

    const res = await handleAiCompanionRequest(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          deck: sampleDeck,
          fsrs: Array.from(sampleFsrs.entries())
        })
      })
    );

    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/parse/i);
  });

  it('enforces rate limit of three requests per minute per IP', async () => {
    setupDeno();

    const payload = {
      summary: 'Helper',
      recommendations: ['Keep studying'],
      questions: [{ q: 'Q?', expected: 'A' }]
    };

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        choices: [
          { message: { content: JSON.stringify(payload) } }
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    (globalThis as any).fetch = fetchMock;

    const { handleAiCompanionRequest, resetRateLimits } = await importModule();
    resetRateLimits();

    const request = () =>
      handleAiCompanionRequest(
        new Request('http://localhost', {
          method: 'POST',
          body: JSON.stringify({
            deck: sampleDeck,
            fsrs: Array.from(sampleFsrs.entries())
          })
        }),
        { remoteAddr: { hostname: '127.0.0.1' } }
      );

    const first = await request();
    const second = await request();
    const third = await request();
    const fourth = await request();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
    expect(fourth.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('grades answers via fallback logic when embeddings fail', async () => {
    setupDeno({ OPENAI_API_KEY: '' });

    const fetchMock = vi.fn();

    (globalThis as any).fetch = fetchMock;

    const { handleAiCompanionRequest, resetRateLimits } = await importModule();
    resetRateLimits();

    const res = await handleAiCompanionRequest(
      new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'grade',
          user: 'Water boils at one hundred degrees Celsius.',
          expected: 'Water boils at 100 degrees celsius.'
        })
      }),
      { remoteAddr: { hostname: '127.0.0.1' } }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.score).toBe('number');
    expect(['substring', 'jaccard'].includes(data.method)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
