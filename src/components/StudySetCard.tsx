import { BookOpen, Calendar, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

interface StudySet {
  id: string;
  title: string;
  flashcardCount: number;
  createdAt: string;
  subject: string;
}

interface StudySetCardProps {
  studySet: StudySet;
  onSelect: () => void;
}

type SubjectColor = { bg: string; text: string; border: string };

const subjectColors: Record<string, SubjectColor> & { default: SubjectColor } = {
  science: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  math: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  history: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  language: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  default: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const getSubjectColors = (subject: string): { bg: string; text: string; border: string } => {
  const key = subject.toLowerCase();
  return subjectColors[key] ?? subjectColors["default"];
};

export function StudySetCard({ studySet, onSelect }: StudySetCardProps) {
  const colors = getSubjectColors(studySet.subject);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100 hover:shadow-md transition-all hover:border-violet-300 group cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className={`px-3 py-1 ${colors.bg} ${colors.text} rounded-lg text-sm border ${colors.border}`}>
          {studySet.subject}
        </div>
        <div className="p-2 bg-violet-50 rounded-lg group-hover:bg-violet-100 transition-colors">
          <BookOpen className="w-5 h-5 text-violet-600" />
        </div>
      </div>

      <h3 className="text-gray-900 mb-3">{studySet.title}</h3>

      <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span>{studySet.flashcardCount} cards</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{studySet.createdAt}</span>
        </div>
      </div>

      <Button
        onClick={onSelect}
        variant="ghost"
        className="w-full justify-between group-hover:bg-violet-50 group-hover:text-violet-700"
      >
        Study Now
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Button>
    </div>
  );
}
