export type ViewType = 
  | 'generate' 
  | 'decks' 
  | 'flashcard-study' 
  | 'study' 
  | 'summaries' 
  | 'summary-detail' 
  | 'review'
  | 'notebook'
  | 'concept-graph';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  linkedNotes?: string[]; // IDs of linked notes
  keywords?: string[];
}

export interface Deck {
  id: string;
  title: string;
  subject: string;
  flashcards: Flashcard[];
  createdAt: string;
  lastStudied?: string;
  masteryLevel: number;
}

export interface Summary {
  id: string;
  title: string;
  subject: string;
  content: string;
  createdAt: string;
  wordCount: number;
}

export interface Note {
  id: string;
  title: string;
  content: string; // Markdown content
  subject: string;
  linkedFlashcards?: string[]; // IDs of linked flashcards
  linkedNotes?: string[]; // IDs of other linked notes
  keywords?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ConceptNode {
  id: string;
  label: string;
  type: 'flashcard' | 'note' | 'summary' | 'keyword';
  subject: string;
  connections: string[]; // IDs of connected nodes
}

export interface UserProgress {
  streak: number;
  longestStreak: number;
  xp: number;
  level: number;
  lastStudyDate: string;
  unlockedThemes: string[];
  challenges: Challenge[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  reward: {
    xp: number;
    type: 'theme' | 'badge' | 'xp';
    value?: string;
  };
}

export interface GeneratedContent {
  flashcards: Flashcard[];
  summary: string;
  title: string;
  subject: string;
}
