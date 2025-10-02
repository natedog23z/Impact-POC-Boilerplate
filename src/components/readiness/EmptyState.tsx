/**
 * Empty State Component
 * 
 * Displays when a dashboard panel doesn't meet readiness criteria.
 * Shows reasons and actionable steps to unlock the panel.
 */

import React from 'react';

interface EmptyStateProps {
  panelId: string;
  reasons: string[];
  unlock: string[];
  inputs?: Record<string, number | string | boolean>;
  className?: string;
}

/**
 * Panel titles for display
 */
const PANEL_TITLES: Record<string, string> = {
  overallImpact: 'Overall Impact',
  improvementDonut: 'Improvement Distribution',
  flourishingGrid: 'Flourishing Outcomes',
  keyThemes: 'Key Themes',
  keyAreasChallenges: 'Key Areas & Challenges',
  participantReasons: 'Why Participants Join',
  strengthsImprovements: 'Strengths & Improvements',
  testimonials: 'Testimonials',
};

export function EmptyState({
  panelId,
  reasons,
  unlock,
  inputs,
  className = '',
}: EmptyStateProps) {
  const title = PANEL_TITLES[panelId] || 'Dashboard Panel';
  
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 ${className}`}
    >
      {/* Icon */}
      <div className="mb-4">
        <svg
          className="w-12 h-12 text-gray-400 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      
      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title} Not Yet Available
      </h3>
      
      {/* Reasons */}
      {reasons.length > 0 && (
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {reasons.length === 1 ? 'Reason:' : 'Reasons:'}
          </p>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            {reasons.map((reason, idx) => (
              <li key={idx}>• {reason}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Unlock steps */}
      {unlock.length > 0 && (
        <div className="w-full max-w-md">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
            To unlock this panel:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 bg-white dark:bg-gray-800 rounded-lg p-4">
            {unlock.map((step, idx) => (
              <li key={idx} className="flex items-start">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Debug inputs (only in development) */}
      {process.env.NODE_ENV === 'development' && inputs && (
        <details className="mt-4 text-xs text-gray-500 dark:text-gray-500 w-full max-w-md">
          <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            Debug: View inputs
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
            {JSON.stringify(inputs, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

