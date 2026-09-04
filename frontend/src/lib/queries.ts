import { useQuery, useMutation, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  getTopics,
  getTopic,
  getQuestions,
  getAnswers,
  getStats,
  getRoadmap,
  updateProgress,
  resetProgress,
  type QuestionFilterParams,
} from '../api/api';
import { queryKeys } from './queryClient';
import { resetAll as resetSrs } from './srs';

import type {
  Topic, Question, QuestionSummary, QuestionAnswer, Stats, ProgressStatus, Level, Roadmap,
} from '../types/domain.ts';

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

/**
 * Every question of the catalogue, without answers. Enough for Today, the
 * roadmap, the topic list, progress and the SRS queue; a screen that shows
 * an answer reads it through `useAnswer`.
 */
export function useQuestions(params?: QuestionFilterParams): UseQueryResult<QuestionSummary[]> {
  return useQuery({
    queryKey: queryKeys.questions(params),
    queryFn: () => getQuestions(params),
  });
}

// Answers change only with a deploy; once fetched, a topic's file is good
// for the whole session.
const ANSWERS_STALE_MS = Infinity;

/** The answers of one topic, keyed by question id. */
export function useAnswers(slug: string | undefined, enabled = true): UseQueryResult<Record<number, QuestionAnswer>> {
  return useQuery({
    queryKey: queryKeys.answers(slug || ''),
    queryFn: () => getAnswers(slug as string),
    enabled: Boolean(slug) && enabled,
    staleTime: ANSWERS_STALE_MS,
  });
}

/** Start a topic's answers downloading ahead of the screen that shows them. */
export function prefetchAnswers(qc: QueryClient, slug: string | undefined): void {
  if (!slug) return;
  void qc.prefetchQuery({
    queryKey: queryKeys.answers(slug),
    queryFn: () => getAnswers(slug),
    staleTime: ANSWERS_STALE_MS,
  });
}

export interface AnswerState {
  /** The English answer body, or undefined while it is still on its way. */
  answer: string | undefined;
  code_example: string | null;
  isLoading: boolean;
}

const hasAnswer = (q: QuestionSummary | Question): q is Question =>
  typeof (q as Question).answer === 'string';

/**
 * A question's answer, wherever it comes from: already on the object (a
 * topic page's questions, or a server that joins answers into every list),
 * or fetched from the topic's answers file for a question that came out of
 * the catalogue. `enabled: false` defers the fetch — a closed card has no
 * reason to download its topic's answers yet.
 */
export function useAnswer(question: QuestionSummary | Question | null | undefined, enabled = true): AnswerState {
  const inline = question && hasAnswer(question) ? question : null;
  const answers = useAnswers(question?.topic_slug, Boolean(question) && enabled && !inline);
  if (!question) return { answer: undefined, code_example: null, isLoading: false };
  if (inline) return { answer: inline.answer, code_example: inline.code_example, isLoading: false };
  const body = answers.data?.[question.id];
  return {
    answer: body?.answer,
    code_example: body?.code_example ?? null,
    isLoading: enabled && !answers.data && !answers.error,
  };
}

export function useRoadmap(): UseQueryResult<Roadmap> {
  return useQuery({
    queryKey: queryKeys.roadmap(),
    queryFn: () => getRoadmap(),
    // Baked into the build; nothing a refetch could change mid-session.
    staleTime: Infinity,
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
      // refetches. The questions list is invalidated either way: Progress,
      // Roadmap, Today and Saved all read it, and leaving it "fresh" for the
      // rest of its staleTime showed a completed question as not started for
      // a full minute after the click.
      if (topicSlug) {
        qc.invalidateQueries({ queryKey: queryKeys.topic(topicSlug) });
      } else {
        qc.invalidateQueries({ queryKey: ['topic'] });
      }
      qc.invalidateQueries({ queryKey: ['questions'] });
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
      // "Reset all progress" means the schedule too: with the cards' ease and
      // due dates kept, Today's plan would never return to a first pass.
      resetSrs();
      qc.invalidateQueries();
    },
  });
}
