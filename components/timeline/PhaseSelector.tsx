'use client';

import React from 'react';
import { cn, PHASE_CONFIG } from '@/lib/utils';
import type { Phase } from '@/types';

interface PhaseSelectorProps {
  selectedPhase: Phase;
  onPhaseSelect: (phase: Phase) => void;
  entryCounts: Record<Phase, number>;
  className?: string;
}

export function PhaseSelector({
  selectedPhase,
  onPhaseSelect,
  entryCounts,
  className,
}: PhaseSelectorProps) {
  const phases = Object.entries(PHASE_CONFIG) as [Phase, typeof PHASE_CONFIG[Phase]][];

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {phases.map(([phaseKey, phase]) => {
        const isSelected = selectedPhase === phaseKey;
        const count = entryCounts[phaseKey] || 0;

        return (
          <button
            key={phaseKey}
            onClick={() => onPhaseSelect(phaseKey)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
              "hover:scale-105 hover:shadow-md",
              isSelected
                ? "text-white shadow-lg"
                : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
            )}
            style={{
              backgroundColor: isSelected ? phase.color.primary : undefined,
              borderColor: isSelected ? phase.color.primary : undefined,
            }}
          >
            {/* Phase indicator dot */}
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                isSelected ? "bg-white" : undefined
              )}
              style={{
                backgroundColor: isSelected ? 'white' : phase.color.primary,
              }}
            />

            {/* Phase name and count */}
            <div className="flex items-center gap-2">
              <span>{phase.name}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold",
                  isSelected
                    ? "bg-white/20 text-white"
                    : "text-white"
                )}
                style={{
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : phase.color.accent,
                }}
              >
                {count}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}