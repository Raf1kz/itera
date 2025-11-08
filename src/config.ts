/**
 * Centralized Configuration Module
 * All environment variables and feature flags should be read here
 */

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

/**
 * Supabase configuration
 */
export const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'] || '';
export const SUPABASE_ANON_KEY = import.meta.env['VITE_SUPABASE_ANON_KEY'] || '';
export const SUPABASE_FUNCTION_URL = import.meta.env['VITE_SUPABASE_FUNCTION_URL'] || '';

/**
 * Debug mode - enables verbose logging
 */
export const DEBUG_MODE = import.meta.env['VITE_DEBUG_MODE'] === 'true';

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Enable AI Companion feature
 */
export const ENABLE_COMPANION = import.meta.env['VITE_ENABLE_COMPANION'] !== 'false';

/**
 * Enable Goal Planner feature
 */
export const ENABLE_GOAL_PLANNER = import.meta.env['VITE_ENABLE_GOAL_PLANNER'] !== 'false';

/**
 * Enable Reflection Mode feature (P2)
 */
export const ENABLE_REFLECTION = import.meta.env['VITE_ENABLE_REFLECTION'] !== 'false';

/**
 * Enable Adaptive Difficulty feature (P2)
 */
export const ENABLE_ADAPTIVE_DIFFICULTY = import.meta.env['VITE_ENABLE_ADAPTIVE_DIFFICULTY'] !== 'false';

/**
 * Enable Concept Clusters feature (P1)
 */
export const ENABLE_CLUSTERS = import.meta.env['VITE_ENABLE_CLUSTERS'] !== 'false';

// ============================================================================
// APPLICATION CONSTANTS
// ============================================================================

/**
 * Local storage schema version for migrations
 */
export const LOCAL_STORAGE_SCHEMA_VERSION = 2;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  DECK: 'studyflash_deck',
  FSRS_DATA: 'studyflash_fsrs',
  PROPOSED_CARDS: 'studyflash_proposed',
  REFLECTIONS: 'studyflash_reflections',
  SCHEMA_VERSION: 'studyflash_schema_version',
} as const;

/**
 * Card generation limits
 */
export const LIMITS = {
  MAX_INPUT_LENGTH: 16000, // characters
  MAX_CARDS_PER_GENERATION: 50,
  MAX_DECK_SIZE_FREE: 100, // cards per deck for free tier
  MAX_DECKS_FREE: 3,
  MAX_AI_QUESTIONS_PER_WEEK_FREE: 10,
} as const;

/**
 * FSRS constants
 */
export const FSRS_CONSTANTS = {
  MIN_DIFFICULTY: 1.3,
  MAX_DIFFICULTY: 3.0,
  DIFFICULTY_ADJUSTMENT_STEP: 0.1,
} as const;

/**
 * Study session constants
 */
export const STUDY_CONSTANTS = {
  DEFAULT_SESSION_SIZE: 20,
  ESTIMATED_SECONDS_PER_CARD: 30,
  MAX_NEW_CARDS_PER_SESSION: 20,
} as const;

/**
 * Rate limiting constants (client-side estimation)
 */
export const RATE_LIMITS = {
  AI_COMPANION_PER_MINUTE: 3,
  REFLECTION_PER_HOUR: 5,
} as const;

/**
 * Bloom taxonomy levels
 */
export const BLOOM_LEVELS = [
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create',
] as const;

/**
 * Card types
 */
export const CARD_TYPES = [
  'Définition',
  'Procédure',
  'Fait',
  'Concept',
  'Example',
] as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate configuration on app load
 * @throws Error if required env vars are missing
 */
export function validateConfig(): void {
  if (!SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL is required');
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error('VITE_SUPABASE_ANON_KEY is required');
  }
  if (!SUPABASE_FUNCTION_URL) {
    console.warn('VITE_SUPABASE_FUNCTION_URL not set, edge functions may not work');
  }
}

/**
 * Get feature flag status
 */
export function getFeatureFlags() {
  return {
    companion: ENABLE_COMPANION,
    goalPlanner: ENABLE_GOAL_PLANNER,
    reflection: ENABLE_REFLECTION,
    adaptiveDifficulty: ENABLE_ADAPTIVE_DIFFICULTY,
    clusters: ENABLE_CLUSTERS,
  };
}

/**
 * Log configuration (safe for production - no secrets)
 */
export function logConfig(): void {
  if (DEBUG_MODE) {
    console.group('[CONFIG] Application Configuration');
    console.log('Schema Version:', LOCAL_STORAGE_SCHEMA_VERSION);
    console.log('Debug Mode:', DEBUG_MODE);
    console.log('Feature Flags:', getFeatureFlags());
    console.log('Supabase URL:', SUPABASE_URL ? '✓ Set' : '✗ Missing');
    console.log('Function URL:', SUPABASE_FUNCTION_URL ? '✓ Set' : '✗ Missing');
    console.groupEnd();
  }
}
