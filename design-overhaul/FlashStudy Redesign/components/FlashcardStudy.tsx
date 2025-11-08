import { useState } from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { ArrowLeft, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

const MOCK_CARDS: Record<string, Flashcard[]> = {
  '1': [
    { id: '1-1', front: 'Hello', back: 'Hola' },
    { id: '1-2', front: 'Goodbye', back: 'Adiós' },
    { id: '1-3', front: 'Thank you', back: 'Gracias' },
    { id: '1-4', front: 'Please', back: 'Por favor' },
    { id: '1-5', front: 'Good morning', back: 'Buenos días' },
  ],
  '2': [
    { id: '2-1', front: 'What is useState?', back: 'A React Hook that lets you add state to functional components' },
    { id: '2-2', front: 'What is useEffect?', back: 'A Hook that lets you perform side effects in functional components' },
    { id: '2-3', front: 'What is JSX?', back: 'JavaScript XML - a syntax extension that lets you write HTML-like code in JavaScript' },
    { id: '2-4', front: 'What are props?', back: 'Short for properties - a way to pass data from parent to child components' },
    { id: '2-5', front: 'What is the Virtual DOM?', back: 'A lightweight copy of the actual DOM that React uses to optimize updates' },
  ],
  '3': [
    { id: '3-1', front: 'France', back: 'Paris' },
    { id: '3-2', front: 'Japan', back: 'Tokyo' },
    { id: '3-3', front: 'Brazil', back: 'Brasília' },
    { id: '3-4', front: 'Australia', back: 'Canberra' },
    { id: '3-5', front: 'Egypt', back: 'Cairo' },
  ],
  '4': [
    { id: '4-1', front: 'Mitochondria', back: 'The powerhouse of the cell - produces ATP through cellular respiration' },
    { id: '4-2', front: 'Photosynthesis', back: 'Process by which plants convert light energy into chemical energy' },
    { id: '4-3', front: 'DNA', back: 'Deoxyribonucleic acid - carries genetic information' },
    { id: '4-4', front: 'Enzyme', back: 'A biological catalyst that speeds up chemical reactions' },
    { id: '4-5', front: 'Cell Membrane', back: 'Semi-permeable barrier that controls what enters and exits the cell' },
  ],
};

interface FlashcardStudyProps {
  deckId: string;
  onBack: () => void;
}

export function FlashcardStudy({ deckId, onBack }: FlashcardStudyProps) {
  const cards = MOCK_CARDS[deckId] || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    const randomIndex = Math.floor(Math.random() * cards.length);
    setCurrentIndex(randomIndex);
    setIsFlipped(false);
  };

  if (!currentCard) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600">No cards available for this deck.</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Decks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Decks
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Card {currentIndex + 1} of {cards.length}
            </span>
            <Button variant="outline" size="sm" onClick={handleShuffle}>
              <Shuffle className="w-4 h-4 mr-2" />
              Shuffle
            </Button>
          </div>
          <Progress value={progress} />
        </div>

        <div className="mb-8">
          <div
            className="relative h-96 cursor-pointer perspective-1000"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <Card
              className={`absolute inset-0 flex items-center justify-center p-8 transition-all duration-500 transform ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">
                  {isFlipped ? 'Answer' : 'Question'}
                </p>
                <p className="text-gray-900">
                  {isFlipped ? currentCard.back : currentCard.front}
                </p>
                <p className="text-sm text-gray-400 mt-8">
                  Click to flip
                </p>
              </div>
            </Card>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
