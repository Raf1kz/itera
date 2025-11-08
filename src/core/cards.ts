/**
 * Core card logic for extended card operations
 * Centralized helpers for difficulty, Bloom levels, and relationships
 */

import { CardExtended, BloomLevel, FSRSCard, toCardExtended } from '../schemas';

// ============================================================================
// DIFFICULTY MANAGEMENT
// ============================================================================

/**
 * Update card difficulty based on user performance
 * Maps FSRS difficulty (1-10) to user-facing difficulty (1-5)
 *
 * @param card Card to update
 * @param performanceRating User rating (1=hard, 4=easy)
 * @returns Updated card with adjusted difficulty
 */
export function updateCardDifficulty(
  card: CardExtended,
  performanceRating: 1 | 2 | 3 | 4
): CardExtended {
  // FSRS already manages difficulty (1-10)
  // This adds a user-friendly override if needed
  const fsrsDifficulty = card.difficulty; // 1-10 scale

  // Map FSRS difficulty to 1-5 scale for UI
  let uiDifficulty = Math.ceil(fsrsDifficulty / 2);

  // Adjust based on performance
  if (performanceRating === 1) {
    // Struggled - increase difficulty
    uiDifficulty = Math.min(5, uiDifficulty + 1);
  } else if (performanceRating === 4) {
    // Easy - decrease difficulty
    uiDifficulty = Math.max(1, uiDifficulty - 1);
  }

  return {
    ...card,
    difficultyOverride: uiDifficulty
  };
}

/**
 * Get effective difficulty for a card
 * Prefers override, falls back to FSRS difficulty mapped to 1-5
 *
 * @param card Card to check
 * @returns Difficulty on 1-5 scale
 */
export function getEffectiveDifficulty(card: CardExtended): number {
  if (card.difficultyOverride !== undefined) {
    return card.difficultyOverride;
  }

  // Map FSRS difficulty (1-10) to UI difficulty (1-5)
  return Math.ceil(card.difficulty / 2);
}

// ============================================================================
// BLOOM TAXONOMY
// ============================================================================

/**
 * Compute Bloom's taxonomy level based on card performance
 * Uses stability, reps, and lapses to infer cognitive level
 *
 * @param card Card to analyze
 * @returns Inferred Bloom level
 */
export function computeBloomLevel(card: CardExtended): BloomLevel {
  // If already set, return it
  if (card.bloom_level) {
    return card.bloom_level;
  }

  const { stability, reps, lapses, state } = card;

  // High stability + many reps = higher cognitive level
  const masteryScore = stability * (reps + 1) / Math.max(lapses + 1, 1);

  // State-based baseline
  if (state === 'new') return 'remember';
  if (state === 'learning') return 'understand';

  // Review/relearning: use mastery score
  if (masteryScore < 10) return 'understand';
  if (masteryScore < 30) return 'apply';
  if (masteryScore < 60) return 'analyze';
  if (masteryScore < 100) return 'evaluate';

  return 'create';
}

/**
 * Update card's Bloom level based on performance
 *
 * @param card Card to update
 * @param newLevel New Bloom level to set
 * @returns Updated card
 */
export function setBloomLevel(
  card: CardExtended,
  newLevel: BloomLevel
): CardExtended {
  return {
    ...card,
    bloom_level: newLevel
  };
}

/**
 * Get Bloom level as numeric value for sorting/filtering
 */
export function getBloomLevelValue(level: BloomLevel): number {
  const levels: Record<BloomLevel, number> = {
    remember: 1,
    understand: 2,
    apply: 3,
    analyze: 4,
    evaluate: 5,
    create: 6
  };
  return levels[level];
}

// ============================================================================
// RELATIONSHIP MANAGEMENT
// ============================================================================

/**
 * Link two cards together (bidirectional relationship)
 *
 * @param card1 First card
 * @param card2 Second card
 * @returns Both cards with updated relations
 */
export function linkCards(
  card1: CardExtended,
  card2: CardExtended
): [CardExtended, CardExtended] {
  const card1Relations = new Set(card1.relations || []);
  const card2Relations = new Set(card2.relations || []);

  // Add bidirectional links
  card1Relations.add(card2.id);
  card2Relations.add(card1.id);

  return [
    { ...card1, relations: Array.from(card1Relations) },
    { ...card2, relations: Array.from(card2Relations) }
  ];
}

/**
 * Unlink two cards (remove bidirectional relationship)
 *
 * @param card1 First card
 * @param card2 Second card
 * @returns Both cards with relations removed
 */
export function unlinkCards(
  card1: CardExtended,
  card2: CardExtended
): [CardExtended, CardExtended] {
  const card1Relations = new Set(card1.relations || []);
  const card2Relations = new Set(card2.relations || []);

  card1Relations.delete(card2.id);
  card2Relations.delete(card1.id);

  return [
    { ...card1, relations: Array.from(card1Relations) },
    { ...card2, relations: Array.from(card2Relations) }
  ];
}

/**
 * Add a unidirectional relation from source to target
 *
 * @param sourceCard Card to add relation from
 * @param targetCardId ID of target card
 * @returns Updated source card
 */
export function addRelation(
  sourceCard: CardExtended,
  targetCardId: string
): CardExtended {
  const relations = new Set(sourceCard.relations || []);
  relations.add(targetCardId);

  return {
    ...sourceCard,
    relations: Array.from(relations)
  };
}

/**
 * Remove a relation from a card
 *
 * @param card Card to remove relation from
 * @param targetCardId ID to remove
 * @returns Updated card
 */
export function removeRelation(
  card: CardExtended,
  targetCardId: string
): CardExtended {
  const relations = new Set(card.relations || []);
  relations.delete(targetCardId);

  return {
    ...card,
    relations: Array.from(relations)
  };
}

/**
 * Get all related card IDs for a given card
 *
 * @param card Card to check
 * @returns Array of related card IDs
 */
export function getRelatedCardIds(card: CardExtended): string[] {
  return card.relations || [];
}

/**
 * Check if two cards are related
 *
 * @param card1 First card
 * @param card2 Second card
 * @returns True if cards are linked
 */
export function areCardsRelated(
  card1: CardExtended,
  card2: CardExtended
): boolean {
  const relations = card1.relations || [];
  return relations.includes(card2.id);
}

// ============================================================================
// ADAPTIVE DIFFICULTY (P2)
// ============================================================================

/**
 * Adjust FSRS difficulty based on performance and Bloom level
 * Implements adaptive difficulty shaping for P2
 *
 * @param fsrsCard FSRS card to adjust
 * @param rating User rating (1=again, 2=hard, 3=good, 4=easy)
 * @param bloomLevel Optional Bloom taxonomy level
 * @returns Updated FSRS card with adjusted difficulty
 */
export function adjustDifficulty(
  fsrsCard: FSRSCard,
  rating: 1 | 2 | 3 | 4,
  bloomLevel?: BloomLevel
): FSRSCard {
  let newDifficulty = fsrsCard.difficulty;

  // Rule 1: Struggling with basic concepts → increase difficulty
  if ((rating === 1 || rating === 2) && bloomLevel && getBloomLevelValue(bloomLevel) <= 2) {
    newDifficulty += 0.1;
  }

  // Rule 2: Easily recalling complex concepts → reduce difficulty
  if (rating === 4 && bloomLevel && getBloomLevelValue(bloomLevel) >= 3) {
    newDifficulty -= 0.1;
  }

  // Clamp to FSRS standard range (1.3 - 3.0)
  newDifficulty = Math.max(1.3, Math.min(3.0, newDifficulty));

  return {
    ...fsrsCard,
    difficulty: newDifficulty
  };
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batch update difficulties for multiple cards
 *
 * @param cards Cards to update
 * @param ratings Map of card ID to performance rating
 * @returns Updated cards
 */
export function batchUpdateDifficulties(
  cards: CardExtended[],
  ratings: Map<string, 1 | 2 | 3 | 4>
): CardExtended[] {
  return cards.map(card => {
    const rating = ratings.get(card.id);
    return rating ? updateCardDifficulty(card, rating) : card;
  });
}

/**
 * Batch compute Bloom levels for all cards
 *
 * @param cards Cards to process
 * @returns Cards with computed Bloom levels
 */
export function batchComputeBloomLevels(cards: CardExtended[]): CardExtended[] {
  return cards.map(card => ({
    ...card,
    bloom_level: computeBloomLevel(card)
  }));
}

/**
 * Migrate FSRSCards to CardExtended with intelligent defaults
 *
 * @param fsrsCards Array of FSRSCard objects
 * @returns Array of CardExtended with computed fields
 */
export function intelligentMigration(fsrsCards: FSRSCard[]): CardExtended[] {
  return fsrsCards.map(fsrsCard => {
    const extended = toCardExtended(fsrsCard);
    return {
      ...extended,
      bloom_level: computeBloomLevel(extended),
      difficultyOverride: getEffectiveDifficulty(extended)
    };
  });
}
