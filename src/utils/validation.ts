import { z } from "zod";
import { normalizeCardType } from "./cardTypes";
import type { Flashcard } from '../types/flashcards';

/**
 * Client-side validation schema for flashcards
 * MUST match server-side schema in supabase/functions/generate-flashcards/index.ts
 */

const CardSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(8).max(220), // Match server: 220 chars
  answer: z.string().min(1).max(300),   // Match server: 300 chars
  type: z.enum([
    "Définition",
    "Définition inversée",
    "Texte à trous",
    "Concept",
    "Formule",
    "Comparaison",
    "Cause-Effet",
    "Ordre de processus",
    "Exemple"
  ]),
  hint: z.string().max(90).optional(),  // Match server: 90 chars
  category: z.string().default("Général"),
  difficulty: z.number().int().min(1).max(5).optional(),
  bloom: z
    .enum(["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"])
    .optional(),
  tags: z.array(z.string()).optional(),
  source: z.object({
    section: z.string().default(""),
    hash: z.string().default("")
  }).optional(),
  // Legacy fields for backward compatibility
  sourceSpan: z
    .object({
      section: z.string().default(""),
      start: z.number().int().nonnegative().default(0),
      end: z.number().int().nonnegative().default(0)
    })
    .optional()
});

type CardInput = z.infer<typeof CardSchema>;
type RawCard = CardInput & Partial<Flashcard>;

const CardsSchema = z.array(CardSchema).min(1).max(80); // Match server max

/**
 * Validate and normalize cards from server response
 * - Validates schema
 * - Normalizes card types
 * - Adds defaults
 * - Generates IDs if missing
 *
 * @param data Raw cards data from server
 * @returns Normalized cards array (empty if validation fails)
 */
export function validateAndNormalizeCards(data: unknown): Flashcard[] {
  try {
    const parsed = CardsSchema.safeParse(data);

    if (!parsed.success) {
      console.error("[CLIENT] Card validation failed:", parsed.error);
      console.error("[CLIENT] First error:", parsed.error.issues[0]);
      return [];
    }

    const seenIds = new Set<string>();

    return parsed.data.map((rawCardInput): Flashcard => {
      const rawCard = rawCardInput as RawCard;
      let id = rawCard.id?.trim();

      if (!id) {
        id = generateId();
      }

      while (seenIds.has(id)) {
        id = generateId();
      }

      seenIds.add(id);

      const normalized: Flashcard = {
        id,
        question: rawCard.question,
        answer: rawCard.answer,
        type: normalizeCardType(rawCard.type),
        hint: rawCard.hint ?? "",
        category: rawCard.category ?? "Général",
        tags: Array.isArray(rawCard.tags) ? [...rawCard.tags] : []
      };

      if (rawCard.difficulty !== undefined) {
        normalized.difficulty = rawCard.difficulty;
      }
      if (rawCard.bloom !== undefined) {
        normalized.bloom = rawCard.bloom;
      }
      if (rawCard.bloom_level !== undefined) {
        normalized.bloom_level = rawCard.bloom_level;
      }
      if (rawCard.source) {
        normalized.source = rawCard.source;
      }
      if (rawCard.sourceSpan) {
        normalized.sourceSpan = rawCard.sourceSpan;
      }
      if (rawCard.sourceHash !== undefined) {
        normalized.sourceHash = rawCard.sourceHash;
      }
      if (rawCard.sourceContext !== undefined) {
        normalized.sourceContext = rawCard.sourceContext;
      }
      if (rawCard.clusterId !== undefined) {
        normalized.clusterId = rawCard.clusterId;
      }

      return normalized;
    });
  } catch (error) {
    console.error("[CLIENT] Validation error:", error);
    return [];
  }
}

/**
 * Validate a single card
 * @param card Card to validate
 * @returns Validation result
 */
export function validateCard(card: unknown): { success: boolean; error?: string } {
  const result = CardSchema.safeParse(card);

  if (result.success) {
    return { success: true };
  }

  const firstError = result.error.issues[0];
  return {
    success: false,
    error: firstError ? `${firstError.path.join(".")}: ${firstError.message}` : "Unknown error"
  };
}

/**
 * Generate a unique card ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate server response structure
 * Expected: { summary: string, cards: Card[], metadata?: any }
 */
export function validateServerResponse(data: unknown): {
  success: boolean;
  error?: string;
  cards?: Flashcard[];
  summary?: string;
  metadata?: unknown;
} {
  if (!data || typeof data !== "object") {
    return { success: false, error: "Invalid response: not an object" };
  }

  const record = data as Record<string, unknown>;

  if (!Array.isArray(record['cards'])) {
    return { success: false, error: "Invalid response: missing cards array" };
  }

  const cards = record['cards'] as unknown[];
  const validCards = validateAndNormalizeCards(cards);

  if (validCards.length === 0 && cards.length > 0) {
    return { success: false, error: "All cards failed validation" };
  }

  return {
    success: true,
    cards: validCards,
    summary: typeof record['summary'] === 'string' ? (record['summary'] as string) : "",
    metadata: record['metadata']
  };
}

// ============================================================================
// P1 SCHEMA VALIDATION
// ============================================================================

import { CardExtended } from '../schemas';
import { debugSchemaValidation } from './debug';

/**
 * Validate that P1 fields are present and well-formed in a card
 */
export function validateP1Fields(card: Partial<Flashcard>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check Bloom level (optional but if present, must be valid)
  if (card.bloom_level !== undefined) {
    const validLevels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
    if (!validLevels.includes(card.bloom_level.toLowerCase())) {
      errors.push(`Invalid bloom_level: ${card.bloom_level}`);
    }
  } else {
    warnings.push('bloom_level field missing (optional)');
  }

  // Check source metadata (optional but if present, must have hash)
  if (card.source !== undefined) {
    if (typeof card.source !== 'object' || !card.source.hash) {
      errors.push('source field present but missing hash property');
    }
  } else {
    warnings.push('source field missing (optional)');
  }

  // Check sourceHash (optional)
  if (card.sourceHash !== undefined && typeof card.sourceHash !== 'string') {
    errors.push('sourceHash must be a string');
  }

  // Check sourceContext (optional)
  if (card.sourceContext !== undefined && typeof card.sourceContext !== 'string') {
    errors.push('sourceContext must be a string');
  }

  // Check clusterId (optional)
  if (card.clusterId !== undefined && typeof card.clusterId !== 'string') {
    errors.push('clusterId must be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate entire deck for P1 field integrity
 */
export function validateDeck(deck: Array<Partial<Flashcard>>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  cardErrors: Record<string, string[]>;
} {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const cardErrors: Record<string, string[]> = {};

  deck.forEach((card, index) => {
    const result = validateP1Fields(card);

    if (!result.valid) {
      cardErrors[card.id || `card-${index}`] = result.errors;
      allErrors.push(`Card ${index}: ${result.errors.join(', ')}`);
    }

    allWarnings.push(...result.warnings);
  });

  const validationResult = {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: Array.from(new Set(allWarnings)), // dedupe
    cardErrors
  };

  debugSchemaValidation(validationResult);

  return validationResult;
}

/**
 * Test export/import round-trip preserves P1 fields
 */
export function testExportImportRoundTrip(deck: CardExtended[]): {
  success: boolean;
  errors: string[];
  lostFields: string[];
} {
  const errors: string[] = [];
  const lostFields: string[] = [];

  try {
    // Simulate export (JSON serialization)
    const exported = JSON.stringify(deck);

    // Simulate import (JSON deserialization)
    const imported = JSON.parse(exported);

    // Check each card for field preservation
    deck.forEach((originalCard, index) => {
      const importedCard = imported[index];

      // Check P1 fields
      if (originalCard.bloom_level && !importedCard.bloom_level) {
        lostFields.push(`Card ${index}: bloom_level lost`);
      }

      if (originalCard.sourceHash && !importedCard.sourceHash) {
        lostFields.push(`Card ${index}: sourceHash lost`);
      }

      if (originalCard.sourceContext && !importedCard.sourceContext) {
        lostFields.push(`Card ${index}: sourceContext lost`);
      }

      if (originalCard.clusterId && !importedCard.clusterId) {
        lostFields.push(`Card ${index}: clusterId lost`);
      }

      if ((originalCard as any).source && !(importedCard as any).source) {
        lostFields.push(`Card ${index}: source metadata lost`);
      }
    });

  } catch (error) {
    errors.push(`Export/import failed: ${error}`);
  }

  return {
    success: errors.length === 0 && lostFields.length === 0,
    errors,
    lostFields
  };
}

/**
 * Generate validation report for deck
 */
export function generateValidationReport(deck: CardExtended[]): string {
  const deckValidation = validateDeck(deck as Array<Partial<Flashcard>>);
  const roundTripTest = testExportImportRoundTrip(deck);

  const report = `
=== P1 SCHEMA VALIDATION REPORT ===

Deck Size: ${deck.length} cards

Schema Validation:
  Valid: ${deckValidation.valid ? 'YES' : 'NO'}
  Errors: ${deckValidation.errors.length}
  Warnings: ${deckValidation.warnings.length}

${deckValidation.errors.length > 0 ? `
Errors:
${deckValidation.errors.map(e => `  - ${e}`).join('\n')}
` : ''}

Export/Import Round-Trip:
  Success: ${roundTripTest.success ? 'YES' : 'NO'}
  Lost Fields: ${roundTripTest.lostFields.length}

${roundTripTest.lostFields.length > 0 ? `
Lost Fields:
${roundTripTest.lostFields.map(f => `  - ${f}`).join('\n')}
` : ''}

Field Coverage:
  - Cards with bloom_level: ${deck.filter(c => c.bloom_level).length}
  - Cards with sourceHash: ${deck.filter(c => c.sourceHash).length}
  - Cards with sourceContext: ${deck.filter(c => c.sourceContext).length}
  - Cards with clusterId: ${deck.filter(c => c.clusterId).length}
  - Cards with source metadata: ${deck.filter(c => (c as any).source).length}

=== END REPORT ===
`;

  return report;
}
