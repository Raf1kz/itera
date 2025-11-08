import { FSRSCard } from './schemas';

type Rating = 1 | 2 | 3 | 4;

const FSRS_PARAMS = {
  requestRetention: 0.9,
  maximumInterval: 36500,
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61] as const
} as const;

function getParam(index: number): number {
  const value = FSRS_PARAMS.w[index];
  return value ?? 1;
}

export interface ScheduleInfo {
  card: FSRSCard;
  reviewLog: {
    rating: Rating;
    state: FSRSCard['state'];
    due: Date;
    stability: number;
    difficulty: number;
    elapsedDays: number;
    scheduledDays: number;
    review: Date;
  };
}

export function repeatCard(card: FSRSCard, rating: Rating, now: Date = new Date()): ScheduleInfo {
  const newCard = { ...card };

  if (newCard.state === 'new') {
    initCard(newCard, rating);
  } else {
    const elapsedDays = newCard.lastReview
      ? Math.max(0, (now.getTime() - newCard.lastReview.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    newCard.elapsedDays = elapsedDays;
    newCard.difficulty = nextDifficulty(newCard.difficulty, rating);
    newCard.stability = nextStability(newCard.difficulty, newCard.stability, elapsedDays, rating, newCard.state);

    if (rating === 1) {
      newCard.state = 'relearning';
      newCard.lapses += 1;
    } else {
      newCard.state = 'review';
    }

    newCard.reps += 1;
  }

  const interval = nextInterval(newCard.stability);
  newCard.scheduledDays = interval;
  newCard.lastReview = now;
  newCard.due = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  const reviewLog = {
    rating,
    state: newCard.state,
    due: newCard.due,
    stability: newCard.stability,
    difficulty: newCard.difficulty,
    elapsedDays: newCard.elapsedDays,
    scheduledDays: newCard.scheduledDays,
    review: now
  };

  return {
    card: newCard,
    reviewLog
  };
}

function initCard(card: FSRSCard, rating: Rating) {
  card.difficulty = initDifficulty(rating);
  card.stability = initStability(rating);
  card.elapsedDays = 0;
  card.reps = 1;

  if (rating === 1) {
    card.state = 'relearning';
    card.lapses = 1;
  } else {
    card.state = 'learning';
  }
}

function initDifficulty(rating: Rating): number {
  return Math.max(1, Math.min(10, getParam(4) - getParam(5) * (rating - 3)));
}

function initStability(rating: Rating): number {
  return Math.max(0.1, getParam(rating - 1));
}

function nextDifficulty(currentDifficulty: number, rating: Rating): number {
  const deltaD = -getParam(6) * (rating - 3);
  const nextD = currentDifficulty + deltaD;
  return Math.max(1, Math.min(10, meanReversion(getParam(4), nextD)));
}

function meanReversion(init: number, current: number): number {
  const weight = getParam(7);
  return weight * init + (1 - weight) * current;
}

function nextStability(
  difficulty: number,
  stability: number,
  elapsedDays: number,
  rating: Rating,
  state: FSRSCard['state']
): number {
  const hardPenalty = rating === 2 ? getParam(15) : 1;
  const easyBonus = rating === 4 ? getParam(16) : 1;

  if (state === 'relearning' || rating === 1) {
    return Math.max(
      0.1,
      getParam(11) * Math.pow(difficulty, -getParam(12)) *
      (Math.pow(stability + 1, getParam(13)) - 1) *
      Math.exp(getParam(14) * (1 - retrievability(elapsedDays, stability)))
    );
  }

  const retrievabilityAtReview = retrievability(elapsedDays, stability);

  return Math.max(
    0.1,
    stability *
    (1 +
      Math.exp(getParam(8)) *
      (11 - difficulty) *
      Math.pow(stability, -getParam(9)) *
      (Math.exp(getParam(10) * (1 - retrievabilityAtReview)) - 1) *
      hardPenalty *
      easyBonus
    )
  );
}

function retrievability(elapsedDays: number, stability: number): number {
  // Prevent division by zero
  if (stability <= 0) {
    console.warn('[FSRS] Invalid stability value:', stability, '- using default 1');
    stability = 1;
  }
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

function nextInterval(stability: number): number {
  const param16 = getParam(16);
  const param17 = getParam(17);

  // Prevent division by zero or invalid params
  if (param16 <= 0 || param17 <= 0) {
    console.warn('[FSRS] Invalid parameters for interval calculation:', { param16, param17 }, '- using fallback 1-day interval');
    return 1;
  }

  const interval = Math.round(
    (stability / param17) *
    (Math.pow(FSRS_PARAMS.requestRetention, 1 / param16) - 1)
  );

  // Validate computed interval is finite
  if (!Number.isFinite(interval) || interval < 0) {
    console.warn('[FSRS] Computed invalid interval:', interval, '- using fallback 1-day interval');
    return 1;
  }

  return Math.max(1, Math.min(FSRS_PARAMS.maximumInterval, interval));
}

export function getDueCards(cards: FSRSCard[], now: Date = new Date()): FSRSCard[] {
  return cards.filter(card => {
    if (!card.due) return true;
    return card.due.getTime() <= now.getTime();
  });
}

export function getCardsByState(cards: FSRSCard[]): {
  new: FSRSCard[];
  learning: FSRSCard[];
  review: FSRSCard[];
  relearning: FSRSCard[];
} {
  return {
    new: cards.filter(c => c.state === 'new'),
    learning: cards.filter(c => c.state === 'learning'),
    review: cards.filter(c => c.state === 'review'),
    relearning: cards.filter(c => c.state === 'relearning')
  };
}

export function createFSRSCard(cardId: string): FSRSCard {
  const now = new Date();
  return {
    id: cardId,
    stability: 0,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
    lastReview: now,
    due: now
  };
}
