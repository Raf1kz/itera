import { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Check } from 'lucide-react';
import { Button } from './ui/button';
import { FlashcardCard } from './FlashcardCard';
import { Progress } from './ui/progress';

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface FlashcardDeckProps {
  flashcards: Flashcard[];
}

export function FlashcardDeck({ flashcards }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set());

  if (flashcards.length === 0) {
    return null;
  }

  const currentCard = flashcards[currentIndex]!;
  const progress = ((currentIndex + 1) / flashcards.length) * 100;
  const masteredCount = masteredCards.size;

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleMastered = () => {
    const newMastered = new Set(masteredCards);
    if (masteredCards.has(currentCard.id)) {
      newMastered.delete(currentCard.id);
    } else {
      newMastered.add(currentCard.id);
    }
    setMasteredCards(newMastered);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setMasteredCards(new Set());
  };

  const isMastered = masteredCards.has(currentCard.id);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">
            Card {currentIndex + 1} of {flashcards.length}
          </span>
          <span className="text-sm text-gray-600">
            {masteredCount} mastered
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Flashcard */}
      <FlashcardCard flashcard={currentCard} />

      {/* Controls */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
        <div className="flex items-center justify-between gap-4">
          <Button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous
          </Button>

          <Button
            onClick={handleMastered}
            variant={isMastered ? "default" : "outline"}
            size="lg"
            className={isMastered ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <Check className="w-5 h-5" />
          </Button>

          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>

          <Button
            onClick={handleNext}
            disabled={currentIndex === flashcards.length - 1}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            Next
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
