import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { BookOpen, Plus } from 'lucide-react';

interface Deck {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  category: string;
}

const MOCK_DECKS: Deck[] = [
  {
    id: '1',
    title: 'Spanish Vocabulary',
    description: 'Common Spanish words and phrases for beginners',
    cardCount: 50,
    category: 'Languages',
  },
  {
    id: '2',
    title: 'React Fundamentals',
    description: 'Core concepts and hooks in React',
    cardCount: 30,
    category: 'Programming',
  },
  {
    id: '3',
    title: 'World Capitals',
    description: 'Capital cities of countries around the world',
    cardCount: 75,
    category: 'Geography',
  },
  {
    id: '4',
    title: 'Biology Terms',
    description: 'Essential biology vocabulary and definitions',
    cardCount: 40,
    category: 'Science',
  },
];

interface DecksViewProps {
  onStudyDeck: (deckId: string) => void;
}

export function DecksView({ onStudyDeck }: DecksViewProps) {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-gray-900 mb-2">My Decks</h1>
            <p className="text-gray-600">Select a deck to start studying</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Deck
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_DECKS.map((deck) => (
            <Card key={deck.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                  </div>
                  <Badge variant="secondary">{deck.category}</Badge>
                </div>
                <CardTitle>{deck.title}</CardTitle>
                <CardDescription>{deck.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {deck.cardCount} cards
                  </span>
                  <Button onClick={() => onStudyDeck(deck.id)}>
                    Study
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
