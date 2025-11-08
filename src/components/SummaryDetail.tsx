import { ArrowLeft, Calendar, BookOpen, Trash2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { useAuthenticatedSupabase } from '../hooks/useAuthenticatedSupabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SummaryDetailProps {
  summaryId: string;
  onBack: () => void;
}

interface Summary {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export function SummaryDetail({ summaryId, onBack }: SummaryDetailProps) {
  const supabase = useAuthenticatedSupabase();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch summary data
  const { data: summary, isLoading, error } = useQuery<Summary>({
    queryKey: ['summary', summaryId],
    enabled: Boolean(supabase && summaryId),
    queryFn: async () => {
      if (!supabase) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('summaries')
        .select('id, title, content, created_at')
        .eq('id', summaryId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Summary not found');

      return data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Not authenticated');

      const { error: deleteError } = await supabase
        .from('summaries')
        .delete()
        .eq('id', summaryId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      onBack();
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-neutral-600 mb-4">Failed to load summary</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Summaries
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-b from-white to-neutral-50">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <Button
              onClick={onBack}
              variant="ghost"
              className="-ml-3 text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Summaries
            </Button>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          className="mb-8 bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-neutral-900 to-neutral-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-neutral-600 mb-3">
                <Calendar className="w-4 h-4" />
                <span>{new Date(summary.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <h1 className="text-neutral-900">{summary.title}</h1>
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          className="bg-white border border-neutral-200 rounded-2xl p-10 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="prose prose-neutral prose-lg max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-lg my-4"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="bg-neutral-100 text-neutral-900 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => <h1 className="text-3xl font-bold text-neutral-900 mt-8 mb-4 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4 pb-2 border-b border-neutral-200">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-bold text-neutral-900 mt-6 mb-3">{children}</h3>,
                p: ({ children }) => <p className="text-neutral-700 mb-4 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="space-y-2 mb-4 ml-6 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="space-y-2 mb-4 ml-6 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="text-neutral-700 leading-relaxed">{children}</li>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-4 py-3 my-4 italic text-neutral-700">{children}</blockquote>,
                table: ({ children }) => <div className="overflow-x-auto my-6"><table className="min-w-full border border-neutral-200 rounded-lg">{children}</table></div>,
                thead: ({ children }) => <thead className="bg-neutral-100">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-neutral-200">{children}</tbody>,
                tr: ({ children }) => <tr>{children}</tr>,
                th: ({ children }) => <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 border-r border-neutral-200 last:border-r-0">{children}</th>,
                td: ({ children }) => <td className="px-4 py-3 text-sm text-neutral-700 border-r border-neutral-200 last:border-r-0">{children}</td>,
                a: ({ href, children }) => <a href={href} className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                strong: ({ children }) => <strong className="font-bold text-neutral-900">{children}</strong>,
                em: ({ children }) => <em className="italic text-neutral-700">{children}</em>,
                hr: () => <hr className="my-8 border-neutral-200" />,
              }}
            >
              {summary.content}
            </ReactMarkdown>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Summary?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this summary.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
