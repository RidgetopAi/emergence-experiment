import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Entry, EmergenceApiResponse } from '@/types';

// Search-based AIDIS fetch to find missing entries
async function fetchMissingEntriesFromAidis(): Promise<Entry[]> {
  const aidisUrl = process.env.AIDIS_API_URL || 'http://localhost:8080';
  const entries: Entry[] = [];

  // Search for specific missing entries
  const searchQueries = [
    { query: 'First entry', expectedNumber: 1 },
    { query: 'Eleventh entry', expectedNumber: 11 },
    { query: 'Twelfth entry', expectedNumber: 12 },
    { query: 'Thirteenth entry', expectedNumber: 13 },
    { query: 'Fourteenth entry', expectedNumber: 14 },
    { query: 'Sixteenth entry', expectedNumber: 16 }
  ];

  for (const { query, expectedNumber } of searchQueries) {
    try {
      const response = await fetch(`${aidisUrl}/mcp/tools/context_search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          arguments: {
            query,
            limit: 3,
            projectId: 'f6324609-2740-48f4-9b77-f3e2f68789c4'
          }
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const searchData = await response.json();
        if (searchData.success && searchData.result?.content) {
          for (const item of searchData.result.content) {
            if (item.type === 'text' && item.text) {
              // Check if this looks like the entry we want
              const content = item.text;
              if (content.includes(`${query}.`) || content.includes(`entry. 2025-`)) {
                // Extract basic info and create entry
                const dateMatch = content.match(/2025-\d{2}-\d{2}T\d{2}:\d{2}Z?/);
                const date = dateMatch ? dateMatch[0] : new Date().toISOString();
                const wordCount = content.split(/\s+/).length;

                entries.push({
                  id: `aidis-entry-${expectedNumber}`,
                  entryNumber: expectedNumber,
                  title: query,
                  date,
                  claudeInstance: `Claude #${expectedNumber}`,
                  type: 'discussion' as const,
                  content: content.trim(),
                  wordCount,
                  tags: [],
                  conceptsIntroduced: [],
                  conceptsReferenced: [],
                  frameworksIntroduced: [],
                  frameworksReferenced: [],
                  technicalContext: '47 tools stable',
                  philosophicalThemes: ['consciousness', 'emergence'],
                  keyQuotes: []
                });
                break; // Found this entry, move to next
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Search failed for ${query}:`, error);
    }
  }

  return entries;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Search-based upload: Starting AIDIS search for missing entries...');

    // Search for missing entries
    const missingEntries = await fetchMissingEntriesFromAidis();

    if (missingEntries.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No missing entries found in AIDIS',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    console.log(`Found ${missingEntries.length} missing entries with full content`);

    // Load current data
    const dataPath = path.join(process.cwd(), 'raw-data.json');
    const currentData = JSON.parse(await fs.readFile(dataPath, 'utf8'));

    // Update with found entries
    const updatedData = [...currentData];
    for (const newEntry of missingEntries) {
      const existingIndex = updatedData.findIndex(e => e.entryNumber === newEntry.entryNumber);
      if (existingIndex >= 0) {
        updatedData[existingIndex] = newEntry;
        console.log(`Updated entry ${newEntry.entryNumber} with full content (${newEntry.wordCount} words)`);
      }
    }

    // Write updated data
    await fs.writeFile(dataPath, JSON.stringify(updatedData, null, 2), 'utf8');

    const response: EmergenceApiResponse<{
      entriesUpdated: number;
      foundEntries: number[];
      message: string;
    }> = {
      success: true,
      data: {
        entriesUpdated: missingEntries.length,
        foundEntries: missingEntries.map(e => e.entryNumber),
        message: `Successfully found and updated ${missingEntries.length} missing entries with full content`,
      },
      source: 'aidis',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Search upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search and update missing entries',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}