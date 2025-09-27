'use client';

import React from 'react';
import { useEmergenceStatistics } from '@/lib/queries';

interface AnalyticsProps {
  className?: string;
}

export function Analytics({ className = '' }: AnalyticsProps) {
  const { data: statistics, isLoading } = useEmergenceStatistics();

  if (isLoading || !statistics) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics</h3>
        <div className="text-gray-500">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Analytics</h3>

      {/* Core Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{statistics.totalEntries}</div>
          <div className="text-sm text-gray-600">Total Entries</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{statistics.totalWords.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Words</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{statistics.averageWords}</div>
          <div className="text-sm text-gray-600">Avg Words</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{statistics.conceptCount}</div>
          <div className="text-sm text-gray-600">Concepts</div>
        </div>
      </div>

      {/* Content Completeness */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Content Completeness</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${statistics.contentCompleteness.percentage}%` }}
            />
          </div>
          <div className="text-sm text-gray-600">
            {statistics.contentCompleteness.percentage}% complete
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{statistics.contentCompleteness.full} full entries</span>
          <span>{statistics.contentCompleteness.placeholder} placeholder entries</span>
        </div>
      </div>

      {/* Top Tags */}
      {statistics.topTags && statistics.topTags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Most Common Tags</h4>
          <div className="space-y-2">
            {statistics.topTags.slice(0, 5).map(({ tag, count }) => (
              <div key={tag} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 truncate">{tag}</span>
                <div className="flex items-center gap-2">
                  <div className="w-12 bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full"
                      style={{
                        width: `${(count / (statistics.topTags[0]?.count || 1)) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
        Updated: {new Date(statistics.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}