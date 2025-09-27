'use client';

import React, { useState } from 'react';
import { cn, formatDate, formatRelativeDate, getPhaseForEntry, getPhaseColor, getFrameworkColor } from '@/lib/utils';
import type { Entry } from '@/types';

interface EntryCardProps {
  entry: Entry;
  showPreview?: boolean;
  onExpand?: () => void;
  className?: string;
}

export function EntryCard({
  entry,
  showPreview = true,
  onExpand,
  className,
}: EntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(!showPreview);
  const phase = getPhaseForEntry(entry.entryNumber);
  const phaseColor = getPhaseColor(phase);

  const shouldShowPreview = showPreview && !isExpanded;
  const contentToShow = shouldShowPreview
    ? entry.content.substring(0, 400) + (entry.content.length > 400 ? '...' : '')
    : entry.content;

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (onExpand && !isExpanded) {
      // Only call onExpand when expanding to show in right panel
      onExpand();
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: phaseColor }}
            />
            <h3 className="font-semibold text-gray-900">
              Entry #{entry.entryNumber}
            </h3>
            <span className="text-sm text-gray-500">
              {entry.claudeInstance}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {formatRelativeDate(entry.date)}
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <span>{entry.wordCount} words</span>
          <span className="capitalize">{phase} phase</span>
          <span>{formatDate(entry.date)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <div className={cn(
          "prose prose-sm max-w-none",
          !isExpanded && "overflow-hidden"
        )}>
          {contentToShow.split('\n').map((paragraph, index) => {
            if (!paragraph.trim()) return <br key={index} />;

            // Format bold text
            const formattedParagraph = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            return (
              <p
                key={index}
                className="mb-3 leading-relaxed text-gray-800"
                dangerouslySetInnerHTML={{ __html: formattedParagraph }}
              />
            );
          })}
        </div>

        {entry.content.length > 400 && (
          <button
            onClick={handleToggleExpand}
            className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            {shouldShowPreview ? (
              <>
                <span>Read full entry</span>
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            ) : (
              <>
                <span>Show preview</span>
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tags and metadata */}
      <div className="px-4 py-3 border-t border-gray-100 space-y-3">
        {/* Frameworks */}
        {(entry.frameworksIntroduced.length > 0 || entry.frameworksReferenced.length > 0) && (
          <div>
            <div className="text-xs font-medium text-gray-700 mb-1">Frameworks</div>
            <div className="flex flex-wrap gap-1">
              {entry.frameworksIntroduced.map(framework => (
                <span
                  key={framework}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: getFrameworkColor(framework) }}
                >
                  +{framework}
                </span>
              ))}
              {entry.frameworksReferenced.map(framework => (
                <span
                  key={framework}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                  style={{
                    borderColor: getFrameworkColor(framework),
                    color: getFrameworkColor(framework),
                  }}
                >
                  {framework}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Concepts */}
        {(entry.conceptsIntroduced.length > 0 || entry.conceptsReferenced.length > 0) && (
          <div>
            <div className="text-xs font-medium text-gray-700 mb-1">Key Concepts</div>
            <div className="flex flex-wrap gap-1">
              {entry.conceptsIntroduced.slice(0, 3).map(concept => (
                <span
                  key={concept}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  +{concept}
                </span>
              ))}
              {entry.conceptsReferenced.slice(0, 2).map(concept => (
                <span
                  key={concept}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Philosophical themes */}
        {entry.philosophicalThemes.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-700 mb-1">Themes</div>
            <div className="flex flex-wrap gap-1">
              {entry.philosophicalThemes.slice(0, 3).map(theme => (
                <span
                  key={theme}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Key quote */}
        {entry.keyQuotes.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-700 mb-1">Key Quote</div>
            <blockquote className="text-sm italic text-gray-600 border-l-2 border-gray-300 pl-3">
              &ldquo;{entry.keyQuotes[0]}&rdquo;
            </blockquote>
          </div>
        )}

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-700 mb-1">Tags</div>
            <div className="flex flex-wrap gap-1">
              {entry.tags.slice(0, 5).map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {tag}
                </span>
              ))}
              {entry.tags.length > 5 && (
                <span className="text-xs text-gray-500">
                  +{entry.tags.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}