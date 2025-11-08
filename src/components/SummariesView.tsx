import { FileText, ArrowRight, Calendar, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { EmptyState } from './EmptyState';
import { useAuthenticatedSupabase } from '../hooks/useAuthenticatedSupabase';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

interface SummariesViewProps {
  onViewSummary: (summaryId: string) => void;
}

interface Summary {
  id: string;
  title: string;
  content: string;
  word_count: number;
  created_at: string;
}

export function SummariesView({ onViewSummary }: SummariesViewProps) {
  const { t } = useTranslation();
  const supabase = useAuthenticatedSupabase();
  const { isSignedIn } = useUser();
  const summariesQuery = useQuery<Summary[]>({
    queryKey: ['summaries', isSignedIn],
    enabled: Boolean(supabase && isSignedIn),
    queryFn: async () => {
      const client = supabase;
      if (!client) {
        return [];
      }

      const { data, error: fetchError } = await client
        .from('summaries')
        .select('id, title, content, word_count, created_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching summaries:', fetchError);
        throw fetchError;
      }

      return data ?? [];
    },
  });

  const summaries = summariesQuery.data ?? [];
  const loading = summariesQuery.isLoading || summariesQuery.isFetching;

  if (summariesQuery.isError) {
    console.error('summaries_query_error', summariesQuery.error);
  }

  const totalSummaries = summaries.length;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
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

  return (
    <div className="h-full overflow-auto relative">
      {/* Premium background */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-neutral-100/30" />

      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0) 1px, transparent 0)`,
        backgroundSize: '48px 48px'
      }} />

      {/* Ambient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[600px] h-[600px] bg-purple-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <motion.div
        className="relative max-w-5xl mx-auto px-8 py-16"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div
          className="mb-12"
          variants={itemVariants}
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-neutral-900/10 rounded-3xl blur-2xl" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-neutral-900 to-neutral-700 rounded-2xl flex items-center justify-center shadow-xl">
                <FileText className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
            </div>
            <div>
              <h1 className="text-neutral-900">{t('summaries.title')}</h1>
              <p className="text-neutral-600 text-lg mt-1">
                {loading ? t('common.loading') : `${totalSummaries} ${t('summaries.subtitle')}`}
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
          </div>
        ) : summaries.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No summaries yet"
            description="Generate your first summary by uploading notes. Our AI will create a concise overview to help you review key concepts quickly."
            actionLabel="Generate Content"
            onAction={() => window.location.hash = '#generate'}
          />
        ) : (
          /* Summaries List */
          <div className="space-y-5">
            {summaries.map((summary, index) => (
              <motion.div
                key={summary.id}
                data-testid="summary-item"
                variants={itemVariants}
                custom={index}
                onClick={() => onViewSummary(summary.id)}
                whileHover={{ x: 6, scale: 1.01 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="relative group cursor-pointer"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/5 to-neutral-900/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative bg-white/80 backdrop-blur-xl border border-neutral-200/60 rounded-3xl p-7 shadow-lg group-hover:shadow-2xl transition-all"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex gap-5 flex-1 min-w-0">
                    <div className="w-14 h-14 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <BookOpen className="w-7 h-7 text-neutral-700" strokeWidth={1.5} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-neutral-900 truncate">{summary.title}</h3>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-neutral-600">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shadow-sm">
                            <FileText className="w-4 h-4 text-blue-600" strokeWidth={2} />
                          </div>
                          <span>{summary.word_count} {t('summaries.words')}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center shadow-sm">
                            <Calendar className="w-4 h-4 text-purple-600" strokeWidth={2} />
                          </div>
                          <span>{new Date(summary.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <motion.div
                    className="flex-shrink-0 w-11 h-11 bg-neutral-100 rounded-xl flex items-center justify-center group-hover:bg-neutral-900 transition-all shadow-sm"
                    whileHover={{ scale: 1.1 }}
                  >
                    <ArrowRight className="w-5 h-5 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </motion.div>
                </div>
              </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
