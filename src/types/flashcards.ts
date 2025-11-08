import type { BloomLevel } from '../schemas';

/**
 * Card data used throughout the client application
 * (separate from FSRS scheduling metadata)
 */
export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  type: string;
  hint: string;
  category: string;
  difficulty?: number;
  bloom?: string;
  bloom_level?: BloomLevel;
  tags: string[];
  source?: {
    section: string;
    hash: string;
  };
  sourceSpan?: {
    section: string;
    start: number;
    end: number;
  };
  sourceHash?: string;
  sourceContext?: string;
  clusterId?: string;
}
