import { QueryClient } from '@tanstack/react-query';

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
  topics: (level) => (level ? ['topics', { level }] : ['topics']),
  topic: (slug) => ['topic', slug],
  stats: () => ['stats'],
  questions: (params) => ['questions', params || {}],
};
