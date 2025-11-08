/**
 * Cognitive analytics and metrics computation
 * Pure functions for analyzing learning performance
 */

import { CardExtended, FSRSCard } from '../schemas';
import type { Flashcard } from '../types/flashcards';

type BloomDistributionKey =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create'
  | 'untagged';

// ============================================================================
// RETENTION METRICS
// ============================================================================

/**
 * Compute retrievability for a single card based on FSRS algorithm
 *
 * @param card Card to analyze
 * @param now Current time (default: now)
 * @returns Retrievability score (0-1)
 */
export function computeRetrievability(
  card: CardExtended | FSRSCard,
  now: Date = new Date()
): number {
  const { stability, lastReview } = card;

  if (!lastReview || stability === 0) {
    return card.state === 'new' ? 1 : 0;
  }

  // Convert lastReview to Date if it's a string
  const lastReviewDate = lastReview instanceof Date ? lastReview : new Date(lastReview);

  // Calculate actual elapsed days
  const actualElapsed = (now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24);

  // FSRS retrievability formula: R = (1 + t/(9*S))^-1
  // where t = elapsed days, S = stability
  return Math.pow(1 + actualElapsed / (9 * stability), -1);
}

/**
 * Calculate retention rate across a deck of cards
 *
 * @param cards Array of cards to analyze
 * @param now Current time
 * @returns Average retention rate (0-1)
 */
export function retentionRate(
  cards: (CardExtended | FSRSCard)[],
  now: Date = new Date()
): number {
  if (cards.length === 0) return 0;

  const totalRetrievability = cards.reduce((sum, card) => {
    return sum + computeRetrievability(card, now);
  }, 0);

  return totalRetrievability / cards.length;
}

/**
 * Calculate retention rate by card state
 *
 * @param cards Array of cards
 * @param now Current time
 * @returns Retention rates by state
 */
export function retentionRateByState(
  cards: (CardExtended | FSRSCard)[],
  now: Date = new Date()
): Record<string, number> {
  const grouped = groupCardsByState(cards);

  return {
    new: retentionRate(grouped.new, now),
    learning: retentionRate(grouped.learning, now),
    review: retentionRate(grouped.review, now),
    relearning: retentionRate(grouped.relearning, now)
  };
}

// ============================================================================
// STABILITY METRICS
// ============================================================================

/**
 * Calculate average stability across all cards
 *
 * @param cards Array of cards
 * @returns Average stability (days)
 */
export function averageStability(cards: (CardExtended | FSRSCard)[]): number {
  if (cards.length === 0) return 0;

  const totalStability = cards.reduce((sum, card) => sum + card.stability, 0);
  return totalStability / cards.length;
}

/**
 * Calculate stability statistics
 *
 * @param cards Array of cards
 * @returns Stability stats (min, max, avg, median)
 */
export function stabilityStats(
  cards: (CardExtended | FSRSCard)[]
): {
  min: number;
  max: number;
  average: number;
  median: number;
} {
  if (cards.length === 0) {
    return { min: 0, max: 0, average: 0, median: 0 };
  }

  const stabilities = cards.map(c => c.stability).sort((a, b) => a - b);

  const min = stabilities[0] ?? 0;
  const max = stabilities[stabilities.length - 1] ?? 0;
  const average = averageStability(cards);
  const median =
    stabilities.length % 2 === 0
      ? ((stabilities[stabilities.length / 2 - 1] ?? 0) + (stabilities[stabilities.length / 2] ?? 0)) / 2
      : stabilities[Math.floor(stabilities.length / 2)] ?? 0;

  return { min, max, average, median };
}

// ============================================================================
// RECALL FORECAST
// ============================================================================

export interface RecallForecast {
  today: number;
  tomorrow: number;
  nextWeek: number;
  nextMonth: number;
  overall: number;
}

/**
 * Forecast recall probability for different time horizons
 *
 * @param deck Array of all cards
 * @param fsrsData Map of card ID to FSRS data
 * @param now Current time
 * @returns Forecast object with recall probabilities
 */
export function recallForecast(
  deck: any[],
  fsrsData: Map<string, FSRSCard>,
  now: Date = new Date()
): RecallForecast {
  const cards = deck
    .map(d => fsrsData.get(d.id))
    .filter((c): c is FSRSCard => c !== undefined);

  if (cards.length === 0) {
    return { today: 0, tomorrow: 0, nextWeek: 0, nextMonth: 0, overall: 0 };
  }

  const oneDay = 24 * 60 * 60 * 1000;

  const todayDate = now;
  const tomorrowDate = new Date(now.getTime() + oneDay);
  const weekDate = new Date(now.getTime() + 7 * oneDay);
  const monthDate = new Date(now.getTime() + 30 * oneDay);

  return {
    today: retentionRate(cards, todayDate),
    tomorrow: retentionRate(cards, tomorrowDate),
    nextWeek: retentionRate(cards, weekDate),
    nextMonth: retentionRate(cards, monthDate),
    overall: retentionRate(cards, now)
  };
}

// ============================================================================
// DIFFICULTY ANALYSIS
// ============================================================================

/**
 * Calculate average difficulty across cards
 *
 * @param cards Array of cards
 * @returns Average difficulty (1-10 FSRS scale)
 */
export function averageDifficulty(cards: (CardExtended | FSRSCard)[]): number {
  if (cards.length === 0) return 0;

  const totalDifficulty = cards.reduce((sum, card) => sum + card.difficulty, 0);
  return totalDifficulty / cards.length;
}

/**
 * Group cards by difficulty range
 *
 * @param cards Array of cards
 * @returns Cards grouped by difficulty (easy, medium, hard)
 */
export function cardsByDifficultyRange(
  cards: (CardExtended | FSRSCard)[]
): {
  easy: (CardExtended | FSRSCard)[];
  medium: (CardExtended | FSRSCard)[];
  hard: (CardExtended | FSRSCard)[];
} {
  return {
    easy: cards.filter(c => c.difficulty <= 3.5),
    medium: cards.filter(c => c.difficulty > 3.5 && c.difficulty <= 6.5),
    hard: cards.filter(c => c.difficulty > 6.5)
  };
}

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

/**
 * Calculate success rate based on lapses
 *
 * @param cards Array of cards
 * @returns Success rate (0-1)
 */
export function successRate(cards: (CardExtended | FSRSCard)[]): number {
  if (cards.length === 0) return 0;

  const reviewedCards = cards.filter(c => c.reps > 0);
  if (reviewedCards.length === 0) return 0;

  const totalReps = reviewedCards.reduce((sum, card) => sum + card.reps, 0);
  const totalLapses = reviewedCards.reduce((sum, card) => sum + card.lapses, 0);

  if (totalReps === 0) return 0;

  return (totalReps - totalLapses) / totalReps;
}

/**
 * Calculate lapse rate (inverse of success rate)
 *
 * @param cards Array of cards
 * @returns Lapse rate (0-1)
 */
export function lapseRate(cards: (CardExtended | FSRSCard)[]): number {
  return 1 - successRate(cards);
}

/**
 * Identify cards at risk of being forgotten
 * (low retrievability + upcoming due date)
 *
 * @param cards Array of cards
 * @param threshold Retrievability threshold (default: 0.7)
 * @param now Current time
 * @returns Cards at risk
 */
export function cardsAtRisk(
  cards: (CardExtended | FSRSCard)[],
  threshold = 0.7,
  now: Date = new Date()
): (CardExtended | FSRSCard)[] {
  return cards.filter(card => {
    const retrievability = computeRetrievability(card, now);
    if (!card.due) return false;

    const dueDate = card.due instanceof Date ? card.due : new Date(card.due);
    const isDueSoon = dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000;

    return retrievability < threshold && isDueSoon;
  });
}

// ============================================================================
// STUDY SESSION METRICS
// ============================================================================

export interface StudySessionMetrics {
  cardsStudied: number;
  averageRating: number;
  timeSpent: number; // minutes
  masteryGain: number; // change in average stability
  difficultCards: number;
}

/**
 * Compute metrics for a study session
 *
 * @param beforeCards Cards before session
 * @param afterCards Cards after session
 * @param sessionDuration Duration in minutes
 * @param ratings Map of card ID to rating
 * @returns Session metrics
 */
export function computeSessionMetrics(
  beforeCards: (CardExtended | FSRSCard)[],
  afterCards: (CardExtended | FSRSCard)[],
  sessionDuration: number,
  ratings: Map<string, number>
): StudySessionMetrics {
  const cardsStudied = ratings.size;

  const totalRating = Array.from(ratings.values()).reduce((sum, r) => sum + r, 0);
  const averageRating = cardsStudied > 0 ? totalRating / cardsStudied : 0;

  const beforeStability = averageStability(beforeCards);
  const afterStability = averageStability(afterCards);
  const masteryGain = afterStability - beforeStability;

  const difficultCards = Array.from(ratings.values()).filter(r => r === 1).length;

  return {
    cardsStudied,
    averageRating,
    timeSpent: sessionDuration,
    masteryGain,
    difficultCards
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function groupCardsByState(
  cards: (CardExtended | FSRSCard)[]
): Record<'new' | 'learning' | 'review' | 'relearning', (CardExtended | FSRSCard)[]> {
  return {
    new: cards.filter(c => c.state === 'new'),
    learning: cards.filter(c => c.state === 'learning'),
    review: cards.filter(c => c.state === 'review'),
    relearning: cards.filter(c => c.state === 'relearning')
  };
}

/**
 * Calculate mastery level (0-100) based on multiple factors
 *
 * @param card Card to analyze
 * @returns Mastery score (0-100)
 */
export function calculateMasteryScore(card: CardExtended | FSRSCard): number {
  const { stability, difficulty, reps, lapses, state } = card;

  // Base score from stability
  let score = Math.min(100, (stability / 100) * 100);

  // Adjust for difficulty (easier cards = higher mastery potential)
  score *= 1 - (difficulty - 1) / 18; // Normalize difficulty impact

  // Adjust for performance (reps vs lapses)
  if (reps > 0) {
    const performance = (reps - lapses) / reps;
    score *= performance;
  }

  // State bonus
  if (state === 'review') score *= 1.1;
  if (state === 'new') score *= 0.5;

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// ANALYTICS DASHBOARD METRICS
// ============================================================================

/**
 * Calculate retention rate grouped by card category
 *
 * @param deck Array of deck cards with category field
 * @param fsrsData Map of card ID to FSRS data
 * @param now Current time
 * @returns Record of category name to retention rate
 */
export function retentionRateByCategory(
  deck: Flashcard[],
  fsrsData: Map<string, FSRSCard>,
  now: Date = new Date()
): Record<string, number> {
  const grouped = new Map<string, FSRSCard[]>();

  for (const card of deck) {
    const fsrsCard = fsrsData.get(card.id);
    if (!fsrsCard) continue;

    const category = card.category || 'Uncategorized';
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(fsrsCard);
  }

  const result: Record<string, number> = {};
  for (const [category, cards] of grouped.entries()) {
    result[category] = retentionRate(cards, now);
  }

  return result;
}

/**
 * 7-day forecast with daily retention predictions
 *
 * @param deck Array of all cards
 * @param fsrsData Map of card ID to FSRS data
 * @param now Current time
 * @returns Array of daily retention rates for next 7 days
 */
export function forecast7d(
  deck: Flashcard[],
  fsrsData: Map<string, FSRSCard>,
  now: Date = new Date()
): Array<{ day: number; retention: number; date: Date }> {
  const cards = deck
    .map(d => fsrsData.get(d.id))
    .filter((c): c is FSRSCard => c !== undefined);

  if (cards.length === 0) {
    return Array.from({ length: 7 }, (_, i) => ({
      day: i,
      retention: 0,
      date: new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    }));
  }

  const oneDay = 24 * 60 * 60 * 1000;

  return Array.from({ length: 7 }, (_, i) => {
    const forecastDate = new Date(now.getTime() + i * oneDay);
    return {
      day: i,
      retention: retentionRate(cards, forecastDate),
      date: forecastDate
    };
  });
}

export interface StreakMetrics {
  currentStreak: number;
  longestStreak: number;
  totalDaysStudied: number;
  lastStudyDate: Date | null;
}

/**
 * Calculate study streak metrics
 *
 * @param cards Array of cards with lastReview dates
 * @returns Streak statistics
 */
export function streakMetrics(
  cards: (CardExtended | FSRSCard)[]
): StreakMetrics {
  const reviewDates = cards
    .map(card => {
      const lastReview = card.lastReview as Date | string | undefined;
      if (lastReview instanceof Date) {
        return lastReview;
      }
      if (typeof lastReview === 'string') {
        const parsed = new Date(lastReview);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
      }
      return undefined;
    })
    .filter((date): date is Date => date !== undefined)
    .map(date => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized.getTime();
    });

  if (reviewDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDaysStudied: 0,
      lastStudyDate: null
    };
  }

  const uniqueDays = Array.from(new Set(reviewDates)).sort((a, b) => a - b);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const totalDaysStudied = uniqueDays.length;
  const lastStudyTimestamp = uniqueDays[uniqueDays.length - 1] ?? todayTime;
  const lastStudyDate = new Date(lastStudyTimestamp);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Calculate current streak from today backwards
  const lastReviewTime = uniqueDays[uniqueDays.length - 1] ?? todayTime;
  const daysSinceLastReview = Math.floor((todayTime - lastReviewTime) / oneDayMs);

  if (daysSinceLastReview <= 1) {
    currentStreak = 1;
    for (let i = uniqueDays.length - 2; i >= 0; i--) {
      const nextDay = uniqueDays[i + 1];
      const currentDay = uniqueDays[i];
      if (nextDay === undefined || currentDay === undefined) {
        continue;
      }

      const gap = (nextDay - currentDay) / oneDayMs;
      if (gap === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  for (let i = 1; i < uniqueDays.length; i++) {
    const currentDay = uniqueDays[i];
    const previousDay = uniqueDays[i - 1];
    if (currentDay === undefined || previousDay === undefined) {
      continue;
    }

    const gap = (currentDay - previousDay) / oneDayMs;
    if (gap === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    currentStreak,
    longestStreak,
    totalDaysStudied,
    lastStudyDate
  };
}

// ============================================================================
// P1 FEATURE METRICS
// ============================================================================

/**
 * Calculate Bloom level distribution across deck
 * Returns histogram data for analytics visualization
 *
 * @param cards Array of extended cards with bloom_level
 * @returns Record mapping Bloom level to count
 */
export function bloomDistribution(
  cards: CardExtended[]
): Record<BloomDistributionKey, number> {
  const distribution: Record<BloomDistributionKey, number> = {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0,
    untagged: 0
  };

  for (const card of cards) {
    const level = card.bloom_level?.toLowerCase();
    switch (level) {
      case 'remember':
      case 'understand':
      case 'apply':
      case 'analyze':
      case 'evaluate':
      case 'create':
        distribution[level] += 1;
        break;
      default:
        distribution.untagged += 1;
        break;
    }
  }

  return distribution;
}

/**
 * Calculate cluster cohesion metric
 * Measures how semantically related cards are within each cluster
 *
 * NOTE: Currently returns stub data. Will be enhanced with:
 * - Embedding-based similarity scoring
 * - TF-IDF comparison
 * - Graph-based connectivity analysis
 *
 * @param clusters Array of concept clusters
 * @returns Average cohesion score (0-1), higher = more cohesive
 */
export function clusterCohesion(
  clusters: Array<{ id: string; cards: CardExtended[]; size: number }>
): number {
  if (clusters.length === 0) return 0;

  // Stub implementation - returns placeholder metric
  // In future: compute actual semantic similarity within clusters
  const avgClusterSize = clusters.reduce((sum, c) => sum + c.size, 0) / clusters.length;

  // Simple heuristic: larger clusters tend to be more cohesive
  // This is a placeholder until we add embedding-based analysis
  return Math.min(avgClusterSize / 10, 1.0);
}

/**
 * Calculate comprehensive study session diagnostics
 * Used for goal planner telemetry
 *
 * @param cards Selected cards for study session
 * @returns Diagnostic metrics for logging
 */
export function sessionDiagnostics(
  cards: CardExtended[]
): {
  selectedCardsCount: number;
  avgStability: number;
  avgDifficulty: number;
  bloomLevels: Record<string, number>;
  states: Record<string, number>;
} {
  const bloomLevels = bloomDistribution(cards);

  const states: Record<string, number> = {
    new: 0,
    learning: 0,
    review: 0,
    relearning: 0
  };

  let totalStability = 0;
  let totalDifficulty = 0;

  for (const card of cards) {
    totalStability += card.stability;
    totalDifficulty += card.difficulty;

    const state = card.state || 'new';
    const key = state as keyof typeof states;
    if (Object.prototype.hasOwnProperty.call(states, key)) {
      const current = states[key] ?? 0;
      states[key] = current + 1;
    }
  }

  return {
    selectedCardsCount: cards.length,
    avgStability: cards.length > 0 ? totalStability / cards.length : 0,
    avgDifficulty: cards.length > 0 ? totalDifficulty / cards.length : 0,
    bloomLevels,
    states
  };
}
