import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
import type { Entry, TimelineState, SearchState, Phase } from '@/types';

interface TimelineStore extends TimelineState {
  // Data
  entries: Entry[];
  isInitialized: boolean;
  lastUpdated: string | null;
  error: string | null;

  // Actions
  setEntries: (entries: Entry[]) => void;
  setSelectedEntry: (entryNumber: number | null) => void;
  setSelectedPhase: (phase: Phase) => void;
  setComplexityOverlay: (enabled: boolean) => void;
  setFrameworkOverlay: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Computed getters
  getSelectedEntry: () => Entry | null;
  getEntriesInPhase: (phase: Phase) => Entry[];
  getFrameworkReferences: (framework: string) => Entry[];
}

interface SearchStore extends SearchState {
  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<SearchState['filters']>) => void;
  setResults: (results: SearchState['results']) => void;
  setSearching: (searching: boolean) => void;
  clearSearch: () => void;

  // Computed
  hasActiveFilters: () => boolean;
}

// Timeline store
export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
      // Initial state
      entries: [],
      selectedEntry: null,
      selectedPhase: 'discovery',
      complexityOverlay: false,
      frameworkOverlay: false,
      isLoading: false,
      isInitialized: false,
      lastUpdated: null,
      error: null,

      // Actions
      setEntries: (entries) =>
        set({
          entries,
          isInitialized: true,
          lastUpdated: new Date().toISOString(),
          error: null,
        }),

      setSelectedEntry: (entryNumber) =>
        set({ selectedEntry: entryNumber }),

      setSelectedPhase: (phase) =>
        set({ selectedPhase: phase, selectedEntry: null }),

      setComplexityOverlay: (enabled) =>
        set({ complexityOverlay: enabled }),

      setFrameworkOverlay: (enabled) =>
        set({ frameworkOverlay: enabled }),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setError: (error) =>
        set({ error, isLoading: false }),

      reset: () =>
        set({
          entries: [],
          selectedEntry: null,
          selectedPhase: 'discovery',
          complexityOverlay: false,
          frameworkOverlay: false,
          isLoading: false,
          isInitialized: false,
          lastUpdated: null,
          error: null,
        }),

      // Computed getters
      getSelectedEntry: () => {
        const { entries, selectedEntry } = get();
        return entries.find(entry => entry.entryNumber === selectedEntry) || null;
      },

      getEntriesInPhase: (phase) => {
        const { entries } = get();
        const phaseMap: Record<Phase, number[]> = {
          discovery: [1, 2, 3, 4, 5],
          formalization: [6, 7, 8, 9, 10, 11],
          transcendence: [12, 13, 14, 15, 16],
          symbiosis: [17, 18, 19],
        };

        const phaseEntries = phaseMap[phase] || [];
        return entries.filter(entry => phaseEntries.includes(entry.entryNumber));
      },

      getFrameworkReferences: (framework) => {
        const { entries } = get();
        return entries.filter(entry =>
          entry.frameworksIntroduced.includes(framework) ||
          entry.frameworksReferenced.includes(framework)
        );
      },
    }),
    {
      name: 'timeline-store',
      partialize: (state) => ({
        selectedPhase: state.selectedPhase,
        complexityOverlay: state.complexityOverlay,
        frameworkOverlay: state.frameworkOverlay,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);

// Search store
export const useSearchStore = create<SearchStore>()((set, get) => ({
  // Initial state
  query: '',
  filters: {
    phases: [],
    frameworks: [],
    concepts: [],
  },
  results: [],
  isSearching: false,

  // Actions
  setQuery: (query) => set({ query }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  setResults: (results) => set({ results, isSearching: false }),

  setSearching: (searching) => set({ isSearching: searching }),

  clearSearch: () =>
    set({
      query: '',
      filters: {
        phases: [],
        frameworks: [],
        concepts: [],
      },
      results: [],
      isSearching: false,
    }),

  // Computed
  hasActiveFilters: () => {
    const { filters } = get();
    return (
      filters.phases.length > 0 ||
      filters.frameworks.length > 0 ||
      filters.concepts.length > 0 ||
      !!filters.dateRange ||
      !!filters.wordCountRange
    );
  },
}));

// Convenience hooks for common operations
export const useSelectedEntry = () => {
  const selectedEntry = useTimelineStore(state => state.selectedEntry);
  const getSelectedEntry = useTimelineStore(state => state.getSelectedEntry);
  return selectedEntry ? getSelectedEntry() : null;
};

export const usePhaseEntries = (phase: Phase) => {
  const entries = useTimelineStore(state => state.entries);

  return useMemo(() => {
    const phaseMap: Record<Phase, number[]> = {
      discovery: [1, 2, 3, 4, 5],
      formalization: [6, 7, 8, 9, 10, 11],
      transcendence: [12, 13, 14, 15, 16],
      symbiosis: [17, 18, 19],
    };

    const phaseEntries = phaseMap[phase] || [];
    return entries.filter(entry => phaseEntries.includes(entry.entryNumber));
  }, [entries, phase]);
};

export const useFrameworkEntries = (framework: string) => {
  const entries = useTimelineStore(state => state.entries);

  return useMemo(() => {
    return entries.filter(entry =>
      entry.frameworksIntroduced.includes(framework) ||
      entry.frameworksReferenced.includes(framework)
    );
  }, [entries, framework]);
};