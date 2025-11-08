import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sparkles, Loader2, Upload, FileText, X, Plus } from 'lucide-react';

interface GenerateViewProps {
  onGenerate: (data: any) => void;
}

export function GenerateView({ onGenerate }: GenerateViewProps) {
  const [deckTitle, setDeckTitle] = useState('');
  const [courseMaterial, setCourseMaterial] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [cardCount, setCardCount] = useState('10');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setUploadedFiles([...uploadedFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    // Simulate AI analyzing the course materials
    setTimeout(() => {
      const mockCards = Array.from({ length: parseInt(cardCount) }, (_, i) => ({
        id: `gen-${i + 1}`,
        front: `Key Concept ${i + 1} from ${deckTitle || 'your materials'}`,
        back: `This concept was extracted from your course materials and covers important information that you need to understand. The AI has identified this as a critical point for your learning.`,
      }));

      const generatedData = {
        topic: deckTitle || 'Generated Deck',
        description: `Created from ${uploadedFiles.length > 0 ? `${uploadedFiles.length} uploaded file(s)` : 'pasted notes'}`,
        difficulty,
        cards: mockCards,
        summary: `AI analyzed your course materials and generated ${cardCount} flashcards. The analysis identified key concepts, important definitions, and critical information from your ${uploadedFiles.length > 0 ? 'uploaded documents' : 'notes'}. These flashcards are designed to help you master the material with a ${difficulty} difficulty level. The content covers the main topics and essential points you need to remember for effective studying.`,
        materialPreview: courseMaterial.substring(0, 100),
      };

      onGenerate(generatedData);
      setIsGenerating(false);
    }, 3000);
  };

  const hasContent = courseMaterial.trim().length > 0 || uploadedFiles.length > 0;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8 pb-32">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-foreground mb-1">Generate flashcards</h1>
            <p className="text-sm text-muted-foreground">
              Paste your notes or upload files to create AI-powered study materials
            </p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            {/* Deck Title */}
            <div className="space-y-2">
              <Label htmlFor="deckTitle" className="text-sm text-foreground">
                Deck title
              </Label>
              <Input
                id="deckTitle"
                placeholder="e.g., Biology Chapter 3, History Lecture Notes..."
                value={deckTitle}
                onChange={(e) => setDeckTitle(e.target.value)}
                className="h-9 bg-input-background border-input"
                required
              />
            </div>

            {/* Unified Input Area */}
            <div className="space-y-2">
              <Label htmlFor="materials" className="text-sm text-foreground">
                Course materials
              </Label>
              <div
                className={`
                  relative border rounded-lg transition-all duration-200
                  ${isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-input bg-input-background hover:border-primary/50'
                  }
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <textarea
                  ref={textareaRef}
                  id="materials"
                  placeholder="Paste your lecture notes, textbook excerpts, or study materials here...

Or drag and drop PDF, Word, or text files"
                  value={courseMaterial}
                  onChange={(e) => setCourseMaterial(e.target.value)}
                  className="w-full min-h-[320px] p-4 bg-transparent border-0 resize-none focus:outline-none text-sm text-foreground placeholder:text-muted-foreground"
                  style={{ lineHeight: '1.6' }}
                />

                {/* File Upload Button Overlay */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    accept=".pdf,.doc,.docx,.txt"
                    multiple
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload files
                  </Button>
                </div>

                {/* Drag overlay */}
                {isDragging && (
                  <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="text-sm text-primary">Drop files here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 mt-3">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md border border-border/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardCount" className="text-sm text-foreground">
                  Number of cards
                </Label>
                <Select value={cardCount} onValueChange={setCardCount}>
                  <SelectTrigger id="cardCount" className="h-9 bg-input-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 cards</SelectItem>
                    <SelectItem value="10">10 cards</SelectItem>
                    <SelectItem value="15">15 cards</SelectItem>
                    <SelectItem value="20">20 cards</SelectItem>
                    <SelectItem value="30">30 cards</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-sm text-foreground">
                  Difficulty level
                </Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger id="difficulty" className="h-9 bg-input-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="border-t border-border bg-card">
        <div className="max-w-4xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {hasContent 
                ? `Ready to generate ${cardCount} flashcards` 
                : 'Add your course materials to get started'
              }
            </p>
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !hasContent || !deckTitle}
              className="h-9"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
