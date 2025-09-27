'use client';

import React, { useState, useEffect } from 'react';
import { Timeline } from '@/components/timeline/Timeline';
import { EntryCard } from '@/components/timeline/EntryCard';
import { AdminPanel } from '@/components/AdminPanel';
import { Analytics } from '@/components/Analytics';
import { useEmergenceEntries, useEmergenceStatistics, useAidisConnection, useRefreshEntries } from '@/lib/queries';
import { useTimelineStore } from '@/stores/timeline';
import { cn } from '@/lib/utils';

export function TimelineExplorer() {
  const {
    data: entries = [],
    isLoading: entriesLoading,
    error: entriesError
  } = useEmergenceEntries();

  const {
    data: statistics,
    isLoading: statsLoading
  } = useEmergenceStatistics();

  const {
    data: aidisConnected = false,
  } = useAidisConnection();

  const refreshMutation = useRefreshEntries();

  // Timeline store
  const {
    selectedEntry,
    setSelectedEntry,
  } = useTimelineStore();

  // Update store when entries load
  useEffect(() => {
    if (entries.length > 0) {
      useTimelineStore.getState().setEntries(entries);
    }
  }, [entries]);

  const selectedEntryData = selectedEntry
    ? entries.find(e => e.entryNumber === selectedEntry)
    : null;

  if (entriesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <div className="text-gray-600">Loading emergence data...</div>
        </div>
      </div>
    );
  }

  if (entriesError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to Load Data
          </h2>
          <p className="text-gray-600 mb-4">
            Could not connect to AIDIS or load fallback data.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Emergence Experiment
              </h1>
              {!statsLoading && statistics && (
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{statistics.totalEntries} entries</span>
                  <span>{statistics.totalWords.toLocaleString()} words</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 relative">
              <AdminPanel aidisConnected={aidisConnected} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Timeline */}
        <div className="mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Timeline Explorer
            </h2>
            <Timeline
              entries={entries}
              selectedEntry={selectedEntry}
              onEntrySelect={setSelectedEntry}
              complexityOverlay={false}
              frameworkOverlay={false}
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Analytics and All Entries */}
          <div className="space-y-8">
            {/* Analytics */}
            <Analytics />

            {/* All Entries */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                All Entries
              </h3>
              <div className="space-y-4">
                {entries.map(entry => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    showPreview={true}
                    onExpand={() => setSelectedEntry(entry.entryNumber)}
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedEntry === entry.entryNumber && "ring-2 ring-blue-500"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Selected Entry Detail */}
          <div className="sticky top-24 sm:top-22 lg:top-20">
            {selectedEntryData ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Entry Details
                </h3>
                <EntryCard
                  entry={selectedEntryData}
                  showPreview={false}
                  className="max-h-[800px] sm:max-h-[900px] lg:max-h-[1000px] overflow-y-auto"
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">👆</div>
                <div>Select an entry from the timeline to view details</div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>
              Emergence Experiment Documentation • {entries.length} entries spanning{' '}
              {statistics?.dateRange?.start && statistics?.dateRange?.end ? (
                <>
                  {new Date(statistics.dateRange.start).toLocaleDateString()} -{' '}
                  {new Date(statistics.dateRange.end).toLocaleDateString()}
                </>
              ) : (
                '10 days'
              )}
            </p>
            <p className="mt-2 text-sm">
              Built with Next.js • Data from AIDIS MCP Server • Real-time updates every 30 minutes
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}