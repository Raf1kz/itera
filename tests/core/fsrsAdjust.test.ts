import { describe, it, expect } from 'vitest';
import { repeatCard } from '../../src/fsrs';
import type { FSRSCard } from '../../src/schemas';

function baseCard(): FSRSCard {
  const now = new Date();
  return {
    id: 'card-1',
    stability: 2,
    difficulty: 5,
    elapsedDays: 1,
    scheduledDays: 1,
    reps: 5,
    lapses: 0,
    state: 'review',
    lastReview: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    due: now
  };
}

describe('repeatCard adjustments', () => {
  it('raises stability when rating is easy (4)', () => {
    const card = baseCard();
    const baselineStability = card.stability;

    const { card: updated } = repeatCard(card, 4, new Date());

    expect(updated.stability).toBeGreaterThan(baselineStability);
    expect(updated.state).toBe('review');
  });

  it('increases difficulty and marks relearning on rating 1', () => {
    const card = baseCard();
    const baselineDifficulty = card.difficulty;

    const { card: updated } = repeatCard(card, 1, new Date());

    expect(updated.difficulty).toBeGreaterThan(baselineDifficulty);
    expect(updated.state).toBe('relearning');
    expect(updated.lapses).toBeGreaterThan(card.lapses);
  });
});
