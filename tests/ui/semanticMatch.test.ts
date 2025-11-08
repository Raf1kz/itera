import { describe, it, expect } from 'vitest';
import { computeSemanticMatch, semanticMatch } from '../../src/utils/semanticMatch';

describe('semanticMatch', () => {
  it('returns true when user answer is contained in the expected answer (case-insensitive)', () => {
    expect(semanticMatch('Light energy into chemical energy', 'Converts light energy into chemical energy.')).toBe(true);
  });

  it('returns false when answers are unrelated', () => {
    expect(semanticMatch('Completely different answer', 'Original concept explanation')).toBe(false);
  });

  it('returns false when user answer is empty', () => {
    expect(semanticMatch('   ', 'expected content')).toBe(false);
  });

  it('provides jaccard scores via computeSemanticMatch', () => {
    const result = computeSemanticMatch('light energy into chemical energy', 'chemical energy conversion');
    expect(result.method).toBe('jaccard');
    expect(result.score).toBeGreaterThan(0);
  });
});
