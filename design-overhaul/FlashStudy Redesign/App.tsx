import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { FlashcardStudy } from './components/FlashcardStudy';
import { DecksView } from './components/DecksView';
import { GenerateView } from './components/GenerateView';
import { ReviewView } from './components/ReviewView';
import { StudyView } from './components/StudyView';
import { SummariesView } from './components/SummariesView';
import { SummaryDetail } from './components/SummaryDetail';
import type { ViewType } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('generate');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const [generatedCards, setGeneratedCards] = useState<any>(null);

  const handleStudyDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setCurrentView('flashcard-study');
  };

  const handleBackToDecks = () => {
    setCurrentView('decks');
    setSelectedDeckId(null);
  };

  const handleGenerate = (data: any) => {
    setGeneratedCards(data);
    setCurrentView('review');
  };

  const handleSaveGenerated = () => {
    setCurrentView('study');
    setGeneratedCards(null);
  };

  const handleViewSummary = (summaryId: string) => {
    setSelectedSummaryId(summaryId);
    setCurrentView('summary-detail');
  };

  const handleBackToSummaries = () => {
    setCurrentView('summaries');
    setSelectedSummaryId(null);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        currentView={currentView}
        onNavigate={setCurrentView}
      />
      
      <main className="flex-1 overflow-auto">
        {currentView === 'decks' && (
          <DecksView onStudyDeck={handleStudyDeck} />
        )}
        
        {currentView === 'generate' && (
          <GenerateView onGenerate={handleGenerate} />
        )}
        
        {currentView === 'review' && generatedCards && (
          <ReviewView 
            generatedData={generatedCards}
            onSave={handleSaveGenerated}
            onBack={() => setCurrentView('generate')}
          />
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
      </main>
    </div>
  );
}
