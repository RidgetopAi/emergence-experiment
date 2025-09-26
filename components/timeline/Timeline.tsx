'use client';

import React, { useMemo } from 'react';
import { cn, getPhaseForEntry, getPhaseColor, isInflectionPoint, calculateComplexityScore } from '@/lib/utils';
import type { Entry } from '@/types';

interface TimelineProps {
  entries: Entry[];
  selectedEntry?: number | null;
  onEntrySelect: (entryNumber: number) => void;
  className?: string;
  complexityOverlay?: boolean;
  frameworkOverlay?: boolean;
}

export function Timeline({
  entries,
  selectedEntry,
  onEntrySelect,
  className,
  complexityOverlay = false,
  frameworkOverlay = false,
}: TimelineProps) {
  const timelineData = useMemo(() => {
    return entries.map(entry => {
      const phase = getPhaseForEntry(entry.entryNumber);
      const complexity = calculateComplexityScore(entry);
      const isInflection = isInflectionPoint(entry.entryNumber);

      return {
        entry,
        phase,
        complexity,
        isInflection,
        phaseColor: getPhaseColor(phase),
      };
    });
  }, [entries]);

  const phases = useMemo(() => {
    const phaseGroups = timelineData.reduce((acc, item) => {
      if (!acc[item.phase]) {
        acc[item.phase] = [];
      }
      acc[item.phase].push(item);
      return acc;
    }, {} as Record<string, typeof timelineData>);

    return Object.entries(phaseGroups).map(([phase, items]) => ({
      phase,
      items,
      color: getPhaseColor(phase as any),
      range: {
        start: Math.min(...items.map(i => i.entry.entryNumber)),
        end: Math.max(...items.map(i => i.entry.entryNumber)),
      },
    }));
  }, [timelineData]);

  if (entries.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-48 text-gray-500", className)}>
        <div className="text-center">
          <div className="text-2xl mb-2">📈</div>
          <div>No entries available</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Phase indicators */}
      <div className="flex justify-between mb-6 text-sm">
        {phases.map(({ phase, color, range }) => (
          <div key={phase} className="flex flex-col items-center">
            <div
              className="w-3 h-3 rounded-full mb-1"
              style={{ backgroundColor: color }}
            />
            <div className="font-medium capitalize">{phase}</div>
            <div className="text-gray-500 text-xs">
              {range.start}-{range.end}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline container */}
      <div className="relative">
        {/* Background track */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-discovery-accent via-formalization-accent via-transcendence-accent to-symbiosis-accent transform -translate-y-1/2 rounded-full" />

        {/* Timeline points */}
        <div className="relative flex justify-between items-center py-4">
          {timelineData.map(({ entry, phase, complexity, isInflection, phaseColor }) => {
            const isSelected = selectedEntry === entry.entryNumber;
            const hasFrameworks = entry.frameworksIntroduced.length > 0 || entry.frameworksReferenced.length > 0;

            return (
              <div
                key={entry.id}
                className="relative flex flex-col items-center group cursor-pointer"
                onClick={() => onEntrySelect(entry.entryNumber)}
              >
                {/* Timeline point */}
                <div
                  className={cn(
                    "relative z-10 rounded-full border-2 border-white shadow-lg transition-all duration-300",
                    "hover:scale-125 hover:shadow-xl",
                    isSelected && "scale-125 ring-4 ring-blue-200",
                    isInflection && "ring-2 ring-yellow-400",
                    complexityOverlay && "opacity-75"
                  )}
                  style={{
                    backgroundColor: phaseColor,
                    width: complexityOverlay ? `${16 + complexity * 16}px` : '16px',
                    height: complexityOverlay ? `${16 + complexity * 16}px` : '16px',
                  }}
                >
                  {/* Framework indicator */}
                  {frameworkOverlay && hasFrameworks && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-white" />
                  )}

                  {/* Inflection point indicator */}
                  {isInflection && (
                    <div className="absolute -top-2 -right-2 w-4 h-4 text-yellow-500">
                      ⭐
                    </div>
                  )}
                </div>

                {/* Entry number */}
                <div
                  className={cn(
                    "mt-2 text-xs font-medium transition-colors",
                    isSelected ? "text-blue-600" : "text-gray-600"
                  )}
                >
                  {entry.entryNumber}
                </div>

                {/* Hover tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                  <div className="bg-black text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                    <div className="font-medium">Entry {entry.entryNumber}</div>
                    <div className="text-gray-300">{entry.claudeInstance}</div>
                    <div className="text-gray-300">{entry.wordCount} words</div>
                    {entry.frameworksIntroduced.length > 0 && (
                      <div className="text-orange-300">
                        +{entry.frameworksIntroduced.join(', ')}
                      </div>
                    )}
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-400 ring-2 ring-yellow-400" />
            <span>Inflection Point</span>
          </div>
          {complexityOverlay && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <div className="w-4 h-4 rounded-full bg-gray-400" />
              <span>Complexity</span>
            </div>
          )}
          {frameworkOverlay && (
            <div className="flex items-center gap-1">
              <div className="relative w-3 h-3 rounded-full bg-gray-400">
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
              </div>
              <span>Framework</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}