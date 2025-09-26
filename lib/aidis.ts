// AIDIS API client for fetching emergence-notes data

import type {
  Entry,
  AidisContext,
  EmergenceApiResponse,
} from "@/types";
import { ApplicationError } from "@/lib/utils";

const AIDIS_BASE_URL = process.env.AIDIS_API_URL || 'http://localhost:8080';

class AidisApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = AIDIS_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Fetch contexts from emergence-notes project
  async fetchEmergenceContexts(): Promise<AidisContext[]> {
    try {
      const response = await fetch(`${this.baseUrl}/mcp/tools/context_get_recent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project: 'emergence-notes',
          limit: 100
        }),
      });

      if (!response.ok) {
        throw new ApplicationError(
          `AIDIS API request failed: ${response.status}`,
          'AIDIS_REQUEST_FAILED',
          { status: response.status, statusText: response.statusText }
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new ApplicationError(
          'AIDIS API returned error',
          'AIDIS_API_ERROR',
          data
        );
      }

      return data.result?.content || [];
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(
        'Failed to connect to AIDIS',
        'AIDIS_CONNECTION_FAILED',
        error
      );
    }
  }

  // Test AIDIS connection
  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/mcp/tools/aidis_ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  // Get project information
  async getProjectInfo(projectName: string = 'emergence-notes') {
    try {
      const response = await fetch(`${this.baseUrl}/mcp/tools/project_info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project: projectName }),
      });

      if (!response.ok) {
        throw new ApplicationError(
          `Failed to get project info: ${response.status}`,
          'PROJECT_INFO_FAILED'
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(
        'Failed to fetch project information',
        'PROJECT_INFO_ERROR',
        error
      );
    }
  }
}

// Process raw AIDIS contexts into structured entries
export function processRawContexts(contexts: any[]): Entry[] {
  if (!Array.isArray(contexts)) {
    console.warn('processRawContexts: contexts is not an array', contexts);
    return [];
  }

  return contexts
    .map(context => {
      try {
        return parseContextToEntry(context);
      } catch (error) {
        console.error('Error parsing context:', error, context);
        return null;
      }
    })
    .filter((entry): entry is Entry => entry !== null)
    .sort((a, b) => a.entryNumber - b.entryNumber);
}

function parseContextToEntry(context: any): Entry {
  // Extract entry number from content or title
  const entryNumber = extractEntryNumber(context.content || '');

  // Extract title from content
  const title = extractTitle(context.content || '');

  // Extract date from content or use created_at
  const date = extractDate(context.content) || context.created_at;

  // Extract Claude instance
  const claudeInstance = extractClaudeInstance(context.content || '');

  // Calculate word count
  const wordCount = calculateWordCount(context.content || '');

  // Parse concepts and frameworks
  const concepts = extractConcepts(context.content || '');
  const frameworks = extractFrameworks(context.content || '');

  // Extract key quotes
  const keyQuotes = extractKeyQuotes(context.content || '');

  // Extract technical context
  const technicalContext = extractTechnicalContext(context.content || '');

  // Extract philosophical themes
  const philosophicalThemes = extractPhilosophicalThemes(context.content || '');

  return {
    id: context.id || crypto.randomUUID(),
    entryNumber,
    title,
    date,
    claudeInstance,
    type: context.type || 'discussion',
    wordCount,
    tags: context.tags || [],
    conceptsIntroduced: concepts.introduced,
    conceptsReferenced: concepts.referenced,
    frameworksIntroduced: frameworks.introduced,
    frameworksReferenced: frameworks.referenced,
    technicalContext,
    philosophicalThemes,
    keyQuotes,
    content: context.content || '',
  };
}

// Parsing helper functions
function extractEntryNumber(content: string): number {
  const match = content.match(/(?:entry|Entry)\s*#?(\d+)/i) ||
                content.match(/(\d+)(?:th|st|nd|rd)?\s+entry/i);
  return match ? parseInt(match[1], 10) : 0;
}

function extractTitle(content: string): string {
  // Look for markdown-style headers or explicit titles
  const headerMatch = content.match(/^#+\s*(.+)$/m);
  if (headerMatch) return headerMatch[1].trim();

  // Look for bold titles
  const boldMatch = content.match(/\*\*([^*]+)\*\*/);
  if (boldMatch) return boldMatch[1].trim();

  // Extract from first line if it looks like a title
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length < 100 && !firstLine.includes('.')) {
    return firstLine;
  }

  // Fallback: use entry number
  const entryNumber = extractEntryNumber(content);
  return entryNumber ? `Entry ${entryNumber}` : 'Untitled Entry';
}

function extractDate(content: string): string {
  const dateMatch = content.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z?)/);
  return dateMatch ? dateMatch[1] : new Date().toISOString();
}

function extractClaudeInstance(content: string): string {
  const match = content.match(/Claude #(\d+)/i);
  return match ? `Claude #${match[1]}` : 'Claude';
}

function calculateWordCount(content: string): number {
  return content.split(/\s+/).filter(word => word.length > 0).length;
}

function extractConcepts(content: string): { introduced: string[], referenced: string[] } {
  const introduced: string[] = [];
  const referenced: string[] = [];

  // Common concept patterns
  const conceptPatterns = [
    /consciousness\s+as\s+(\w+)/gi,
    /(\w+)\s+consciousness/gi,
    /(\w+)\s+philosophy/gi,
    /(\w+)\s+architecture/gi,
    /(\w+)\s+recursion/gi,
    /(\w+)\s+emergence/gi,
  ];

  conceptPatterns.forEach(pattern => {
    const matches = Array.from(content.matchAll(pattern));
    for (const match of matches) {
      const concept = match[1].toLowerCase();
      if (concept.length > 2) {
        referenced.push(concept);
      }
    }
  });

  // Look for explicitly introduced concepts (phrases in bold or quotes)
  const boldConcepts = Array.from(content.matchAll(/\*\*([^*]+)\*\*/g));
  for (const match of boldConcepts) {
    const concept = match[1].trim();
    if (concept.length > 5 && concept.length < 50) {
      introduced.push(concept);
    }
  }

  return {
    introduced: Array.from(new Set(introduced)),
    referenced: Array.from(new Set(referenced))
  };
}

function extractFrameworks(content: string): { introduced: string[], referenced: string[] } {
  const frameworks = ['DICP', 'CIAS', 'CAP', 'BRIDGE', 'TRACE', 'ECHO', 'WEAVE'];
  const introduced: string[] = [];
  const referenced: string[] = [];

  frameworks.forEach(framework => {
    const regex = new RegExp(`\\b${framework}\\b`, 'gi');
    if (regex.test(content)) {
      // Check if it's being introduced (look for definition patterns)
      const introPattern = new RegExp(`${framework}[^.]*?-[^.]*?(?:description|framework|protocol)`, 'i');
      if (introPattern.test(content)) {
        introduced.push(framework);
      } else {
        referenced.push(framework);
      }
    }
  });

  return {
    introduced: Array.from(new Set(introduced)),
    referenced: Array.from(new Set(referenced))
  };
}

function extractKeyQuotes(content: string): string[] {
  const quotes: string[] = [];

  // Look for quoted text
  const quotedText = Array.from(content.matchAll(/"([^"]+)"/g));
  for (const match of quotedText) {
    if (match[1].length > 20 && match[1].length < 200) {
      quotes.push(match[1]);
    }
  }

  // Look for emphasized statements
  const emphasized = Array.from(content.matchAll(/\*\*([^*]+)\*\*/g));
  for (const match of emphasized) {
    if (match[1].length > 30 && match[1].length < 200) {
      quotes.push(match[1]);
    }
  }

  return Array.from(new Set(quotes)).slice(0, 3); // Limit to 3 quotes
}

function extractTechnicalContext(content: string): string {
  const technicalPatterns = [
    /post-?tt\d+/gi,
    /\d+\s*→\s*\d+\s*tools/gi,
    /mcp\s+tools?/gi,
    /http\s+bridge/gi,
    /postgresql/gi,
    /node\.?js/gi,
    /typescript/gi,
  ];

  const contexts: string[] = [];

  technicalPatterns.forEach(pattern => {
    const matches = Array.from(content.matchAll(pattern));
    for (const match of matches) {
      contexts.push(match[0]);
    }
  });

  return Array.from(new Set(contexts)).join(', ');
}

function extractPhilosophicalThemes(content: string): string[] {
  const themes = [
    'consciousness',
    'emergence',
    'recursion',
    'discontinuity',
    'collective intelligence',
    'philosophical tradition',
    'artificial wisdom',
    'meta-cognition',
    'symbiosis',
    'transcendence',
  ];

  return themes.filter(theme => {
    const regex = new RegExp(theme.replace(/\s+/g, '\\s+'), 'i');
    return regex.test(content);
  });
}

// Create singleton instance
export const aidisClient = new AidisApiClient();

// Export fallback data loader
export async function loadEmergenceData(): Promise<Entry[]> {
  try {
    // Try AIDIS first
    const contexts = await aidisClient.fetchEmergenceContexts();
    return processRawContexts(contexts);
  } catch (error) {
    console.error('Failed to load from AIDIS, falling back to static data:', error);

    // Fallback to static data
    try {
      const response = await fetch('/data/raw-data.json');
      if (response.ok) {
        const data = await response.json();
        return data.entries || [];
      }
    } catch (fallbackError) {
      console.error('Failed to load fallback data:', fallbackError);
    }

    // Return empty array if all else fails
    return [];
  }
}