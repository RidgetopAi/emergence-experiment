import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000, // 30 minutes
      gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  emergence: {
    all: ['emergence'] as const,
    entries: () => [...queryKeys.emergence.all, 'entries'] as const,
    entry: (id: string) => [...queryKeys.emergence.all, 'entry', id] as const,
    patterns: () => [...queryKeys.emergence.all, 'patterns'] as const,
    statistics: () => [...queryKeys.emergence.all, 'statistics'] as const,
    search: (query: string) => [...queryKeys.emergence.all, 'search', query] as const,
  },
  aidis: {
    all: ['aidis'] as const,
    ping: () => [...queryKeys.aidis.all, 'ping'] as const,
    project: (name: string) => [...queryKeys.aidis.all, 'project', name] as const,
  },
} as const;