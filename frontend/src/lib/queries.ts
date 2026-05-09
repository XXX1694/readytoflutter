import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  getTopics,
  getTopic,
  getQuestions,
  getStats,
  updateProgress,
  resetProgress,
  type QuestionFilterParams,
} from '../api/api';
import { queryKeys } from './queryClient';

import type { Topic, Question, Stats, ProgressStatus, Level } from '../types/domain.ts';

interface TopicWithQuestions extends Topic {
  questions: Question[];
}

export function useTopics(level?: Level): UseQueryResult<Topic[]> {
  return useQuery({
    queryKey: queryKeys.topics(level),
    queryFn: () => getTopics(level),
  });
}

export function useTopic(slug: string | undefined): UseQueryResult<TopicWithQuestions> {
  return useQuery({
    queryKey: queryKeys.topic(slug || ''),
    queryFn: () => getTopic(slug as string),
    enabled: Boolean(slug),
  });
}

export function useStats(): UseQueryResult<Stats> {
  return useQuery({
    queryKey: queryKeys.stats(),
    queryFn: () => getStats(),
  });
}

export function useQuestions(params?: QuestionFilterParams): UseQueryResult<Question[]> {
  return useQuery({
    queryKey: queryKeys.questions(params),
    queryFn: () => getQuestions(params),
  });
}

interface UpdateProgressVars {
  questionId: number;
  status: ProgressStatus;
  notes?: string | null;
  topicSlug?: string;
}

interface MutationContext {
  prev?: TopicWithQuestions;
  key?: readonly unknown[];
}

export function useUpdateProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, status, notes }: UpdateProgressVars) =>
      updateProgress(questionId, status, notes),
    // Optimistic update — patch the cached topic immediately so the UI feels
    // instant and we don't need to refetch the whole topic on every click.
    onMutate: async ({ questionId, status, notes, topicSlug }: UpdateProgressVars): Promise<MutationContext> => {
      if (!topicSlug) return {};
      const key = queryKeys.topic(topicSlug);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TopicWithQuestions>(key);
      if (prev?.questions) {
        qc.setQueryData<TopicWithQuestions>(key, {
          ...prev,
          questions: prev.questions.map((q) =>
            q.id === questionId
              ? { ...q, status, notes: notes ?? q.notes }
              : q,
          ),
          completed_count: prev.questions.reduce<number>(
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
    onError: (_err: unknown, _vars: UpdateProgressVars, ctx: MutationContext | undefined) => {
      // Roll back the optimistic patch.
      if (ctx?.prev && ctx.key) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_data, _err, { topicSlug }: UpdateProgressVars) => {
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
