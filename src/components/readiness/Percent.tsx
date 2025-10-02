/**
 * Percent Component
 * 
 * Displays percentages with explicit denominators for transparency and defensibility.
 * Requires both numerator and denominator - refuses to render without them.
 */

import React from 'react';

interface PercentProps {
  num: number;
  den: number;
  label?: string;
  className?: string;
  format?: 'inline' | 'stacked' | 'full';
  decimals?: number;
}

/**
 * Display a percentage with explicit denominator
 * 
 * @param num - Numerator
 * @param den - Denominator
 * @param label - Optional label
 * @param format - Display format:
 *   - 'inline': "49/76 (64%)"
 *   - 'stacked': Percentage on top, fraction below
 *   - 'full': "49 out of 76 participants (64%)"
 * @param decimals - Number of decimal places (default: 0)
 */
export function Percent({
  num,
  den,
  label,
  className = '',
  format = 'inline',
  decimals = 0,
}: PercentProps) {
  // Guard: refuse to render without valid inputs
  if (den === 0 || num === undefined || den === undefined) {
    return (
      <span className={`text-red-500 text-sm ${className}`}>
        [Invalid denominator]
      </span>
    );
  }
  
  const percentage = den > 0 ? (num / den) * 100 : 0;
  const percentStr = percentage.toFixed(decimals);
  
  if (format === 'inline') {
    return (
      <span className={className}>
        {label && <span className="mr-1">{label}:</span>}
        <span className="font-semibold">{num}/{den}</span>
        <span className="text-gray-600 dark:text-gray-400 ml-1">
          ({percentStr}%)
        </span>
      </span>
    );
  }
  
  if (format === 'stacked') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div className="text-3xl font-bold">{percentStr}%</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {num}/{den}
          {label && <span className="ml-1">{label}</span>}
        </div>
      </div>
    );
  }
  
  if (format === 'full') {
    return (
      <span className={className}>
        <span className="font-semibold">{num}</span>
        <span className="mx-1">out of</span>
        <span className="font-semibold">{den}</span>
        {label && <span className="ml-1">{label}</span>}
        <span className="text-gray-600 dark:text-gray-400 ml-1">
          ({percentStr}%)
        </span>
      </span>
    );
  }
  
  return null;
}

/**
 * Simple percentage formatter for use in text
 */
export function formatPercent(num: number, den: number, decimals: number = 0): string {
  if (den === 0) return 'N/A';
  const percentage = (num / den) * 100;
  return `${num}/${den} (${percentage.toFixed(decimals)}%)`;
}

/**
 * Badge component for LLM-inferred content
 */
interface InferredBadgeProps {
  confidence?: number;
  sourceCount?: number;
  className?: string;
}

export function InferredBadge({
  confidence,
  sourceCount,
  className = '',
}: InferredBadgeProps) {
  const confidencePercent = confidence ? Math.round(confidence * 100) : undefined;
  
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 ${className}`}
      title={
        confidence && sourceCount
          ? `AI-inferred from ${sourceCount} source${sourceCount > 1 ? 's' : ''} (${confidencePercent}% confidence)`
          : 'AI-inferred content'
      }
    >
      <svg
        className="w-3 h-3 mr-1"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M13 7H7v6h6V7z" />
        <path
          fillRule="evenodd"
          d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z"
          clipRule="evenodd"
        />
      </svg>
      Inferred
      {sourceCount && (
        <span className="ml-1 opacity-75">
          ({sourceCount})
        </span>
      )}
    </span>
  );
}

