import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, X, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthenticatedSupabase } from '../hooks/useAuthenticatedSupabase';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { DeckCompletionModal } from './DeckCompletionModal';
import { useTranslation } from 'react-i18next';

interface FlashcardStudyProps {
  deckId: string;
  onBack: () => void;
}

interface Card {
  id: string;
  front: string;
  back: string;
}

export function FlashcardStudy({ deckId, onBack }: FlashcardStudyProps) {
  const { t } = useTranslation();
  const supabase = useAuthenticatedSupabase();
  const { isSignedIn } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [unknownCards, setUnknownCards] = useState<Set<string>>(new Set());
  const [showCompletion, setShowCompletion] = useState(false);
  const [studyStartTime] = useState(Date.now());

  // Fetch flashcards from Supabase
  const cardsQuery = useQuery<Card[]>({
    queryKey: ['cards', deckId, isSignedIn],
    enabled: Boolean(supabase && isSignedIn),
    queryFn: async () => {
      if (!supabase) return [];

      let query = supabase
        .from('cards')
        .select('id, front, back');

      // Filter by deck if not studying all cards
      if (deckId !== 'all') {
        query = query.eq('deck_name', deckId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cards:', error);
        throw error;
      }

      return data ?? [];
    },
  });

  const flashcards = cardsQuery.data ?? [];
  const loading = cardsQuery.isLoading;
  const currentCard = flashcards[currentIndex];
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;
  const isLastCard = currentIndex === flashcards.length - 1;

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
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

  // Calculate stats for completion modal
  const calculateStats = () => {
    const totalCards = flashcards.length;
    const knownCount = knownCards.size;
    const accuracy = totalCards > 0 ? Math.round((knownCount / totalCards) * 100) : 0;
    const timeSpent = Math.floor((Date.now() - studyStartTime) / 1000 / 60); // minutes

    return {
      totalCards,
      knownCards: knownCount,
      accuracy,
      timeSpent: timeSpent > 0 ? `${timeSpent} min` : '< 1 min',
    };
  };

  const handleCompletionClose = () => {
    setShowCompletion(false);
    // Smooth transition back to decks view
    setTimeout(() => {
      onBack();
    }, 200);
  };

  const handleKnown = () => {
    if (!currentCard) return;
    const newKnown = new Set(knownCards);
    newKnown.add(currentCard.id);
    setKnownCards(newKnown);

    const newUnknown = new Set(unknownCards);
    newUnknown.delete(currentCard.id);
    setUnknownCards(newUnknown);

    // Check if this is the last card
    if (isLastCard) {
      // Show completion modal after a short delay
      setTimeout(() => {
        setShowCompletion(true);
      }, 300);
    } else {
      handleNext();
    }
  };

  const handleUnknown = () => {
    if (!currentCard) return;
    const newUnknown = new Set(unknownCards);
    newUnknown.add(currentCard.id);
    setUnknownCards(newUnknown);

    const newKnown = new Set(knownCards);
    newKnown.delete(currentCard.id);
    setKnownCards(newKnown);

    // Check if this is the last card
    if (isLastCard) {
      // Show completion modal after a short delay
      setTimeout(() => {
        setShowCompletion(true);
      }, 300);
    } else {
      handleNext();
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setUnknownCards(new Set());
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setIsFlipped(!isFlipped);
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Enter' && isFlipped) {
        handleKnown();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, isFlipped, handlePrevious, handleNext, handleKnown]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-neutral-600 mb-4">{t('flashcardStudy.noCards')}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.backToDecks')}
        </Button>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-neutral-600 mb-4">{t('flashcardStudy.cardNotFound')}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.backToDecks')}
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto relative">
      {/* Premium background */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-neutral-100/30" />

      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)`,
        backgroundSize: '48px 48px'
      }} />

      {/* Ambient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-purple-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[600px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-8 py-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -2 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            onClick={onBack}
            variant="ghost"
            className="mb-10 -ml-3 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.backToDecks')}
          </Button>
        </motion.div>

        {/* Progress */}
        <motion.div
          className="mb-10 bg-white/80 backdrop-blur-xl rounded-3xl border border-neutral-200/60 p-6 shadow-lg"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-neutral-600">
                {t('flashcardStudy.card')} {currentIndex + 1} {t('flashcardStudy.of')} {flashcards.length}
              </span>
              {isLastCard && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs border border-emerald-200"
                >
                  🎯 {t('flashcardStudy.finalCard')}
                </motion.span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <span className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-emerald-200 shadow-sm text-sm sm:text-base">
                <Check className="w-4 h-4" />
                {knownCards.size} {t('flashcardStudy.known')}
              </span>
              <span className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-amber-200 shadow-sm text-sm sm:text-base">
                <X className="w-4 h-4" />
                {unknownCards.size} {t('flashcardStudy.learning')}
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2.5" />
        </motion.div>

        {/* Flashcard */}
        <div className="perspective-1000 h-[400px] sm:h-[450px] lg:h-[500px] mb-10">
          <motion.div
            key={currentIndex}
            className="relative w-full h-full cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, rotateY: isFlipped ? 180 : 0 }}
            transition={{
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 },
              rotateY: { duration: 0.6, type: "spring", stiffness: 100, damping: 15 }
            }}
            style={{ transformStyle: 'preserve-3d' }}
            whileHover={{ scale: 1.01 }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-white to-neutral-50 border-2 border-neutral-900 rounded-[2rem] p-8 sm:p-12 lg:p-16 flex flex-col items-center justify-center text-center shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center mb-8 shadow-lg">
                <span className="text-white text-base">Q</span>
              </div>
              <p className="text-3xl text-neutral-900 leading-relaxed max-w-lg">{currentCard.front}</p>
              <div className="mt-12 flex flex-col items-center gap-3">
                <div className="w-20 h-1.5 bg-neutral-900 rounded-full"></div>
                <p className="text-sm text-neutral-500">{t('flashcardStudy.flipHint')}</p>
              </div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-[2rem] p-8 sm:p-12 lg:p-16 flex flex-col items-center justify-center text-center shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-lg">
                <span className="text-neutral-900 text-base">A</span>
              </div>
              <p className="text-3xl text-white leading-relaxed max-w-lg">{currentCard.back}</p>
              <div className="mt-12 flex flex-col items-center gap-3">
                <div className="w-20 h-1.5 bg-white rounded-full"></div>
                <p className="text-sm text-neutral-400">{t('flashcardStudy.flipBackHint')}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <motion.div
          className="flex items-center justify-between gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            variant="outline"
            size="lg"
            className="flex-1 border-neutral-300 h-14 bg-white/80 backdrop-blur-xl hover:bg-neutral-50 disabled:opacity-40 shadow-sm rounded-2xl"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            {t('common.previous')}
          </Button>

          <AnimatePresence mode="wait">
            {isFlipped && (
              <motion.div
                className="flex gap-3"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <Button
                  onClick={handleUnknown}
                  variant="outline"
                  size="lg"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50 bg-white/80 backdrop-blur-xl h-14 px-7 shadow-sm rounded-2xl"
                >
                  <X className="w-5 h-5 mr-2" />
                  {t('flashcardStudy.reviewAgain')}
                </Button>
                <Button
                  onClick={handleKnown}
                  size="lg"
                  className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white hover:from-emerald-500 hover:to-emerald-600 h-14 px-7 shadow-lg shadow-emerald-600/30 rounded-2xl"
                >
                  <Check className="w-5 h-5 mr-2" />
                  {t('flashcardStudy.gotIt')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
            className="border-neutral-300 h-14 px-5 bg-white/80 backdrop-blur-xl hover:bg-neutral-50 shadow-sm rounded-2xl"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>

          <Button
            onClick={handleNext}
            disabled={currentIndex === flashcards.length - 1}
            variant="outline"
            size="lg"
            className="flex-1 border-neutral-300 h-14 bg-white/80 backdrop-blur-xl hover:bg-neutral-50 disabled:opacity-40 shadow-sm rounded-2xl"
          >
            {t('common.next')}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        {/* Keyboard shortcuts hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-xs text-neutral-400">
            {t('flashcardStudy.keyboardHints')} <kbd className="px-2 py-1 bg-white border border-neutral-200 rounded-lg text-neutral-600 shadow-sm">Space</kbd> {t('flashcardStudy.toFlip')},
            <kbd className="px-2 py-1 bg-white border border-neutral-200 rounded-lg text-neutral-600 shadow-sm ml-1.5">←</kbd>
            <kbd className="px-2 py-1 bg-white border border-neutral-200 rounded-lg text-neutral-600 shadow-sm ml-1">→</kbd> {t('flashcardStudy.toNavigate')}
          </p>
        </motion.div>
      </div>

      {/* Completion Modal */}
      <DeckCompletionModal
        isOpen={showCompletion}
        onClose={handleCompletionClose}
        stats={calculateStats()}
      />
    </div>
  );
}
