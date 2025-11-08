import { useState } from 'react';
import { Sparkles, Loader2, Wand2, FileText, Zap, Brain, Check, ArrowRight, Lightbulb } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UnifiedUpload } from './UnifiedUpload';
import { motion, AnimatePresence } from 'motion/react';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 16
    }
  }
};

interface GenerateViewProps {
  onComplete?: () => void;
}

export function GenerateView({ onComplete }: GenerateViewProps) {
  const [deckName, setDeckName] = useState('General');
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const { getToken } = useAuth();
  const qc = useQueryClient();

  const isValid = notes.trim().length >= 20 || url.trim().length > 0;
  const deckNameValid = deckName.trim().length > 0;
  const urlValid = url.trim().length > 0;
  const notesValid = notes.trim().length >= 20;

  const handleGenerate = async () => {
    if (!isValid || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(0);

    const textPayload = notes.trim();

    // Progress animation steps
    const steps = [
      { progress: 20, text: 'Analyzing your notes...', delay: 0 },
      { progress: 40, text: 'Identifying key concepts...', delay: 500 },
      { progress: 60, text: 'Creating flashcards...', delay: 1000 },
      { progress: 80, text: 'Generating summary...', delay: 1500 },
      { progress: 100, text: 'Finalizing materials...', delay: 2000 },
    ];

    // Start progress animation
    let progressInterval: NodeJS.Timeout | undefined;
    progressInterval = setInterval(() => {
      setProgress((prev) => {
        const nextStep = steps.find(s => s.progress > prev);
        if (nextStep) {
          setCurrentStep(nextStep.text);
          return nextStep.progress;
        }
        return prev;
      });
    }, 500);

    setCurrentStep(steps[0]?.text || 'Preparing...');

    const idempotencyKey =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    try {
      const token = await getToken({ template: 'supabase', skipCache: true });
      console.info('🔑 Token obtained:', token ? 'Yes (length: ' + token.length + ')' : 'No token');
      const headers: Record<string, string> = {
        'x-idempotency-key': idempotencyKey,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('⚠️ No token available - user may need to sign in again');
      }

      // Always use JSON (file text is already extracted client-side)
      const payload = {
        text: textPayload || undefined,
        url: url.trim() || undefined,
        deckName: deckName.trim() || 'General',
        options: {
          targetCards: 20,
          makeSummary: true,
          summaryDetail: 'deep',
        },
      };
      const body = JSON.stringify(payload);
      headers['Content-Type'] = 'application/json';
      console.info('ACCEPT → /generate-flashcards', payload);

      let responseJson: unknown = null;
      let status = 0;

      if (!SUPABASE_URL) {
        throw new Error('missing_supabase_url');
      }

      if (!token) {
        throw new Error('Authentication required. Please sign out and sign back in.');
      }

      // Use proper Clerk JWT authentication
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey,
        'Authorization': `Bearer ${token}`,
      };
      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-flashcards`, {
        method: 'POST',
        headers: authHeaders,
        body,
      });
      status = response.status;

      try {
        responseJson = await response.json();
      } catch {
        responseJson = null;
      }

      console.info('ACCEPT ← /generate-flashcards', { status });
      console.info('ACCEPT response payload', responseJson);

      if (status === 401) {
        console.error('🚫 Authentication failed (401). This usually means:');
        console.error('  1. The Clerk JWT template for Supabase is not configured');
        console.error('  2. You need to sign out and sign back in to get a fresh token');
        console.error('  3. The CLERK_ISSUER env variable in Supabase might be incorrect');
      }

      if (!response.ok) {
        const envelope = (responseJson ?? {}) as Record<string, unknown>;
        const code = typeof envelope['code'] === 'string' ? (envelope['code'] as string) : undefined;
        const requestId =
          typeof envelope['requestId'] === 'string' ? (envelope['requestId'] as string) : undefined;
        const detail = envelope['detail'];
        const message =
          typeof envelope['error'] === 'string'
            ? (envelope['error'] as string)
            : `generation_failed_${status}`;
        const typedError = new Error(message);
        (typedError as any).code = code ?? `http_${status || 'unknown'}`;
        (typedError as any).requestId = requestId;
        (typedError as any).detail = detail;
        throw typedError;
      }

      await qc.invalidateQueries({ queryKey: ['cards'] });
      await qc.invalidateQueries({ queryKey: ['summaries'] });

      setNotes('');
      setUrl('');
      setDeckName('General');

      onComplete?.();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('unknown_error');
      const code = (error as any)?.code as string | undefined;
      const requestId = (error as any)?.requestId as string | undefined;
      const detail = (error as any)?.detail;

      console.error('generation_error', {
        code,
        requestId,
        detail,
        message: error.message,
      });

      let errorMessage: string;

      switch (code) {
        case 'unauthorized':
          errorMessage = 'Authentication failed. Please sign out and sign back in, then try again.';
          break;
        case 'validation_error':
          errorMessage = 'Please provide at least 20 characters of well-structured notes.';
          break;
        case 'upstream_unavailable':
          errorMessage = 'The AI service is temporarily unavailable. Please retry in a moment.';
          break;
        case 'llm_parse_error':
          errorMessage = 'The AI response could not be parsed. Try refining your notes and retry.';
          break;
        case 'file_extraction_failed':
          // Use the detailed error message from the backend
          errorMessage = typeof detail === 'string' ? detail : (error.message || 'Failed to extract text from file.');
          break;
        case 'url_fetch_failed':
          errorMessage = typeof detail === 'string' ? detail : (error.message || 'Failed to fetch content from URL.');
          break;
        case 'internal_error':
          errorMessage = requestId
            ? `Something went wrong. Reference ID: ${requestId}`
            : 'Something went wrong while generating your materials.';
          break;
        default:
          if (code && requestId) {
            errorMessage = `Generation failed (${code}). Reference ID: ${requestId}`;
          } else {
            errorMessage = error.message || 'Generation failed. Please try again.';
          }
          break;
      }

      setError(errorMessage);
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setIsGenerating(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  return (
    <div className="h-full overflow-auto relative">
      {/* Premium background with depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-neutral-100/30"></div>

      {/* Elegant overlay pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)`,
        backgroundSize: '48px 48px'
      }}></div>

      {/* Ambient light effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/[0.04] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/[0.04] rounded-full blur-[120px]"></div>
      </div>

      <motion.div
        className="relative max-w-5xl mx-auto px-8 py-16"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Hero Section */}
        <motion.div
          className="text-center mb-16"
          variants={itemVariants}
        >
          {/* Icon with glow effect */}
          <motion.div
            className="inline-block relative mb-8"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="absolute inset-0 bg-neutral-900/10 rounded-3xl blur-2xl scale-110" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-neutral-900 to-neutral-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-neutral-900/20">
              <Wand2 className="w-10 h-10 text-white" strokeWidth={1.5} />

              {/* Subtle shimmer */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-3xl" />
            </div>
          </motion.div>

          <h1 className="text-neutral-900 mb-4 tracking-tight">
            Generate Study Materials
          </h1>
          <p className="text-neutral-600 max-w-2xl mx-auto leading-relaxed text-lg">
            Transform your notes into powerful flashcards and deep-dive summaries with one click
          </p>
        </motion.div>

        {/* Main Form Card */}
        <motion.div
          className="bg-white/80 backdrop-blur-xl rounded-3xl border border-neutral-200/60 shadow-2xl shadow-neutral-900/[0.08] p-10 mb-12 relative overflow-hidden"
          variants={itemVariants}
        >
          {/* Subtle gradient overlay */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />

          <div className="space-y-8">
            {/* Deck Name Input */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <Label htmlFor="deckName" className="text-neutral-900 mb-3 flex items-center gap-2">
                <span>Deck Name</span>
                <AnimatePresence mode="wait">
                  {deckNameValid && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0, rotate: -180 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="w-4 h-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm shadow-emerald-500/30"
                    >
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Label>
              <div className="relative group">
                <Input
                  id="deckName"
                  placeholder="e.g., Biology 101, Physics, History..."
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  disabled={isGenerating}
                  className="h-14 border-neutral-300 focus:border-neutral-900 bg-white px-5 shadow-sm group-hover:shadow-md transition-all duration-200"
                />
              </div>
            </motion.div>

            {/* URL Input */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <Label htmlFor="url" className="text-neutral-900 mb-3 flex items-center gap-2">
                <span>URL (Optional)</span>
                <AnimatePresence mode="wait">
                  {urlValid && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0, rotate: -180 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="w-4 h-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm shadow-emerald-500/30"
                    >
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Label>
              <div className="relative group">
                <Input
                  id="url"
                  type="url"
                  placeholder="e.g., https://wikipedia.org/wiki/Photosynthesis"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isGenerating}
                  className="h-14 border-neutral-300 focus:border-neutral-900 bg-white px-5 shadow-sm group-hover:shadow-md transition-all duration-200"
                />
              </div>
            </motion.div>

            {/* Divider */}
            <div className="relative h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

            {/* Notes Section */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <Label className="text-neutral-900 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Your Notes or Upload Files</span>
                  <AnimatePresence mode="wait">
                    {notesValid && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0, rotate: -180 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="w-4 h-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm shadow-emerald-500/30"
                      >
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {notes.length > 0 && (
                  <motion.span
                    className="text-sm text-neutral-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {notes.length.toLocaleString()} characters
                  </motion.span>
                )}
              </Label>
              <UnifiedUpload
                value={notes}
                onChange={setNotes}
                disabled={isGenerating}
              />
            </motion.div>

            {/* Premium Tip Card */}
            <motion.div
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 p-6 border border-neutral-700"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
            >
              {/* Subtle shine effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />

              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white mb-1.5">Pro Tip</h4>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    The AI automatically creates a mix of Q&A, multiple choice, and fill-in-the-blank cards based on your content. Upload PDFs, Word docs, text files, paste a URL, or type notes for the best results.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl"
              >
                <div className="w-5 h-5 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs">!</span>
                </div>
                <p className="text-sm text-red-900 leading-relaxed">{error}</p>
              </motion.div>
            )}

            {/* Generate Button */}
            <motion.div
              whileHover={{ scale: isValid && !isGenerating ? 1.01 : 1 }}
              whileTap={{ scale: isValid && !isGenerating ? 0.98 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={handleGenerate}
                disabled={!isValid || isGenerating}
                className="w-full bg-gradient-to-br from-neutral-900 to-neutral-800 hover:from-neutral-800 hover:to-neutral-700 h-16 shadow-xl shadow-neutral-900/20 hover:shadow-2xl hover:shadow-neutral-900/30 transition-all duration-300 relative overflow-hidden group"
              >
                {/* Button shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center gap-3 w-full relative z-10">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-base">{currentStep}</span>
                    </div>
                    <div className="w-full max-w-md h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-white/80 via-white to-white/80 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 relative z-10">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-base">Generate Flashcards & Summary</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Feature Showcase */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          variants={containerVariants}
        >
          {[
            {
              icon: Brain,
              title: 'Smart Flashcards',
              description: 'AI extracts key concepts and creates effective Q&A pairs for optimal retention',
              gradient: 'from-blue-500/10 to-blue-600/5',
              iconBg: 'bg-blue-500',
            },
            {
              icon: FileText,
              title: 'Quick Summaries',
              description: 'Get concise overviews highlighting the most important points from your material',
              gradient: 'from-purple-500/10 to-purple-600/5',
              iconBg: 'bg-purple-500',
            },
            {
              icon: Zap,
              title: 'Fully Editable',
              description: 'Review and customize all generated content to match your learning style perfectly',
              gradient: 'from-amber-500/10 to-amber-600/5',
              iconBg: 'bg-amber-500',
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              custom={index}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="relative group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>

                <h3 className="text-neutral-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
