'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface AdminPanelProps {
  aidisConnected: boolean;
  className?: string;
}

export function AdminPanel({ aidisConnected, className }: AdminPanelProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    entriesCount?: number;
  }>({ type: null, message: '' });

  const handleUpload = async () => {
    if (!aidisConnected) {
      setUploadStatus({
        type: 'error',
        message: 'AIDIS must be connected to upload fresh content. Make sure AIDIS is running locally.'
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus({
          type: 'success',
          message: result.data.message || 'Content updated successfully!',
          entriesCount: result.data.entriesUpdated
        });

        // Refresh the page after successful upload to show new content
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setUploadStatus({
          type: 'error',
          message: result.error || 'Upload failed'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: 'Network error during upload. Check console for details.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("bg-gray-50 border border-gray-200 rounded-lg p-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Admin Controls</h3>
          <p className="text-xs text-gray-600 mt-1">
            Upload fresh content from local AIDIS instance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* AIDIS Status */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                aidisConnected ? "bg-green-500" : "bg-red-500"
              )}
            />
            <span className="text-xs text-gray-600">
              AIDIS {aidisConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!aidisConnected || isUploading}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded transition-colors",
              aidisConnected && !isUploading
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
          >
            {isUploading ? (
              <>
                <svg className="inline w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="inline w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload from AIDIS
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {uploadStatus.type && (
        <div className={cn(
          "mt-3 p-2 rounded text-xs",
          uploadStatus.type === 'success'
            ? "bg-green-100 text-green-800 border border-green-200"
            : "bg-red-100 text-red-800 border border-red-200"
        )}>
          <div className="flex items-start gap-2">
            {uploadStatus.type === 'success' ? (
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <div>
              <p>{uploadStatus.message}</p>
              {uploadStatus.entriesCount && (
                <p className="mt-1 font-medium">
                  {uploadStatus.entriesCount} entries updated • Page will refresh in 2 seconds
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}