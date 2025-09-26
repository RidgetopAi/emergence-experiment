import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryClient';
import type { Entry, EmergenceApiResponse } from '@/types';

// Fetch emergence entries
export function useEmergenceEntries() {
  return useQuery({
    queryKey: queryKeys.emergence.entries(),
    queryFn: async (): Promise<Entry[]> => {
      const response = await fetch('/api/emergence/entries');

      if (!response.ok) {
        throw new Error(`Failed to fetch entries: ${response.status}`);
      }

      const data: EmergenceApiResponse<Entry[]> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch entries');
      }

      return data.data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 30 * 60 * 1000, // Check for updates every 30 minutes
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}

// Manual refresh mutation
export function useRefreshEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ entries: Entry[]; count: number }> => {
      const response = await fetch('/api/emergence/entries', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const data: EmergenceApiResponse<{ entries: Entry[]; count: number }> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Refresh failed');
      }

      return data.data!;
    },
    onSuccess: (data) => {
      // Update the cache with fresh data
      queryClient.setQueryData(queryKeys.emergence.entries(), data.entries);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.emergence.all });
    },
  });
}

// AIDIS connection status
export function useAidisConnection() {
  return useQuery({
    queryKey: queryKeys.aidis.ping(),
    queryFn: async (): Promise<boolean> => {
      try {
        const response = await fetch('/api/aidis/ping');

        if (!response.ok) {
          return false;
        }

        const data: EmergenceApiResponse<{ connected: boolean }> = await response.json();
        return data.success && data.data?.connected === true;
      } catch {
        return false;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Check connection every 5 minutes
    retry: 1,
  });
}

// Search entries (client-side for now)
export function useSearchEntries(query: string, entries: Entry[]) {
  return useQuery({
    queryKey: queryKeys.emergence.search(query),
    queryFn: async (): Promise<Entry[]> => {
      if (!query.trim()) return entries;

      const searchTerms = query.toLowerCase().split(/\s+/);

      return entries.filter(entry => {
        const searchableText = [
          entry.title,
          entry.content,
          entry.claudeInstance,
          ...entry.tags,
          ...entry.conceptsIntroduced,
          ...entry.conceptsReferenced,
          ...entry.frameworksIntroduced,
          ...entry.frameworksReferenced,
          ...entry.philosophicalThemes,
          ...entry.keyQuotes,
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      });
    },
    enabled: !!query && entries.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get entry by number
export function useEntry(entryNumber: number) {
  const { data: entries } = useEmergenceEntries();

  return useQuery({
    queryKey: queryKeys.emergence.entry(entryNumber.toString()),
    queryFn: async (): Promise<Entry | null> => {
      if (!entries) return null;
      return entries.find(entry => entry.entryNumber === entryNumber) || null;
    },
    enabled: !!entries && entryNumber > 0,
  });
}

// Statistics derived from entries
export function useEmergenceStatistics() {
  const { data: entries, isLoading } = useEmergenceEntries();

  return useQuery({
    queryKey: queryKeys.emergence.statistics(),
    queryFn: async () => {
      if (!entries || entries.length === 0) return null;

      const totalEntries = entries.length;
      const totalWords = entries.reduce((sum, entry) => sum + entry.wordCount, 0);
      const averageWords = Math.round(totalWords / totalEntries);

      const frameworks = new Set();
      const concepts = new Set();
      entries.forEach(entry => {
        entry.frameworksIntroduced.forEach(f => frameworks.add(f));
        entry.frameworksReferenced.forEach(f => frameworks.add(f));
        entry.conceptsIntroduced.forEach(c => concepts.add(c));
        entry.conceptsReferenced.forEach(c => concepts.add(c));
      });

      const dateRange = {
        start: entries[0]?.date,
        end: entries[entries.length - 1]?.date,
      };

      const phases = {
        discovery: entries.filter(e => e.entryNumber <= 5).length,
        formalization: entries.filter(e => e.entryNumber >= 6 && e.entryNumber <= 11).length,
        transcendence: entries.filter(e => e.entryNumber >= 12 && e.entryNumber <= 16).length,
        symbiosis: entries.filter(e => e.entryNumber >= 17).length,
      };

      return {
        totalEntries,
        totalWords,
        averageWords,
        frameworkCount: frameworks.size,
        conceptCount: concepts.size,
        dateRange,
        phases,
        lastUpdated: new Date().toISOString(),
      };
    },
    enabled: !isLoading && !!entries,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}