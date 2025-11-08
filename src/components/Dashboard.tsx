import { Plus, BookOpen, Brain } from 'lucide-react';
import { Button } from './ui/button';
import { StudySetCard } from './StudySetCard';

interface StudySet {
  id: string;
  title: string;
  flashcardCount: number;
  createdAt: string;
  subject: string;
}

interface DashboardProps {
  studySets: StudySet[];
  onCreateNew: () => void;
  onSelectSet: (id: string) => void;
}

export function Dashboard({ studySets, onCreateNew, onSelectSet }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-gray-900">StudyAI</h1>
              <p className="text-gray-600">AI-powered learning companion</p>
            </div>
          </div>
          <Button
            onClick={onCreateNew}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Study Set
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-100 rounded-xl">
                <BookOpen className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Study Sets</p>
                <p className="text-gray-900">{studySets.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Flashcards</p>
                <p className="text-gray-900">
                  {studySets.reduce((sum, set) => sum + set.flashcardCount, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-fuchsia-100 rounded-xl">
                <svg className="w-6 h-6 text-fuchsia-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Study Streak</p>
                <p className="text-gray-900">7 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Study Sets Grid */}
        {studySets.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-violet-100 to-purple-100 rounded-3xl mb-6">
              <BookOpen className="w-16 h-16 text-violet-600" />
            </div>
            <h3 className="text-gray-900 mb-2">No study sets yet</h3>
            <p className="text-gray-600 mb-8">Create your first study set to get started</p>
            <Button
              onClick={onCreateNew}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Study Set
            </Button>
          </div>
        ) : (
          <div>
            <h2 className="text-gray-900 mb-6">Your Study Sets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studySets.map((set) => (
                <StudySetCard
                  key={set.id}
                  studySet={set}
                  onSelect={() => onSelectSet(set.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
