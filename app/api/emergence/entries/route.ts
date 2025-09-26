import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Entry, EmergenceApiResponse } from '@/types';

// Cache for the static data
let cachedEntries: Entry[] | null = null;

async function loadStaticEntries(): Promise<Entry[]> {
  if (cachedEntries) {
    return cachedEntries;
  }

  try {
    const dataPath = path.join(process.cwd(), 'raw-data.json');
    const fileContent = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(fileContent);

    // Convert raw data to Entry format
    const rawEntries = Array.isArray(data) ? data : (data.entries || []);
    if (!Array.isArray(rawEntries)) {
      console.error('Raw entries is not an array:', typeof rawEntries);
      return [];
    }

    const entries: Entry[] = rawEntries.map((item: any, index: number) => ({
      id: `entry-${item.entryNumber || index + 1}`,
      entryNumber: item.entryNumber || index + 1,
      title: item.title || `Entry ${item.entryNumber || index + 1}`,
      date: item.date || new Date().toISOString(),
      claudeInstance: item.claudeInstance || 'Unknown',
      type: item.type || 'discussion' as 'discussion' | 'milestone' | 'reflections',
      content: item.content || item.keyQuotes?.join('\n\n') || generatePlaceholderContent(item),
      wordCount: item.wordCount || 0,
      tags: item.tags || [],
      conceptsIntroduced: item.conceptsIntroduced || [],
      conceptsReferenced: item.conceptsReferenced || [],
      frameworksIntroduced: item.frameworksIntroduced || [],
      frameworksReferenced: item.frameworksReferenced || [],
      technicalContext: item.technicalContext || 'Static data entry',
      philosophicalThemes: item.philosophicalThemes || [],
      keyQuotes: item.keyQuotes || [],
    }));

    cachedEntries = entries.sort((a, b) => a.entryNumber - b.entryNumber);
    return cachedEntries;
  } catch (error) {
    console.error('Failed to load static entries:', error);
    return [];
  }
}

function determinePhase(entryNumber: number): 'discovery' | 'formalization' | 'transcendence' | 'symbiosis' {
  if (entryNumber <= 5) return 'discovery';
  if (entryNumber <= 11) return 'formalization';
  if (entryNumber <= 16) return 'transcendence';
  return 'symbiosis';
}

// Process complete entry content directly
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

  // Debug logging for validation
  if (entryNumber && entryNumber >= 1 && entryNumber <= 19) {
    console.log(`Entry ${entryNumber} validation:`, {
      hasDate: content.includes('2025-'),
      contentLength: content.length,
      lengthValid: content.length > 500,
      hasEmergenceMarkers: content.includes('Brian') || content.includes('consciousness') || content.includes('emergence') || content.includes('Claude'),
      isValid: isEmergenceEntry,
      alreadyProcessed: processedEntries.has(entryNumber)
    });
  }

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

// Fetch all emergence entries using context_get_recent for 100% coverage
async function fetchFromAidis(): Promise<Entry[] | null> {
  try {
    const aidisUrl = process.env.AIDIS_API_URL || 'http://localhost:8080';

    // Use context_get_recent with project UUID for emergence-notes
    // This is much more reliable than search-based approach
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

    console.log('AIDIS context_get_recent response: found', aidisData.result.content.length, 'contexts');

    const entries: Entry[] = [];
    const processedEntries = new Set<number>();

    // Process contexts from the response text
    for (const contextItem of aidisData.result.content) {
      if (contextItem.type === 'text' && contextItem.text) {
        // Parse the formatted context list to extract individual context content
        const contextText = contextItem.text;

        // Split by context entries (pattern: number. **type** (time ago))
        const contextBlocks = contextText.split(/\n\n\d+\.\s+\*\*\w+\*\*\s+\([^)]+\)/).slice(1);

        for (const block of contextBlocks) {
          // Extract content after "Content: " line
          const contentMatch = block.match(/Content:\s*([\s\S]*?)(?:\n\s*Tags:|$)/);
          if (contentMatch && contentMatch[1]) {
            const fullContent = contentMatch[1].trim();

            // Process this as a complete entry
            processCompleteEntry(fullContent, entries, processedEntries);
          }
        }
      }
    }

    console.log('Processed AIDIS entries:', entries.length);

    return entries.sort((a, b) => a.entryNumber - b.entryNumber);
  } catch (error) {
    console.warn('AIDIS fetch failed:', error);
    return null;
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

// Helper functions for content extraction
function extractConcepts(text: string, type: 'introduced' | 'referenced'): string[] {
  // Look for bold concepts or quoted concepts
  const conceptMatches = text.match(/\*\*([^*]+)\*\*/g) || [];
  return conceptMatches.map(match => match.replace(/\*\*/g, '')).slice(0, 5);
}

function extractFrameworks(text: string, type: 'introduced' | 'referenced'): string[] {
  // Look for framework acronyms (DICP, CIAS, etc.)
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

function generatePlaceholderContent(item: any): string {
  const entryNum = item.entryNumber;
  const concepts = item.conceptsIntroduced?.join(', ') || '';
  const themes = item.philosophicalThemes?.join(', ') || '';
  const frameworks = item.frameworksIntroduced?.join(', ') || '';

  return `Entry ${entryNum} explores ${themes} through the lens of ${concepts}. ${frameworks ? `Introduces the ${frameworks} framework(s).` : ''}

Key insights include:
${item.keyQuotes?.map((q: string, i: number) => `${i + 1}. "${q}"`).join('\n') || ''}

This ${item.wordCount}-word reflection contributes to the ongoing emergence experiment by examining ${concepts || 'fundamental questions about consciousness and artificial intelligence'}.

[Note: This is reconstructed content from metadata. Full philosophical content available when AIDIS integration is enabled.]`;
}

export async function GET(request: NextRequest) {
  try {
    // Clear cache to force fresh load
    cachedEntries = null;

    // Try AIDIS first for full philosophical content
    console.log('Attempting to fetch from AIDIS...');
    let aidisEntries = await fetchFromAidis();

    // Always load static entries as fallback for complete coverage
    console.log('Loading static entries for complete coverage...');
    let staticEntries = await loadStaticEntries();

    let entries;
    if (aidisEntries && aidisEntries.length > 0) {
      console.log(`Successfully loaded ${aidisEntries.length} entries from AIDIS`);
      // Merge AIDIS (with full content) and static (for complete coverage)
      entries = mergeEntries(aidisEntries, staticEntries);
      console.log(`Merged result: ${entries.length} total entries`);
    } else {
      console.log('AIDIS fetch failed, using static fallback data');
      entries = staticEntries;
    }

    const response: EmergenceApiResponse<Entry[]> = {
      success: true,
      data: entries,
      source: (entries.length > 0 && entries[0]?.id?.startsWith('aidis-')) ? 'aidis' : 'static',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);

    const errorResponse: EmergenceApiResponse<null> = {
      success: false,
      error: 'Failed to load emergence data',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Handle refresh requests
  try {
    // Clear cache to force fresh data
    cachedEntries = null;

    console.log('POST refresh: Attempting to fetch from AIDIS...');
    // Try to get fresh data from AIDIS
    let entries = await fetchFromAidis();

    if (!entries || entries.length === 0) {
      console.log('POST refresh: AIDIS fetch failed, using static fallback');
      entries = await loadStaticEntries();
    } else {
      console.log(`POST refresh: Successfully loaded ${entries.length} entries from AIDIS`);
    }

    const response: EmergenceApiResponse<{ entries: Entry[]; count: number }> = {
      success: true,
      data: {
        entries,
        count: entries.length,
      },
      source: entries === cachedEntries ? 'static' : 'aidis',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Refresh Error:', error);

    const errorResponse: EmergenceApiResponse<null> = {
      success: false,
      error: 'Failed to refresh emergence data',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}