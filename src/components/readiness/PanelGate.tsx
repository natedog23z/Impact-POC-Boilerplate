/**
 * Panel Gate Component
 * 
 * Wrapper that conditionally renders dashboard panels based on readiness checks.
 * Shows empty states with actionable unlock steps when data is insufficient.
 */

import React from 'react';
import { PanelReadiness } from '@/lib/readiness/types';
import { EmptyState } from './EmptyState';

interface PanelGateProps {
  panelId: string;
  readiness: PanelReadiness;
  children: React.ReactNode;
  className?: string;
}

/**
 * Conditionally render a panel based on readiness
 */
export function PanelGate({
  panelId,
  readiness,
  children,
  className,
}: PanelGateProps) {
  if (!readiness.ready) {
    return (
      <EmptyState
        panelId={panelId}
        reasons={readiness.reasons}
        unlock={readiness.unlock}
        inputs={readiness.inputs}
        className={className}
      />
    );
  }
  
  return <>{children}</>;
}

