import { z } from 'zod';

// ============================================================================
// BASE FSRS SCHEMA (existing - unchanged)
// ============================================================================

export const FSRSCardSchema = z.object({
  id: z.string(),
  stability: z.number().default(0),
  difficulty: z.number().default(0),
  elapsedDays: z.number().default(0),
  scheduledDays: z.number().default(0),
  reps: z.number().int().default(0),
  lapses: z.number().int().default(0),
  state: z.enum(['new', 'learning', 'review', 'relearning']).default('new'),
  lastReview: z.date().optional(),
  due: z.date().optional()
});

export type FSRSCard = z.infer<typeof FSRSCardSchema>;

// ============================================================================
// EXTENDED CARD SCHEMA (new - for cognitive analytics)
// ============================================================================

export const BloomLevelSchema = z.enum([
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create'
]);

export type BloomLevel = z.infer<typeof BloomLevelSchema>;

export const CardExtendedSchema = FSRSCardSchema.extend({
  // Concept graph relationships
  relations: z.array(z.string()).optional(),

  // Cognitive metadata (preserved for backward compatibility with 'difficulty')
  // Note: FSRSCard.difficulty is 1-10, this can be 1-5 for UI purposes
  difficultyOverride: z.number().int().min(1).max(5).optional(),

  // Bloom's taxonomy level
  bloom_level: BloomLevelSchema.optional(),

  // AI companion metadata
  lastCompanionInteraction: z.date().optional(),
  companionNotes: z.string().optional(),

  // Analytics metadata
  retrievabilityHistory: z.array(z.number()).optional(),
  sessionIds: z.array(z.string()).optional(),

  // Concept clustering metadata
  sourceHash: z.string().optional(), // Hash of source paragraph
  sourceContext: z.string().optional(), // Original paragraph text (for display)
  clusterId: z.string().optional() // Assigned concept cluster ID
});

export type CardExtended = z.infer<typeof CardExtendedSchema>;

// ============================================================================
// TYPE GUARDS (backward compatibility)
// ============================================================================

/**
 * Type guard to check if a card is an FSRSCard
 */
export function isFSRSCard(card: unknown): card is FSRSCard {
  try {
    FSRSCardSchema.parse(card);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if a card is a CardExtended
 */
export function isCardExtended(card: unknown): card is CardExtended {
  try {
    CardExtendedSchema.parse(card);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe cast from FSRSCard to CardExtended
 * Adds empty extended fields if they don't exist
 */
export function toCardExtended(card: FSRSCard): CardExtended {
  if (isCardExtended(card)) {
    return card;
  }

  return {
    ...card,
    relations: [],
    bloom_level: undefined,
    difficultyOverride: undefined,
    lastCompanionInteraction: undefined,
    companionNotes: undefined,
    retrievabilityHistory: [],
    sessionIds: []
  };
}

/**
 * Safe cast from CardExtended to FSRSCard
 * Strips extended fields for FSRS operations
 */
export function toFSRSCard(card: CardExtended): FSRSCard {
  const {
    relations,
    difficultyOverride,
    bloom_level,
    lastCompanionInteraction,
    companionNotes,
    retrievabilityHistory,
    sessionIds,
    ...fsrsCard
  } = card;

  return fsrsCard;
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Migrate a collection of FSRSCards to CardExtended
 */
export function migrateCardsToExtended(cards: FSRSCard[]): CardExtended[] {
  return cards.map(toCardExtended);
}

/**
 * Validate and normalize a card, ensuring it meets at least FSRSCard requirements
 */
export function validateCard(card: unknown): FSRSCard | null {
  try {
    return FSRSCardSchema.parse(card);
  } catch (error) {
    console.error('[SCHEMA] Card validation failed:', error);
    return null;
  }
}

/**
 * Validate and normalize an extended card
 */
export function validateCardExtended(card: unknown): CardExtended | null {
  try {
    return CardExtendedSchema.parse(card);
  } catch (error) {
    console.error('[SCHEMA] Extended card validation failed:', error);
    return null;
  }
}
