import { useState } from 'react';
import { motion } from 'motion/react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  card_type?: 'qa' | 'cloze' | 'mcq';
  card_data?: {
    answer?: string;
    options?: string[];
    correct?: number;
  };
}

interface FlashcardCardProps {
  flashcard: Flashcard;
}

export function FlashcardCard({ flashcard }: FlashcardCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const cardType = flashcard.card_type || 'qa';

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleOptionClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFlipped) {
      setSelectedOption(index);
    }
  };

  // Render MCQ card
  if (cardType === 'mcq' && flashcard.card_data?.options) {
    return (
      <div className="h-[400px]">
        <div className="relative w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl shadow-2xl p-8">
          <p className="text-sm text-violet-200 mb-4 uppercase tracking-wide text-center">Multiple Choice</p>
          <p className="text-white text-xl mb-6 text-center">{flashcard.front}</p>

          <div className="space-y-3">
            {flashcard.card_data.options.map((option, index) => {
              const isCorrect = index === flashcard.card_data?.correct;
              const isSelected = index === selectedOption;
              const showResult = isFlipped;

              return (
                <button
                  key={index}
                  onClick={(e) => handleOptionClick(index, e)}
                  className={`
                    w-full p-4 rounded-xl text-left transition-all
                    ${!showResult && !isSelected ? 'bg-white/10 hover:bg-white/20' : ''}
                    ${!showResult && isSelected ? 'bg-white/30 ring-2 ring-white' : ''}
                    ${showResult && isCorrect ? 'bg-green-500 ring-2 ring-green-300' : ''}
                    ${showResult && isSelected && !isCorrect ? 'bg-red-500 ring-2 ring-red-300' : ''}
                    ${showResult && !isSelected && !isCorrect ? 'bg-white/10' : ''}
                  `}
                >
                  <span className="text-white font-medium">{option}</span>
                  {showResult && isCorrect && <span className="ml-2 text-white">✓</span>}
                  {showResult && isSelected && !isCorrect && <span className="ml-2 text-white">✗</span>}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleFlip}
            className="mt-6 w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors"
          >
            {isFlipped ? 'Hide Answer' : 'Show Answer'}
          </button>
        </div>
      </div>
    );
  }

  // Render Cloze card
  if (cardType === 'cloze') {
    const displayText = isFlipped
      ? flashcard.back
      : flashcard.front;

    return (
      <div className="h-[400px]">
        <motion.div
          className="relative w-full h-full cursor-pointer bg-gradient-to-br from-blue-500 to-cyan-600 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center text-center"
          onClick={handleFlip}
        >
          <p className="text-sm text-blue-200 mb-4 uppercase tracking-wide">
            {isFlipped ? 'Complete Statement' : 'Fill in the Blank'}
          </p>
          <p className="text-white text-2xl whitespace-pre-wrap">{displayText}</p>
          <p className="text-blue-200 text-sm mt-8">
            {isFlipped ? 'Click to hide answer' : 'Click to reveal answer'}
          </p>
        </motion.div>
      </div>
    );
  }

  // Render default Q&A card
  return (
    <div className="perspective-1000 h-[400px]">
      <motion.div
        className="relative w-full h-full cursor-pointer"
        onClick={handleFlip}
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center text-center"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <p className="text-sm text-violet-200 mb-4 uppercase tracking-wide">Question</p>
          <p className="text-white text-2xl">{flashcard.front}</p>
          <p className="text-violet-200 text-sm mt-8">Click to reveal answer</p>
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center text-center"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <p className="text-sm text-pink-200 mb-4 uppercase tracking-wide">Answer</p>
          <p className="text-white text-2xl">{flashcard.back}</p>
          <p className="text-pink-200 text-sm mt-8">Click to see question</p>
        </div>
      </motion.div>
    </div>
  );
}
