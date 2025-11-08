import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ArrowLeft, Clock, BookOpen, Download, Printer, GraduationCap } from 'lucide-react';

const MOCK_SUMMARIES_DETAIL: Record<string, any> = {
  '1': {
    title: 'Cell Biology Fundamentals',
    subject: 'Biology',
    date: '2 hours ago',
    wordCount: 1250,
    readingTime: 6,
    relatedDeck: 'Biology Terms',
    content: {
      introduction: 'Cell biology is the study of cell structure and function, and it revolves around the concept that the cell is the fundamental unit of life. Understanding cells is crucial because all living organisms are made of cells, and all the functions of life occur within cells.',
      sections: [
        {
          heading: 'Cell Structure Overview',
          content: 'Cells are the basic building blocks of all living things. The human body is composed of trillions of cells. They provide structure for the body, take in nutrients from food, convert those nutrients into energy, and carry out specialized functions. Cells also contain the body\'s hereditary material and can make copies of themselves.',
          keyPoints: [
            'Cells are the smallest unit of life',
            'All organisms are made of one or more cells',
            'Cells arise from pre-existing cells',
            'Cells contain hereditary information (DNA)',
          ],
        },
        {
          heading: 'Cell Membrane',
          content: 'The cell membrane is a biological membrane that separates the interior of all cells from the outside environment. It consists of a lipid bilayer with embedded proteins. The membrane is selectively permeable, controlling what enters and exits the cell.',
          keyPoints: [
            'Composed of phospholipid bilayer',
            'Contains embedded proteins for transport',
            'Selectively permeable - controls molecular traffic',
            'Maintains cell integrity and homeostasis',
          ],
        },
        {
          heading: 'Mitochondria - The Powerhouse',
          content: 'Mitochondria are known as the powerhouse of the cell because they generate most of the cell\'s supply of adenosine triphosphate (ATP), used as a source of chemical energy. They are involved in cellular respiration, converting glucose and oxygen into ATP.',
          keyPoints: [
            'Produces ATP through cellular respiration',
            'Contains its own DNA (inherited maternally)',
            'Has double membrane structure',
            'Critical for energy metabolism',
          ],
        },
        {
          heading: 'Nucleus - The Control Center',
          content: 'The nucleus is the control center of the cell, containing most of the cell\'s genetic material organized as DNA molecules. It regulates gene expression and mediates the replication of DNA during the cell cycle.',
          keyPoints: [
            'Contains chromosomes made of DNA',
            'Controls cell activities through gene expression',
            'Nuclear envelope protects genetic material',
            'Nucleolus produces ribosomes',
          ],
        },
        {
          heading: 'Other Important Organelles',
          content: 'Beyond the major organelles, cells contain many specialized structures including the endoplasmic reticulum (protein and lipid synthesis), Golgi apparatus (protein modification and packaging), lysosomes (waste breakdown), and ribosomes (protein synthesis).',
          keyPoints: [
            'Endoplasmic Reticulum: protein synthesis and transport',
            'Golgi Apparatus: protein modification and packaging',
            'Lysosomes: cellular waste disposal',
            'Ribosomes: protein assembly sites',
          ],
        },
      ],
      conclusion: 'Understanding cellular structure and function is fundamental to biology. Each organelle plays a specific role in maintaining cell health and function. The coordinated activity of all these components allows cells to grow, reproduce, and respond to their environment. This knowledge forms the foundation for understanding more complex biological processes and systems.',
    },
  },
  '2': {
    title: 'React Hooks Deep Dive',
    subject: 'Programming',
    date: 'Yesterday',
    wordCount: 2100,
    readingTime: 10,
    relatedDeck: 'React Fundamentals',
    content: {
      introduction: 'React Hooks revolutionized how we write React components by allowing us to use state and other React features in functional components. This summary covers the most important hooks and their use cases.',
      sections: [
        {
          heading: 'useState - Managing Component State',
          content: 'The useState hook is the most fundamental hook in React. It allows functional components to have state variables. When state updates, React re-renders the component with the new state value.',
          keyPoints: [
            'Returns array with current state and setter function',
            'Can initialize with any data type',
            'State updates trigger re-renders',
            'Multiple useState calls allowed per component',
          ],
        },
        {
          heading: 'useEffect - Side Effects Management',
          content: 'useEffect handles side effects in functional components, such as data fetching, subscriptions, or manually changing the DOM. It runs after render and can be configured to run conditionally.',
          keyPoints: [
            'Runs after every render by default',
            'Dependency array controls when it runs',
            'Cleanup function for subscriptions',
            'Replaces lifecycle methods in class components',
          ],
        },
        {
          heading: 'useContext - Consuming Context',
          content: 'useContext provides a way to pass data through the component tree without having to pass props down manually at every level. It makes global state management simpler.',
          keyPoints: [
            'Accesses context values directly',
            'Avoids prop drilling',
            'Re-renders when context value changes',
            'Best for truly global state',
          ],
        },
      ],
      conclusion: 'React Hooks provide a more direct API to React concepts you already know. They enable better code organization and reusability through custom hooks.',
    },
  },
};

interface SummaryDetailProps {
  summaryId: string;
  onBack: () => void;
}

export function SummaryDetail({ summaryId, onBack }: SummaryDetailProps) {
  const summary = MOCK_SUMMARIES_DETAIL[summaryId];

  if (!summary) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600">Summary not found.</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Summaries
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="mb-8 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Summaries
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Title Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <CardTitle className="text-3xl">{summary.title}</CardTitle>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Badge>{summary.subject}</Badge>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{summary.readingTime} min read</span>
                    </div>
                    <span>•</span>
                    <span>{summary.wordCount} words</span>
                    <span>•</span>
                    <span>{summary.date}</span>
                  </div>
                </div>
              </div>

              {summary.relatedDeck && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-900">
                    Related flashcard deck: <span className="font-medium">{summary.relatedDeck}</span>
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Content */}
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-gray max-w-none">
              {/* Introduction */}
              <div className="mb-8">
                <p className="text-lg text-gray-700 leading-relaxed">
                  {summary.content.introduction}
                </p>
              </div>

              <Separator className="my-8" />

              {/* Sections */}
              {summary.content.sections.map((section: any, index: number) => (
                <div key={index} className="mb-10">
                  <h2 className="text-gray-900 mb-4">{section.heading}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {section.content}
                  </p>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm text-gray-900 mb-3">Key Points:</h3>
                    <ul className="space-y-2">
                      {section.keyPoints.map((point: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                          <span className="text-indigo-600 mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}

              <Separator className="my-8" />

              {/* Conclusion */}
              <div className="mb-6">
                <h2 className="text-gray-900 mb-4">Conclusion</h2>
                <p className="text-gray-700 leading-relaxed">
                  {summary.content.conclusion}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Summaries
          </Button>
        </div>
      </div>
    </div>
  );
}
