import { useState, useRef, DragEvent } from 'react';
import { Upload, X, Sparkles, CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractTextFromFiles } from '../lib/fileExtractors';

interface UnifiedUploadProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onFilesChange?: (files: File[]) => void;
}

export function UnifiedUpload({ value, onChange, disabled, onFilesChange }: UnifiedUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
  const [extractionErrors, setExtractionErrors] = useState<Array<{ filename: string; error: string }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setIsExtracting(true);
    setExtractionProgress(null);
    setExtractionErrors([]);

    try {
      const { text, errors } = await extractTextFromFiles(files, (current, total, filename) => {
        setExtractionProgress({ current, total, filename });
      });

      // Append extracted text to existing content
      const existingText = value.trim();
      const newText = existingText ? `${existingText}\n\n${text}` : text;
      onChange(newText);

      // Update files list
      const newFiles = [...uploadedFiles, ...files];
      setUploadedFiles(newFiles);
      onFilesChange?.(newFiles);

      // Show errors if any
      if (errors.length > 0) {
        console.warn('File extraction errors:', errors);
        setExtractionErrors(errors);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      setExtractionErrors([{ filename: 'Unknown', error: error instanceof Error ? error.message : 'Failed to process files' }]);
    } finally {
      setIsExtracting(false);
      setExtractionProgress(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileUpload(files);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onFilesChange?.(newFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const fileItem = items.find(item => item.kind === 'file');

    if (fileItem) {
      e.preventDefault();
      const file = fileItem.getAsFile();
      if (file) {
        handleFileUpload([file]);
      }
    }
  };

  return (
    <div className="relative">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 rounded-xl transition-all
          ${isDragging 
            ? 'border-neutral-900 bg-neutral-50 shadow-lg' 
            : 'border-neutral-200 bg-white hover:border-neutral-300'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
        `}
      >
        {/* Upload Indicator */}
        <AnimatePresence>
          {isDragging && !isExtracting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-900/5 backdrop-blur-sm rounded-xl flex items-center justify-center z-10 pointer-events-none"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <p className="text-neutral-900">Drop your files here</p>
                <p className="text-sm text-neutral-600 mt-1">PDF, Word, or text files</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extraction Progress */}
        <AnimatePresence>
          {isExtracting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <p className="text-neutral-900 font-medium">Extracting text from files...</p>
                {extractionProgress && (
                  <p className="text-sm text-neutral-600 mt-2">
                    Processing {extractionProgress.current} of {extractionProgress.total}: {extractionProgress.filename}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Uploaded Files Badges */}
        <AnimatePresence>
          {uploadedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 right-4 z-20 flex flex-wrap gap-2 max-w-md"
            >
              {uploadedFiles.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl px-3 py-2 shadow-lg flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm max-w-[150px] truncate">{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="ml-1 hover:bg-white/20 rounded-lg p-1 transition-colors flex-shrink-0"
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extraction Errors */}
        {extractionErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">!</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 mb-2">
                  Failed to extract text from {extractionErrors.length} file{extractionErrors.length > 1 ? 's' : ''}:
                </p>
                <ul className="space-y-1">
                  {extractionErrors.map((error, index) => (
                    <li key={index} className="text-sm text-red-800">
                      <span className="font-medium">{error.filename}:</span> {error.error}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setExtractionErrors([])}
                  className="mt-2 text-xs text-red-700 hover:text-red-900 underline"
                  type="button"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder="Type or paste your notes here, or drag and drop files..."
          aria-label="Study notes input - type, paste, or upload files"
          className="w-full min-h-[400px] p-6 bg-transparent resize-none focus:outline-none text-neutral-900 placeholder:text-neutral-400"
        />

        {/* Upload Button Overlay */}
        {!value && uploadedFiles.length === 0 && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-center">
              <motion.div 
                className="w-14 h-14 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-neutral-200 shadow-sm"
                whileHover={{ scale: 1.05, rotate: 5 }}
              >
                <Sparkles className="w-7 h-7 text-neutral-400" />
              </motion.div>
              <p className="text-neutral-900 mb-1">Start typing or upload files</p>
              <p className="text-sm text-neutral-500">
                Drag & drop files, paste, or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-neutral-900 hover:underline pointer-events-auto transition-colors"
                  type="button"
                >
                  browse
                </button>
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileInputChange}
        disabled={disabled}
      />
    </div>
  );
}
