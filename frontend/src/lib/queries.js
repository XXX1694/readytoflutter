import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTopics,
  getTopic,
  getQuestions,
  getStats,
  updateProgress,
  resetProgress,
} from '../api/api.js';
import { queryKeys } from './queryClient.js';

export function useTopics(level) {
  return useQuery({
    queryKey: queryKeys.topics(level),
    queryFn: () => getTopics(level),
  });
}

export function useTopic(slug) {
  return useQuery({
    queryKey: queryKeys.topic(slug),
    queryFn: () => getTopic(slug),
    enabled: Boolean(slug),
  });
}

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats(),
    queryFn: () => getStats(),
  });
}

export function useQuestions(params) {
  return useQuery({
    queryKey: queryKeys.questions(params),
    queryFn: () => getQuestions(params),
  });
}

export function useUpdateProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, status, notes }) =>
      updateProgress(questionId, status, notes),
    // Optimistic update — patch the cached topic immediately so the UI feels
    // instant and we don't need to refetch the whole topic on every click.
    onMutate: async ({ questionId, status, notes, topicSlug }) => {
      if (!topicSlug) return;
      const key = queryKeys.topic(topicSlug);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      if (prev?.questions) {
        qc.setQueryData(key, {
          ...prev,
          questions: prev.questions.map((q) =>
            q.id === questionId
              ? { ...q, status, notes: notes ?? q.notes }
              : q,
          ),
          completed_count: prev.questions.reduce(
            (acc, q) => {
              const newStatus = q.id === questionId ? status : q.status;
              return acc + (newStatus === 'completed' ? 1 : 0);
            },
            0,
          ),
        });
      }
      return { prev, key };
    },
    onError: (_err, _vars, ctx) => {
      // Roll back the optimistic patch.
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_data, _err, { topicSlug }) => {
      // Re-sync from source. When we know the slug, only the affected topic
      // refetches — the topics-list / questions-list updates the next time
      // they become active, courtesy of staleTime expiry.
      if (topicSlug) {
        qc.invalidateQueries({ queryKey: queryKeys.topic(topicSlug) });
      } else {
        qc.invalidateQueries({ queryKey: ['topic'] });
        qc.invalidateQueries({ queryKey: ['questions'] });
      }
      qc.invalidateQueries({ queryKey: ['stats'] });
      // Mark the topic-list stale without forcing a refetch — counters update
      // on next visit to dashboard rather than firing a request per click.
      qc.invalidateQueries({ queryKey: ['topics'], refetchType: 'none' });
    },
  });
}

export function useResetProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => resetProgress(),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}
