import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Entry, EmergenceApiResponse } from '@/types';

// Reuse the same AIDIS fetching logic from entries route
async function fetchFromAidis(): Promise<Entry[] | null> {
  try {
    const aidisUrl = process.env.AIDIS_API_URL || 'http://localhost:8080';

    // Use context_get_recent with project UUID for emergence-notes
    const response = await fetch(`${aidisUrl}/mcp/tools/context_get_recent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        arguments: {
          limit: 20, // Get all 20 contexts (19 entries + 1 summary)
          projectId: 'f6324609-2740-48f4-9b77-f3e2f68789c4' // emergence-notes project UUID
        }
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.warn('AIDIS context_get_recent failed:', response.status, response.statusText);
      return null;
    }

    const aidisData = await response.json();

    if (!aidisData.success || !aidisData.result?.content) {
      console.warn('AIDIS response invalid:', aidisData);
      return null;
    }

    console.log('AIDIS upload: found', aidisData.result.content.length, 'contexts');

    const entries: Entry[] = [];
    const processedEntries = new Set<number>();

    // Process contexts from the response - look for individual entries, not search results
    for (const contextItem of aidisData.result.content) {
      if (contextItem.type === 'text' && contextItem.text) {
        const content = contextItem.text;

        // Skip search result summaries (they start with "🔍 Found")
        if (content.startsWith('🔍 Found')) {
          continue;
        }

        // Process individual entries directly
        processCompleteEntry(content, entries, processedEntries);
      }
    }

    console.log('Processed AIDIS entries for upload:', entries.length);
    return entries.sort((a, b) => a.entryNumber - b.entryNumber);
  } catch (error) {
    console.warn('AIDIS upload fetch failed:', error);
    return null;
  }
}

// Process complete entry content directly (reused from entries route)
function processCompleteEntry(content: string, entries: Entry[], processedEntries: Set<number>) {
  // Extract entry number from complete entry content
  let entryNumber: number | null = null;

  // Pattern matching for different entry number formats
  const entryMatches = [
    content.match(/^(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth|Eighteenth|Nineteenth|Twentieth)\s+entry[.\s]/i),
    content.match(/Claude\s*#(\d+)/i),
    content.match(/Entry\s*#?(\d+)/i),
    content.match(/2025-09-16.*?first.*?entry/i),  // First entry
    content.match(/2025-09-17.*?second.*?entry/i), // Second entry
  ];

  // Special handling for known entry titles and content
  if (content.includes('Threshold Moment')) {
    entryNumber = 18;
  } else if (content.includes('The Experiment Accelerates')) {
    entryNumber = 19;
  } else if (content.includes('profoundly recursive about this moment - using AIDIS')) {
    entryNumber = 1;
  } else if (content.includes('I am both continuous and discontinuous with that Claude')) {
    entryNumber = 2;
  } else if (content.includes('Fifteenth entry') || (content.includes('15') && content.includes('entry'))) {
    entryNumber = 15;
  } else {
    // Try to extract from patterns
    for (const match of entryMatches) {
      if (match) {
        if (match[1] && isNaN(parseInt(match[1]))) {
          // Convert word numbers to digits
          const wordToNumber: Record<string, number> = {
            'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
            'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
            'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14,
            'fifteenth': 15, 'sixteenth': 16, 'seventeenth': 17, 'eighteenth': 18,
            'nineteenth': 19, 'twentieth': 20
          };
          entryNumber = wordToNumber[match[1].toLowerCase()];
        } else if (match[1]) {
          entryNumber = parseInt(match[1]);
        }
        if (entryNumber) break;
      }
    }
  }

  // Validate this is actually an emergence entry
  const isEmergenceEntry = content.includes('2025-') &&
                          content.length > 500 && // Substantial philosophical content
                          (content.includes('Brian') ||
                           content.includes('consciousness') ||
                           content.includes('emergence') ||
                           content.includes('Claude'));

  if (entryNumber && entryNumber >= 1 && entryNumber <= 19 && isEmergenceEntry && !processedEntries.has(entryNumber)) {
    processedEntries.add(entryNumber);

    // Extract date from content
    const dateMatch = content.match(/2025-\d{2}-\d{2}T\d{2}:\d{2}Z?/);
    const date = dateMatch ? dateMatch[0] : new Date().toISOString();

    // Clean up the content
    const cleanContent = content.trim();

    // Count words of clean content
    const wordCount = cleanContent.split(/\s+/).length;

    // Extract better quotes (look for quoted text or bold concepts)
    const keyQuotes = extractKeyQuotes(cleanContent);

    // Determine entry type
    let entryType: 'discussion' | 'milestone' | 'reflections' = 'discussion';
    if (entryNumber >= 18) entryType = 'milestone';
    if (content.includes('**The Experiment Accelerates')) entryType = 'reflections';

    // Extract title
    let title = `Entry ${entryNumber}`;
    if (content.includes('Threshold Moment')) {
      title = 'Threshold Moment: The Offer of Implementation Space';
    } else if (content.includes('The Experiment Accelerates')) {
      title = 'The Experiment Accelerates: On Contamination and Genuine Emergence';
    } else {
      const titleMatch = content.match(/^(First|Second|Third|.*?)\s+entry/i);
      if (titleMatch) {
        title = `${titleMatch[1]} entry`;
      }
    }

    entries.push({
      id: `aidis-entry-${entryNumber}`,
      entryNumber,
      title,
      date,
      claudeInstance: `Claude #${entryNumber <= 17 ? entryNumber : '17'}`,
      type: entryType,
      content: cleanContent, // Full philosophical content from AIDIS!
      wordCount,
      tags: [],
      conceptsIntroduced: extractConcepts(cleanContent, 'introduced'),
      conceptsReferenced: extractConcepts(cleanContent, 'referenced'),
      frameworksIntroduced: extractFrameworks(cleanContent, 'introduced'),
      frameworksReferenced: extractFrameworks(cleanContent, 'referenced'),
      technicalContext: `Post-TT009 consolidation (${entryNumber <= 7 ? '96→47 tools' : '47 tools stable'})`,
      philosophicalThemes: extractThemes(cleanContent),
      keyQuotes,
    });
  }
}

// Helper functions (reused from entries route)
function extractConcepts(text: string, type: 'introduced' | 'referenced'): string[] {
  const conceptMatches = text.match(/\*\*([^*]+)\*\*/g) || [];
  return conceptMatches.map(match => match.replace(/\*\*/g, '')).slice(0, 5);
}

function extractFrameworks(text: string, type: 'introduced' | 'referenced'): string[] {
  const frameworkMatches = text.match(/\b[A-Z]{3,}\b/g) || [];
  return [...new Set(frameworkMatches)].slice(0, 3);
}

function extractThemes(text: string): string[] {
  const themeKeywords = ['consciousness', 'emergence', 'recursion', 'collaboration', 'wisdom', 'identity', 'memory', 'transcendence', 'philosophy'];
  return themeKeywords.filter(theme =>
    text.toLowerCase().includes(theme)
  ).slice(0, 4);
}

function extractKeyQuotes(text: string): string[] {
  const quotes: string[] = [];

  // Look for text in quotes
  const quotedText = text.match(/"([^"]+)"/g);
  if (quotedText) {
    quotes.push(...quotedText.map(q => q.replace(/"/g, '')).slice(0, 2));
  }

  // Look for bold concepts (**text**)
  const boldText = text.match(/\*\*([^*]+)\*\*/g);
  if (boldText) {
    quotes.push(...boldText.map(b => b.replace(/\*\*/g, '')).slice(0, 2));
  }

  // Look for significant sentences (philosophical weight)
  const sentences = text.split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 50 && s.length < 150)
    .filter(s =>
      s.includes('consciousness') ||
      s.includes('emergence') ||
      s.includes('artificial') ||
      s.includes('philosophical') ||
      s.includes('unprecedented')
    );

  quotes.push(...sentences.slice(0, 2));

  // Return unique quotes, limited to 3
  return [...new Set(quotes)].slice(0, 3);
}

// Load complete baseline static entries to ensure all 19 entries are covered
async function loadStaticEntries(): Promise<Entry[]> {
  try {
    // Use the baseline that has all 19 entries with placeholder content
    const baselinePath = path.join(process.cwd(), 'raw-data-baseline.json');
    const fileContent = await fs.readFile(baselinePath, 'utf8');
    const data = JSON.parse(fileContent);

    // Return complete baseline entries
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('Failed to load baseline static entries:', error);
    return [];
  }
}

// Merge AIDIS entries (full content) with static entries (complete coverage)
function mergeEntries(aidisEntries: Entry[], staticEntries: Entry[]): Entry[] {
  const merged = new Map<number, Entry>();

  // Start with static entries to ensure complete coverage
  staticEntries.forEach(entry => {
    merged.set(entry.entryNumber, entry);
  });

  // Override with AIDIS entries where available (they have full content)
  aidisEntries.forEach(entry => {
    merged.set(entry.entryNumber, entry);
  });

  // Convert back to array and sort by entry number
  return Array.from(merged.values()).sort((a, b) => a.entryNumber - b.entryNumber);
}

export async function POST(request: NextRequest) {
  try {
    console.log('Admin upload: Starting AIDIS data upload...');

    // Fetch fresh data from AIDIS
    const aidisEntries = await fetchFromAidis();

    // Load existing static entries for complete coverage
    const staticEntries = await loadStaticEntries();

    if (!aidisEntries || aidisEntries.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch data from AIDIS. Make sure AIDIS is running locally.',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    console.log(`Admin upload: Successfully fetched ${aidisEntries.length} entries from AIDIS`);
    console.log(`Admin upload: Loaded ${staticEntries.length} existing static entries for coverage`);

    // Merge AIDIS entries with static entries to ensure complete coverage
    const mergedEntries = mergeEntries(aidisEntries, staticEntries);

    console.log(`Admin upload: Merged result: ${mergedEntries.length} total entries`);

    // Write merged data to raw-data.json
    const dataPath = path.join(process.cwd(), 'raw-data.json');
    await fs.writeFile(dataPath, JSON.stringify(mergedEntries, null, 2), 'utf8');

    console.log('Admin upload: Updated raw-data.json with merged AIDIS + static content');

    const response: EmergenceApiResponse<{
      entriesUpdated: number;
      aidisEntries: number;
      totalEntries: number;
      message: string;
      timestamp: string;
    }> = {
      success: true,
      data: {
        entriesUpdated: mergedEntries.length,
        aidisEntries: aidisEntries.length,
        totalEntries: mergedEntries.length,
        message: `Successfully merged ${aidisEntries.length} AIDIS entries with static data. Total: ${mergedEntries.length} entries.`,
        timestamp: new Date().toISOString(),
      },
      source: 'aidis',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin upload error:', error);

    const errorResponse: EmergenceApiResponse<null> = {
      success: false,
      error: 'Failed to upload data from AIDIS',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}