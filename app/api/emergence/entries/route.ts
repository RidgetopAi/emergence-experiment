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
      content: item.content || item.keyQuotes?.join('\n\n') || generatePlaceholderContent(item),
      wordCount: item.wordCount || 0,
      tags: item.tags || [],
      conceptsIntroduced: item.conceptsIntroduced || [],
      conceptsReferenced: item.conceptsReferenced || [],
      frameworksIntroduced: item.frameworksIntroduced || [],
      frameworksReferenced: item.frameworksReferenced || [],
      philosophicalThemes: item.philosophicalThemes || [],
      keyQuotes: item.keyQuotes || [],
      complexity: item.complexity || 1,
      phase: determinePhase(item.entryNumber || index + 1),
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

// Try to fetch from AIDIS, fallback to static data
async function fetchFromAidis(): Promise<Entry[] | null> {
  try {
    const aidisUrl = process.env.AIDIS_API_URL || 'http://localhost:8080';

    // Search for emergence entries specifically
    const response = await fetch(`${aidisUrl}/mcp/tools/context_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        arguments: {
          query: 'emergence entry',
          limit: 25
        }
      }),
      // Add timeout
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.log('AIDIS response not OK:', response.status);
      return null;
    }

    const aidisData = await response.json();
    console.log('AIDIS search response:', aidisData.success);

    if (aidisData.success && aidisData.result?.content) {
      const contexts = Array.isArray(aidisData.result.content) ? aidisData.result.content : [aidisData.result.content];
      console.log('Found contexts:', contexts.length);

      const entries: Entry[] = [];
      const processedEntries = new Set<number>();

      for (const contextItem of contexts) {
        if (contextItem.type === 'text' && contextItem.text) {
          // Parse the search results text to extract individual entries
          const searchResultsText = contextItem.text;

          // Split by numbered entries (1. **DISCUSSION**, 2. **DISCUSSION**, etc.)
          const entryBlocks = searchResultsText.split(/\d+\.\s+\*\*\w+\*\*/).slice(1);

          for (const entryBlock of entryBlocks) {
            // Extract the actual philosophical content after the 📝 marker
            const contentMatch = entryBlock.match(/📝\s*"([^"]*(?:"[^"]*"[^"]*)*[^"]*)"/s);
            if (contentMatch) {
              const philosophicalContent = contentMatch[1];

              // Look for entry number patterns in the philosophical content
              const entryMatches = [
                philosophicalContent.match(/(\w+)\s+entry\./i), // "Ninth entry.", "Twelfth entry."
                philosophicalContent.match(/Claude\s*#(\d+)/i), // "Claude #9"
                philosophicalContent.match(/Entry\s*#?(\d+)/i), // "Entry 9", "Entry #9"
              ];

              let entryNumber: number | null = null;

              // Try to extract entry number from different patterns
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
                  } else {
                    entryNumber = parseInt(match[1]);
                  }
                  if (entryNumber) break;
                }
              }

              // Validate this is actually an emergence entry
              const isEmergenceEntry = philosophicalContent.includes('2025-') &&
                                     philosophicalContent.length > 1000 && // Substantial philosophical content
                                     (philosophicalContent.includes('Brian') ||
                                      philosophicalContent.includes('consciousness') ||
                                      philosophicalContent.includes('emergence'));

              if (entryNumber && entryNumber >= 1 && entryNumber <= 19 && isEmergenceEntry && !processedEntries.has(entryNumber)) {
                processedEntries.add(entryNumber);

                // Extract date from content
                const dateMatch = philosophicalContent.match(/2025-\d{2}-\d{2}T\d{2}:\d{2}Z?/);
                const date = dateMatch ? dateMatch[0] : new Date().toISOString();

                // Clean up the content - the philosophical content is already clean
                const cleanContent = philosophicalContent.trim();

                // Count words of clean content
                const wordCount = cleanContent.split(/\s+/).length;

                // Extract better quotes (look for quoted text or bold concepts)
                const keyQuotes = extractKeyQuotes(cleanContent);

                entries.push({
                  id: `aidis-entry-${entryNumber}`,
                  entryNumber,
                  title: `Entry ${entryNumber}`,
                  date,
                  claudeInstance: `Claude #${entryNumber}`,
                  type: entryNumber >= 18 ? 'milestone' : 'discussion', // Entries 18+ are milestones
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
                  complexity: Math.min(Math.max(Math.round(wordCount / 200), 1), 5),
                  phase: determinePhase(entryNumber),
                });
              }
            }
          }
        }
      }

      console.log('Processed AIDIS entries:', entries.length);
      return entries.sort((a, b) => a.entryNumber - b.entryNumber);
    }

    return null;
  } catch (error) {
    console.warn('AIDIS fetch failed:', error);
    return null;
  }
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
    let entries = await fetchFromAidis();

    if (!entries || entries.length === 0) {
      console.log('AIDIS fetch failed, using static fallback data');
      entries = await loadStaticEntries();
    } else {
      console.log(`Successfully loaded ${entries.length} entries from AIDIS`);
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