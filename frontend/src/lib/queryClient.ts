import { QueryClient } from '@tanstack/react-query';

import type { Level } from '../types/domain.ts';
import type { QuestionFilterParams } from '../api/api.ts';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  topics: (level?: Level) => (level ? ['topics', { level }] as const : ['topics'] as const),
  topic: (slug: string) => ['topic', slug] as const,
  stats: () => ['stats'] as const,
  questions: (params?: QuestionFilterParams) => ['questions', params || {}] as const,
};
