/**
 * Overall Impact Card (Gated)
 * 
 * Example of dashboard card wrapped with readiness gating.
 * Only renders when minimum data quality thresholds are met.
 */

import { Heading, Text } from "@radix-ui/themes";
import { BorderedCard } from "@/components/BorderedCard";
import { PanelGate } from "@/components/readiness/PanelGate";
import { Percent, InferredBadge } from "@/components/readiness/Percent";
import type { PanelReadiness } from "@/lib/readiness/types";

export type OverallImpactCardGatedProps = {
  prose: string;
  readiness: PanelReadiness;
  improved?: { num: number; den: number };
  isLLMInferred?: boolean;
  llmConfidence?: number;
  llmSourceCount?: number;
};

/**
 * Overall Impact Card with readiness gating
 * 
 * Shows empty state if data doesn't meet minimum thresholds.
 * Displays denominators for all percentages when ready.
 */
export default function OverallImpactCardGated({
  prose,
  readiness,
  improved,
  isLLMInferred,
  llmConfidence,
  llmSourceCount,
}: OverallImpactCardGatedProps) {
  return (
    <PanelGate
      panelId="overallImpact"
      readiness={readiness}
      className="min-h-[220px]"
    >
      <BorderedCard
        style={{
          padding: 24,
          minHeight: 220,
          boxSizing: "border-box",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <Heading size="5">Overall Impact</Heading>
          {isLLMInferred && (
            <InferredBadge
              confidence={llmConfidence}
              sourceCount={llmSourceCount}
            />
          )}
        </div>
        
        <Text size="3" style={{ lineHeight: 1.6, display: 'block', marginBottom: 12 }}>
          {prose}
        </Text>
        
        {/* Show improvement percentage with denominator */}
        {improved && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Percent
              num={improved.num}
              den={improved.den}
              label="Participants improved"
              format="inline"
              className="text-sm"
            />
          </div>
        )}
      </BorderedCard>
    </PanelGate>
  );
}

