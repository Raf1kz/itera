/**
 * Daily Goal Planner - Smart study session scheduling
 * Analyzes deck state and recommends optimal study plans
 */

import { CardExtended } from '../schemas';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface StudyPlan {
  /**
   * Total estimated study time in minutes
   */
  estimatedMinutes: number;

  /**
   * Number of new cards to study
   */
  newCards: number;

  /**
   * Number of review cards to study
   */
  reviewCards: number;

  /**
   * Number of relearning cards (lapses)
   */
  relearningCards: number;

  /**
   * Recommended cards to study (ordered by priority)
   */
  cards: CardExtended[];

  /**
   * Breakdown by urgency
   */
  breakdown: {
    overdue: number;
    dueToday: number;
    dueSoon: number;
    new: number;
  };
}

export interface PlannerOptions {
  /**
   * Available study time in minutes
   */
  availableMinutes: number;

  /**
   * Maximum new cards per session (default: 20)
   */
  maxNewCards?: number;

  /**
   * Average time per card in seconds (default: 30)
   */
  avgSecondsPerCard?: number;

  /**
   * Current date (for testing)
   */
  currentDate?: Date;
}

// ============================================================================
// CARD FILTERING & ANALYSIS
// ============================================================================

/**
 * Categorize cards by review status
 */
export function categorizeCards(
  cards: CardExtended[],
  currentDate = new Date()
): {
  overdue: CardExtended[];
  dueToday: CardExtended[];
  dueSoon: CardExtended[];
  new: CardExtended[];
  learning: CardExtended[];
  relearning: CardExtended[];
} {
  const now = currentDate.getTime();
  const todayEnd = new Date(currentDate);
  todayEnd.setHours(23, 59, 59, 999);
  const todayEndTime = todayEnd.getTime();

  const threeDaysFromNow = new Date(currentDate);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const threeDaysTime = threeDaysFromNow.getTime();

  const overdue: CardExtended[] = [];
  const dueToday: CardExtended[] = [];
  const dueSoon: CardExtended[] = [];
  const newCards: CardExtended[] = [];
  const learning: CardExtended[] = [];
  const relearning: CardExtended[] = [];

  for (const card of cards) {
    // New cards
    if (card.state === 'new') {
      newCards.push(card);
      continue;
    }

    // Learning/Relearning cards
    if (card.state === 'learning') {
      learning.push(card);
      continue;
    }

    if (card.state === 'relearning') {
      relearning.push(card);
      continue;
    }

    // Review cards - check due date
    const dueDate = card.due ? new Date(card.due).getTime() : now;

    if (dueDate < now) {
      overdue.push(card);
    } else if (dueDate <= todayEndTime) {
      dueToday.push(card);
    } else if (dueDate <= threeDaysTime) {
      dueSoon.push(card);
    }
  }

  return {
    overdue,
    dueToday,
    dueSoon,
    new: newCards,
    learning,
    relearning
  };
}

/**
 * Calculate urgency score for a card (higher = more urgent)
 */
export function calculateUrgency(card: CardExtended, currentDate = new Date()): number {
  const now = currentDate.getTime();

  // New cards have base urgency
  if (card.state === 'new') {
    return 1;
  }

  // Learning/Relearning cards are very urgent
  if (card.state === 'learning') {
    return 100;
  }

  if (card.state === 'relearning') {
    return 90;
  }

  // Review cards - urgency based on how overdue
  const dueDate = card.due ? new Date(card.due).getTime() : now;
  const daysOverdue = (now - dueDate) / (1000 * 60 * 60 * 24);

  if (daysOverdue > 0) {
    // Overdue: urgency increases with days overdue
    return 50 + Math.min(daysOverdue * 5, 40); // Max 90
  } else {
    // Due soon: urgency decreases as due date gets further away
    const daysUntilDue = Math.abs(daysOverdue);
    return Math.max(10, 50 - daysUntilDue * 5); // Min 10
  }
}

/**
 * Calculate priority score combining urgency and difficulty
 * Higher score = higher priority
 */
export function calculatePriority(card: CardExtended, currentDate = new Date()): number {
  const urgency = calculateUrgency(card, currentDate);

  // Difficulty factor (harder cards get slight priority boost)
  const difficultyBoost = card.difficulty * 0.5;

  // Low stability cards need more attention
  const stabilityPenalty = card.stability > 30 ? -5 : 0;

  return urgency + difficultyBoost + stabilityPenalty;
}

// ============================================================================
// STUDY PLAN GENERATION
// ============================================================================

/**
 * Generate an optimal study plan based on available time
 */
export function generateStudyPlan(
  cards: CardExtended[],
  options: PlannerOptions
): StudyPlan {
  const {
    availableMinutes,
    maxNewCards = 20,
    avgSecondsPerCard = 30,
    currentDate = new Date()
  } = options;

  // Calculate how many cards can fit in available time
  const maxCards = Math.floor((availableMinutes * 60) / avgSecondsPerCard);

  // Categorize all cards
  const categorized = categorizeCards(cards, currentDate);

  // Priority order: learning/relearning > overdue > due today > new > due soon
  const prioritizedCards: CardExtended[] = [
    ...categorized.learning,
    ...categorized.relearning,
    ...categorized.overdue,
    ...categorized.dueToday
  ];

  // Sort by priority score
  prioritizedCards.sort((a, b) =>
    calculatePriority(b, currentDate) - calculatePriority(a, currentDate)
  );

  // Add new cards (limited by maxNewCards)
  const newCardsToAdd = categorized.new.slice(0, maxNewCards);

  // Combine: prioritized reviews + new cards
  const allCandidates = [...prioritizedCards, ...newCardsToAdd];

  // Select cards that fit within time budget
  const selectedCards = allCandidates.slice(0, maxCards);

  // Calculate breakdown
  const breakdown = {
    overdue: selectedCards.filter(c =>
      categorized.overdue.includes(c)
    ).length,
    dueToday: selectedCards.filter(c =>
      categorized.dueToday.includes(c)
    ).length,
    dueSoon: selectedCards.filter(c =>
      categorized.dueSoon.includes(c)
    ).length,
    new: selectedCards.filter(c => c.state === 'new').length
  };

  // Count by card state
  const newCount = selectedCards.filter(c => c.state === 'new').length;
  const reviewCount = selectedCards.filter(c =>
    c.state === 'review'
  ).length;
  const relearningCount = selectedCards.filter(c =>
    c.state === 'relearning' || c.state === 'learning'
  ).length;

  // Estimate actual study time
  const estimatedMinutes = Math.ceil((selectedCards.length * avgSecondsPerCard) / 60);

  return {
    estimatedMinutes,
    newCards: newCount,
    reviewCards: reviewCount,
    relearningCards: relearningCount,
    cards: selectedCards,
    breakdown
  };
}

/**
 * Get study statistics for the entire deck
 */
export function getDeckStats(
  cards: CardExtended[],
  currentDate = new Date()
): {
  total: number;
  new: number;
  learning: number;
  review: number;
  overdue: number;
  dueToday: number;
  dueSoon: number;
  avgDifficulty: number;
  avgStability: number;
} {
  const categorized = categorizeCards(cards, currentDate);

  const reviewCards = cards.filter(c => c.state === 'review');
  const avgDifficulty = reviewCards.length > 0
    ? reviewCards.reduce((sum, c) => sum + c.difficulty, 0) / reviewCards.length
    : 0;

  const avgStability = reviewCards.length > 0
    ? reviewCards.reduce((sum, c) => sum + c.stability, 0) / reviewCards.length
    : 0;

  return {
    total: cards.length,
    new: categorized.new.length,
    learning: categorized.learning.length + categorized.relearning.length,
    review: reviewCards.length,
    overdue: categorized.overdue.length,
    dueToday: categorized.dueToday.length,
    dueSoon: categorized.dueSoon.length,
    avgDifficulty: Math.round(avgDifficulty * 10) / 10,
    avgStability: Math.round(avgStability * 10) / 10
  };
}

/**
 * Suggest optimal study time based on deck state
 */
export function suggestStudyTime(
  cards: CardExtended[],
  currentDate = new Date()
): {
  recommended: number; // minutes
  minimum: number; // minutes
  reason: string;
} {
  const categorized = categorizeCards(cards, currentDate);
  const avgSecondsPerCard = 30;

  // Calculate urgent cards (learning + relearning + overdue)
  const urgentCount =
    categorized.learning.length +
    categorized.relearning.length +
    categorized.overdue.length;

  // Calculate total due today
  const dueTodayCount = urgentCount + categorized.dueToday.length;

  if (urgentCount === 0 && dueTodayCount === 0 && categorized.new.length === 0) {
    return {
      recommended: 0,
      minimum: 0,
      reason: 'No cards due today. Take a break!'
    };
  }

  // Minimum: cover urgent cards
  const minimumMinutes = Math.ceil((urgentCount * avgSecondsPerCard) / 60);

  // Recommended: urgent + due today + some new cards
  const newCardsTarget = Math.min(10, categorized.new.length);
  const recommendedCount = dueTodayCount + newCardsTarget;
  const recommendedMinutes = Math.ceil((recommendedCount * avgSecondsPerCard) / 60);

  let reason = '';
  if (urgentCount > 0) {
    reason = `${urgentCount} urgent card${urgentCount !== 1 ? 's' : ''} need attention`;
  } else if (dueTodayCount > 0) {
    reason = `${dueTodayCount} card${dueTodayCount !== 1 ? 's are' : ' is'} due today`;
  } else {
    reason = `Start with ${newCardsTarget} new cards`;
  }

  return {
    recommended: recommendedMinutes,
    minimum: minimumMinutes,
    reason
  };
}
