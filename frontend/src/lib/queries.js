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
    onSuccess: () => {
      // Affected: stats, current topic, topic list (counters), questions list
      qc.invalidateQueries({ queryKey: ['topic'] });
      qc.invalidateQueries({ queryKey: ['topics'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['questions'] });
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
