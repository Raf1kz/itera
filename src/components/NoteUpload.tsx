import { useState } from 'react';
import { Upload, FileText, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface NoteUploadProps {
  onGenerate: (title: string, subject: string, content: string) => void;
  onBack: () => void;
  isGenerating: boolean;
}

export function NoteUpload({ onGenerate, onBack, isGenerating }: NoteUploadProps) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      // Simulate file reading - in real app, this would process the file
      setNotes(`Content from ${file.name}:\n\nThis is simulated content. In a real application, this would extract text from PDF, Word, or other document formats.`);
    }
  };

  const handleGenerate = () => {
    if (title && subject && (notes || fileName)) {
      onGenerate(title, subject, notes || `Uploaded file: ${fileName}`);
    }
  };

  const isValid = title.trim() && subject.trim() && (notes.trim() || fileName);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-6"
          disabled={isGenerating}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="bg-white rounded-3xl p-8 shadow-lg border border-purple-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-gray-900">Create Study Set</h2>
              <p className="text-gray-600">AI will generate flashcards and summaries from your notes</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Study Set Title</Label>
              <Input
                id="title"
                placeholder="e.g., Chapter 5: Photosynthesis"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isGenerating}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Biology, Math, History"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isGenerating}
                className="mt-2"
              />
            </div>

            <Tabs defaultValue="type" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="type">Type Notes</TabsTrigger>
                <TabsTrigger value="upload">Upload Document</TabsTrigger>
              </TabsList>
              
              <TabsContent value="type" className="mt-4">
                <Label htmlFor="notes">Your Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Paste or type your class notes here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isGenerating}
                  className="mt-2 min-h-[300px]"
                />
              </TabsContent>
              
              <TabsContent value="upload" className="mt-4">
                <Label>Upload Document</Label>
                <div className="mt-2">
                  <label htmlFor="file-upload" className="block">
                    <div className="border-2 border-dashed border-purple-300 rounded-2xl p-12 text-center hover:border-violet-400 hover:bg-violet-50/50 transition-colors cursor-pointer">
                      {fileName ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-green-100 rounded-2xl">
                            <FileText className="w-8 h-8 text-green-600" />
                          </div>
                          <p className="text-gray-900">{fileName}</p>
                          <p className="text-sm text-gray-600">Click to change file</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-violet-100 rounded-2xl">
                            <Upload className="w-8 h-8 text-violet-600" />
                          </div>
                          <p className="text-gray-900">Upload your notes</p>
                          <p className="text-sm text-gray-600">PDF, Word, or text files</p>
                        </div>
                      )}
                    </div>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    disabled={isGenerating}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleGenerate}
              disabled={!isValid || isGenerating}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI is generating your study materials...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Flashcards & Summary
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
