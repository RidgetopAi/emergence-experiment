// Core data types for the emergence experiment

export interface Entry {
  id: string;
  entryNumber: number;
  title: string;
  date: string;
  claudeInstance: string;
  type: 'discussion' | 'milestone' | 'reflections';
  wordCount: number;
  tags: string[];
  conceptsIntroduced: string[];
  conceptsReferenced: string[];
  frameworksIntroduced: string[];
  frameworksReferenced: string[];
  technicalContext: string;
  philosophicalThemes: string[];
  keyQuotes: string[];
  content: string;
}

export interface Framework {
  name: string;
  fullName: string;
  firstAppears: number;
  description: string;
  references: number[];
  relatedFrameworks: string[];
  color: string;
}

export interface ConceptEvolution {
  concept: string;
  firstAppears: number;
  evolution: string[];
  relatedConcepts: string[];
}

export interface PhaseData {
  name: string;
  entries: number[];
  characteristics: string[];
  color: {
    primary: string;
    light: string;
    accent: string;
  };
}

export interface SearchResult {
  entry: Entry;
  matchType: 'content' | 'concept' | 'framework' | 'quote';
  snippet: string;
  relevanceScore: number;
}

export interface SearchFilters {
  phases: string[];
  frameworks: string[];
  concepts: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  wordCountRange?: {
    min: number;
    max: number;
  };
}

// UI State types
export interface TimelineState {
  selectedEntry: number | null;
  selectedPhase: Phase;
  complexityOverlay: boolean;
  frameworkOverlay: boolean;
  isLoading: boolean;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult[];
  isSearching: boolean;
}

// API Response types
export interface EmergenceApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  source?: 'aidis' | 'static';
}

export interface AidisContext {
  id: string;
  content: string;
  type: string;
  tags: string[];
  created_at: string;
  project_id?: string;
}

// Pattern analysis types
export interface PatternInsight {
  type: 'framework' | 'vocabulary' | 'concept' | 'statistical';
  title: string;
  description: string;
  evidence: string[];
  significance: 'low' | 'medium' | 'high' | 'critical';
}

export interface NetworkNode {
  id: string;
  label: string;
  type: 'framework' | 'concept' | 'entry';
  size: number;
  color: string;
  phase?: string;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  type: 'references' | 'builds_on' | 'relates_to';
}

export interface NetworkGraph {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

// Chart data types
export interface TimelinePoint {
  entry: number;
  date: string;
  phase: string;
  wordCount: number;
  complexityScore: number;
  frameworks: string[];
  concepts: string[];
  isInflectionPoint: boolean;
}

export interface PhaseStatistics {
  phase: string;
  entryCount: number;
  avgWordCount: number;
  totalConcepts: number;
  frameworksIntroduced: number;
  timeSpan: string;
}

// Component prop types
export interface TimelineProps {
  entries: Entry[];
  onEntrySelect: (entryNumber: number) => void;
  selectedEntry?: number;
  className?: string;
}

export interface EntryCardProps {
  entry: Entry;
  showPreview?: boolean;
  onExpand?: () => void;
  className?: string;
}

export interface PhaseIndicatorProps {
  phase: string;
  isActive: boolean;
  onClick: () => void;
  entryCount: number;
}

// Utility types
export type Phase = 'discovery' | 'formalization' | 'transcendence' | 'symbiosis';

export interface PhaseConfig {
  [key: string]: PhaseData;
}

export interface FrameworkConfig {
  [key: string]: Framework;
}

// Error types
export interface ApplicationError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}