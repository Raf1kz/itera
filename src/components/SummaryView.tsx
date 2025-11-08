import { FileText, Sparkles } from 'lucide-react';

interface SummaryViewProps {
  summary: string;
}

export function SummaryView({ summary }: SummaryViewProps) {
  // Split summary into sections if it contains section markers
  const sections = summary.split('\n\n').filter(s => s.trim());

  return (
    <div className="bg-white rounded-3xl p-8 shadow-lg border border-purple-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-gray-900">AI-Generated Summary</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Sparkles className="w-4 h-4" />
            <span>Key concepts and takeaways</span>
          </div>
        </div>
      </div>

      <div className="prose prose-purple max-w-none">
        {sections.map((section, index) => {
          const isHeading = section.startsWith('**') || section.length < 100;
          
          if (isHeading) {
            const cleanText = section.replace(/\*\*/g, '');
            return (
              <h3 key={index} className="text-gray-900 mt-6 mb-3 first:mt-0">
                {cleanText}
              </h3>
            );
          }
          
          return (
            <p key={index} className="text-gray-700 mb-4 leading-relaxed">
              {section}
            </p>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-violet-50 border border-violet-200 rounded-2xl">
        <p className="text-sm text-violet-800">
          💡 <span className="font-medium">Study Tip:</span> Review this summary before practicing with flashcards to get a comprehensive understanding of the topic.
        </p>
      </div>
    </div>
  );
}
