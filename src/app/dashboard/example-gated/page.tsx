/**
 * Example Gated Dashboard Page
 * 
 * Demonstrates how to use the readiness system to conditionally render
 * dashboard components based on data quality gates.
 * 
 * This is a reference implementation showing the full pattern:
 * 1. Fetch cohort facts + readiness from API
 * 2. Pass readiness to each dashboard card via PanelGate
 * 3. Show empty states with unlock steps when data is insufficient
 */

'use client';

import { useState, useEffect } from 'react';
import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { DashboardLayout } from '@/components/DashboardLayout';
import OverallImpactCardGated from '@/components/dashboard/OverallImpactCardGated';
import { PanelGate } from '@/components/readiness/PanelGate';
import ImprovementDonutCard from '@/components/dashboard/ImprovementDonutCard';
import TestimonialsCard from '@/components/dashboard/TestimonialsCard';
import KeyThemesCard from '@/components/dashboard/KeyThemesCard';
import type { ReadinessResult } from '@/lib/readiness/types';
import type { CohortFacts } from '@/types/schemas';

interface CohortFactsResponse {
  facts: CohortFacts | null;
  readiness: ReadinessResult | null;
  meta?: {
    timestamp: string;
    programId: string;
    sessionCount: number;
  };
  error?: string;
}

export default function ExampleGatedDashboard() {
  const [data, setData] = useState<CohortFactsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCohortData();
  }, []);

  const fetchCohortData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cohort-facts');
      const json = await response.json();
      
      if (!response.ok) {
        throw new Error(json.error || 'Failed to fetch cohort data');
      }
      
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Impact Dashboard (Gated)">
        <Box className="p-8 text-center">
          <Text>Loading dashboard data...</Text>
        </Box>
      </DashboardLayout>
    );
  }

  if (error || !data?.readiness || !data?.facts) {
    return (
      <DashboardLayout title="Impact Dashboard (Gated)">
        <Box className="p-8 text-center">
          <Heading size="5" className="mb-4">Unable to Load Dashboard</Heading>
          <Text color="red">
            {error || 'No data available. Please ensure session data has been imported.'}
          </Text>
        </Box>
      </DashboardLayout>
    );
  }

  const { facts, readiness } = data;

  return (
    <DashboardLayout title="Impact Dashboard (Gated)">
      {/* Readiness Summary Banner */}
      <Box className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <Heading size="4" className="mb-2">Data Readiness Summary</Heading>
        <Flex gap="4" wrap="wrap">
          <Text size="2">
            <strong>Participants:</strong> {readiness.dataset.participants}
          </Text>
          <Text size="2">
            <strong>Paired Surveys:</strong> {readiness.dataset.pairedCount}
          </Text>
          <Text size="2">
            <strong>Session Docs:</strong> {readiness.llm.sessionDocs}
          </Text>
          <Text size="2">
            <strong>LLM Confidence:</strong> {(readiness.llm.avgConfidence * 100).toFixed(0)}%
          </Text>
        </Flex>
        {readiness.privacy.groupsSuppressed.length > 0 && (
          <Text size="2" className="mt-2 text-gray-600 dark:text-gray-400">
            ⚠️ {readiness.privacy.groupsSuppressed.length} group(s) suppressed for privacy (n &lt; {readiness.privacy.smallNThreshold})
          </Text>
        )}
      </Box>

      {/* Top Row: Overall Impact + Improvement Donut */}
      <Flex gap="4" className="mb-6" wrap="wrap">
        <Box style={{ flex: 1, minWidth: 320 }}>
          <OverallImpactCardGated
            prose="Sample prose showing overall impact narrative. This would come from the LLM-composed section."
            readiness={readiness.panels.overallImpact}
            improved={readiness.panels.overallImpact.denominators?.improved}
            isLLMInferred={true}
            llmConfidence={readiness.llm.avgConfidence}
            llmSourceCount={readiness.llm.sessionDocs}
          />
        </Box>
        
        <Box style={{ flex: 1, minWidth: 360 }}>
          <PanelGate
            panelId="improvementDonut"
            readiness={readiness.panels.improvementDonut}
            className="min-h-[220px]"
          >
            <ImprovementDonutCard
              headingPercent={75}
              nCompleted={facts.nWithPrePost}
              breakdown={[
                { label: 'Significant Improvement', count: 12, color: '#10b981' },
                { label: 'Moderate Improvement', count: 8, color: '#3b82f6' },
                { label: 'Slight Improvement', count: 5, color: '#f59e0b' },
                { label: 'No Change', count: 3, color: '#6b7280' },
              ]}
            />
          </PanelGate>
        </Box>
      </Flex>

      {/* Key Themes */}
      <Box className="mb-6">
        <PanelGate
          panelId="keyThemes"
          readiness={readiness.panels.keyThemes}
        >
          <KeyThemesCard
            prose="Key themes identified from participant reflections."
            themes={facts.topThemes.map(theme => ({
              title: theme.tag,
              description: `Mentioned by ${theme.count} participants`,
              percent: Math.round((theme.count / facts.nSessions) * 100),
            }))}
            sourceNote={`Inferred from ${readiness.llm.sessionDocs} source documents`}
          />
        </PanelGate>
      </Box>

      {/* Testimonials */}
      <Box className="mb-6">
        <PanelGate
          panelId="testimonials"
          readiness={readiness.panels.testimonials}
        >
          <TestimonialsCard
            title="Testimonials"
            quotes={facts.exemplarQuotes}
            sourceNote="Sourced from participant reflections & outcome notes"
          />
        </PanelGate>
      </Box>

      {/* Data Quality Notes */}
      {facts.dataQualityNotes.length > 0 && (
        <Box className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
          <Heading size="4" className="mb-2">Data Quality Notes</Heading>
          <ul className="list-disc list-inside space-y-1">
            {facts.dataQualityNotes.map((note, idx) => (
              <li key={idx}>
                <Text size="2">{note}</Text>
              </li>
            ))}
          </ul>
        </Box>
      )}
    </DashboardLayout>
  );
}

