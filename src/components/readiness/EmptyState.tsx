/**
 * Empty State Component
 *
 * Displays when a dashboard panel doesn't meet readiness criteria.
 * Shows reasons and actionable steps to unlock the panel.
 */

import React from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';

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
  className,
}: EmptyStateProps) {
  const title = PANEL_TITLES[panelId] || 'Dashboard Panel';

  return (
    <Box
      className={className}
      style={{
        border: '1px dashed var(--gray-5)',
        borderRadius: 10,
        background: 'var(--gray-2)',
        padding: 12,
      }}
    >
      <Flex align="center" gap="2" style={{ marginBottom: 6 }}>
        {/* Small check icon */}
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          style={{ color: 'var(--gray-10)' }}
        >
          <path d="M9 12l2 2 4-4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 22a10 10 0 110-20 10 10 0 010 20z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Text weight="bold" size="2">
          {title} not available yet
        </Text>
      </Flex>

      {reasons?.length ? (
        <Box style={{ marginBottom: 6 }}>
          <Text size="1" color="gray">{reasons.length === 1 ? 'Reason:' : 'Reasons:'}</Text>
          <ul style={{ margin: 4, paddingLeft: 16 }}>
            {reasons.map((r, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--gray-10)' }}>
                {r}
              </li>
            ))}
          </ul>
        </Box>
      ) : null}

      {unlock?.length ? (
        <Box>
          <Text size="1" weight="bold">To unlock:</Text>
          <ol style={{ margin: 4, paddingLeft: 16 }}>
            {unlock.map((s, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--gray-10)' }}>
                {s}
              </li>
            ))}
          </ol>
        </Box>
      ) : null}

      {process.env.NODE_ENV === 'development' && inputs ? (
        <details style={{ marginTop: 6 }}>
          <summary style={{ fontSize: 11, color: 'var(--gray-9)', cursor: 'pointer' }}>Debug: View inputs</summary>
          <pre style={{ marginTop: 4, padding: 8, background: 'var(--gray-3)', borderRadius: 8, fontSize: 11 }}>
            {JSON.stringify(inputs, null, 2)}
          </pre>
        </details>
      ) : null}
    </Box>
  );
}

