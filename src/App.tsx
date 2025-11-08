import { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WelcomeHero } from './components/WelcomeHero';
import { Sidebar } from './components/Sidebar';
import { FlashcardStudy } from './components/FlashcardStudy';
import { DecksView } from './components/DecksView';
import { GenerateView } from './components/GenerateView';
import { StudyView } from './components/StudyView';
import { SummariesView } from './components/SummariesView';
import { SummaryDetail } from './components/SummaryDetail';
import { NotebookView } from './components/NotebookView';
import { ConceptGraphView } from './components/ConceptGraphView';
import { SuccessToast } from './components/SuccessToast';
import { Confetti } from './components/Confetti';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { useTranslation } from 'react-i18next';
import type { ViewType } from './types';

export default function App() {
  const { t } = useTranslation();
  const [showWelcome, setShowWelcome] = useState(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    return hasSeenWelcome !== 'true';
  });
  const [currentView, setCurrentView] = useState<ViewType>('generate');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const handleGetStarted = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
  };

  const handleStudyDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setCurrentView('flashcard-study');
  };

  const handleBackToDecks = () => {
    setCurrentView('decks');
    setSelectedDeckId(null);
  };

  const handleGenerationComplete = () => {
    setCurrentView('decks');
    showSuccessToast(t('toast.studyMaterialsSaved'));
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handleViewSummary = (summaryId: string) => {
    setSelectedSummaryId(summaryId);
    setCurrentView('summary-detail');
  };

  const handleBackToSummaries = () => {
    setCurrentView('summaries');
    setSelectedSummaryId(null);
  };

  // Add keyboard shortcut for sidebar toggle
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(!isSidebarCollapsed);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isSidebarCollapsed]);

  // Show welcome screen on first visit
  if (showWelcome) {
    return (
      <ErrorBoundary>
        <WelcomeHero onGetStarted={handleGetStarted} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100/30 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        
        <main className="flex-1 overflow-auto">
        {currentView === 'decks' && (
          <DecksView onStudyDeck={handleStudyDeck} />
        )}

        {currentView === 'generate' && (
          <GenerateView onComplete={handleGenerationComplete} />
        )}
        
        {currentView === 'study' && (
          <StudyView />
        )}
        
        {currentView === 'summaries' && (
          <SummariesView onViewSummary={handleViewSummary} />
        )}
        
        {currentView === 'summary-detail' && selectedSummaryId && (
          <SummaryDetail 
            summaryId={selectedSummaryId}
            onBack={handleBackToSummaries}
          />
        )}
        
        {currentView === 'flashcard-study' && selectedDeckId && (
          <FlashcardStudy 
            deckId={selectedDeckId}
            onBack={handleBackToDecks}
          />
        )}

        {currentView === 'notebook' && (
          <NotebookView />
        )}

        {currentView === 'concept-graph' && (
          <ConceptGraphView />
        )}
      </main>
    </div>

    <SuccessToast
      message={toastMessage}
      isVisible={showToast}
      onClose={() => setShowToast(false)}
    />

    <Confetti isActive={showConfetti} />

    {!showWelcome && <KeyboardShortcuts />}
    </ErrorBoundary>
  );
}
