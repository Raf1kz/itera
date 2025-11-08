import { describe, it, expect } from 'vitest';
import {
  GenerateInputSchema,
  normalizeModelResponse,
} from '../../supabase/functions/generate-flashcards/schema.node';
import { extractGenerationPayload } from '../../supabase/functions/generate-flashcards/parser.node';

describe('generate-flashcards schema', () => {
  it('rejects inputs with notes shorter than 20 characters', () => {
    const result = GenerateInputSchema.safeParse({ text: 'too short', options: {} });
    expect(result.success).toBe(false);
  });

  it('normalizes model response into cards and summary payloads', () => {
    const normalized = normalizeModelResponse({
      cards: [
        { front: 'What is photosynthesis?', back: 'Conversion of light into chemical energy.', tags: ['biology', 123] },
        { front: '', back: 'Incomplete card should be dropped' },
      ],
      summary: {
        title: 'Photosynthesis Summary',
        content: 'Detailed explanation of photosynthesis.'
      },
    });

    expect(normalized.cards).toHaveLength(1);
    expect(normalized.cards[0]).toMatchObject({
      front: 'What is photosynthesis?',
      back: 'Conversion of light into chemical energy.',
      tags: ['biology', '123'],
    });

    expect(!!normalized.summary).toBe(true);
    expect(normalized.summary?.title).toBe('Photosynthesis Summary');
    expect(normalized.summary?.content).toMatch(/Detailed explanation/);
  });

  it('extracts fallback JSON payload from mixed content', () => {
    const raw = `Some preamble text before JSON.\n{"cards":[{"front":"Prompt","back":"Answer","tags":["test"]}],"summary":{"title":"Fallback","content":"Body"}}`; // eslint-disable-line max-len
    const extracted = extractGenerationPayload(raw);
    expect(extracted === null).toBe(false);
    const parsed = normalizeModelResponse(extracted);
    expect(parsed.cards).toHaveLength(1);
    expect(parsed.summary?.title).toBe('Fallback');
  });
});
