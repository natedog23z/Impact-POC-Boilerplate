'use server';

import pLimit from 'p-limit';

import type { RawSession } from '@/lib/mock-sessions/types';
import { buildSessionFacts } from '@/lib/map/build-session-facts';
import { buildCohortFacts } from '@/lib/reduce/build-cohort-facts';
import { composeAssessmentOutcomes } from '@/lib/compose/assessment-outcomes';
import { composeOverallImpact } from '@/lib/compose/overall-impact';
import { composeStrengthsImprovements } from '@/lib/compose/strengths-improvements';
import type { CohortFacts, SectionOutput, SessionFacts } from '@/types/schemas';

const MAP_LIMIT = 8;

export type PipelineSections = {
  assessmentOutcomes: SectionOutput;
  overallImpact: SectionOutput;
  strengthsImprovements: SectionOutput;
};

export type PipelineMeta = {
  processed: number;
  skipped: string[];
  mapLogs: Array<{
    sessionId: string;
    pairedAssessments: number;
    availableAssessments: number;
    extractionModel: string;
    extractionVersion: string;
  }>;
};

export type RunPipelineInlineResponse = {
  cohortFacts: CohortFacts;
  sections: PipelineSections;
  sessionFacts: SessionFacts[];
  meta: PipelineMeta;
};

export async function runImpactPipelineInline(rawSessions: RawSession[]): Promise<RunPipelineInlineResponse> {
  if (!Array.isArray(rawSessions) || rawSessions.length === 0) {
    throw new Error('No RawSession objects were provided.');
  }

  const limiter = pLimit(MAP_LIMIT);
  const mapResults = await Promise.all(
    rawSessions.map((session) =>
      buildSessionFacts(session, {
        limiter,
      }).catch((error) => ({ error, session } as const)),
    ),
  );

  const sessionFacts: SessionFacts[] = [];
  const skipped: string[] = [];
  const mapLogs: PipelineMeta['mapLogs'] = [];

  for (const entry of mapResults) {
    if ('error' in entry) {
      const sessionId = entry.session?.sessionId ?? '(unknown)';
      skipped.push(`${sessionId}: ${(entry.error as Error).message}`);
      continue;
    }
    sessionFacts.push(entry.facts);
    mapLogs.push({
      sessionId: entry.meta.sessionId,
      pairedAssessments: entry.meta.pairedAssessments,
      availableAssessments: entry.meta.availableAssessments,
      extractionModel: entry.meta.extractionModel,
      extractionVersion: entry.meta.extractionVersion,
    });
  }

  if (!sessionFacts.length) {
    throw new Error('Failed to build SessionFacts from provided RawSessions.');
  }

  const cohortFacts = buildCohortFacts(sessionFacts);

  const [assessmentOutcomes, overallImpact, strengthsImprovements] = await Promise.all([
    composeAssessmentOutcomes(cohortFacts, { limiter }),
    composeOverallImpact(cohortFacts, { limiter }),
    composeStrengthsImprovements(cohortFacts, { limiter }),
  ]);

  return {
    cohortFacts,
    sections: {
      assessmentOutcomes,
      overallImpact,
      strengthsImprovements,
    },
    sessionFacts,
    meta: {
      processed: sessionFacts.length,
      skipped,
      mapLogs,
    },
  };
}

