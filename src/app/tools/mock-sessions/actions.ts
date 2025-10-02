'use server';

import pLimit from 'p-limit';

import type { RawSession } from '@/lib/mock-sessions/types';
import { buildSessionFacts } from '@/lib/map/build-session-facts';
import { buildCohortFactsWithReadiness } from '@/lib/reduce/build-cohort-facts-with-readiness';
import { composeAssessmentOutcomes } from '@/lib/compose/assessment-outcomes';
import { composeAssessmentCategories } from '@/lib/compose/assessment-categories';
import { composeOverallImpact } from '@/lib/compose/overall-impact';
import { composeStrengthsImprovements } from '@/lib/compose/strengths-improvements';
import { composeParticipantReasons } from '@/lib/compose/participant-reasons';
import { composeKeyAreasChallenges } from '@/lib/compose/key-areas-challenges';
import { composeKeyThemes } from '@/lib/compose/key-themes';
import type { CohortFacts, SectionOutput, SessionFacts } from '@/types/schemas';

const MAP_LIMIT = 8;

export type PipelineSections = {
  assessmentOutcomes: SectionOutput;
  assessmentCategories: SectionOutput;
  overallImpact: SectionOutput;
  strengthsImprovements: SectionOutput;
  participantReasons: SectionOutput;
  keyAreasChallenges: SectionOutput;
  keyThemes: SectionOutput;
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
  readiness: import('@/lib/readiness/types').ReadinessResult;
  sections: PipelineSections;
  sessionFacts: SessionFacts[];
  meta: PipelineMeta;
};

export type PromptOverridesBySection = {
  assessmentOutcomes?: { system?: string; user?: string; userInstructions?: string };
  assessmentCategories?: { system?: string; user?: string; userInstructions?: string };
  overallImpact?: { system?: string; user?: string; userInstructions?: string };
  strengthsImprovements?: { system?: string; user?: string; userInstructions?: string };
  participantReasons?: { system?: string; user?: string; userInstructions?: string };
  keyAreasChallenges?: { system?: string; user?: string; userInstructions?: string };
  keyThemes?: { system?: string; user?: string; userInstructions?: string };
};

export async function runImpactPipelineInline(
  rawSessions: RawSession[],
  promptOverrides?: PromptOverridesBySection,
): Promise<RunPipelineInlineResponse> {
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
    const details = skipped.length ? ` Reasons (per session):\n- ${skipped.join('\n- ')}` : '';
    throw new Error(`Failed to build SessionFacts from provided RawSessions.${details}`);
  }

  // Build cohort facts + readiness (deterministic gates)
  const { facts: cohortFacts, readiness } = buildCohortFactsWithReadiness(sessionFacts);

  const [assessmentOutcomes, assessmentCategories, overallImpact, strengthsImprovements, participantReasons, keyAreasChallenges, keyThemes] = await Promise.all([
    composeAssessmentOutcomes(cohortFacts, { limiter, prompts: promptOverrides?.assessmentOutcomes }),
    composeAssessmentCategories(cohortFacts, { limiter, prompts: promptOverrides?.assessmentCategories }),
    composeOverallImpact(cohortFacts, { limiter, prompts: promptOverrides?.overallImpact }),
    composeStrengthsImprovements(cohortFacts, { limiter, prompts: promptOverrides?.strengthsImprovements }),
    composeParticipantReasons(cohortFacts, { limiter, prompts: promptOverrides?.participantReasons }),
    composeKeyAreasChallenges(cohortFacts, { limiter, prompts: promptOverrides?.keyAreasChallenges }),
    composeKeyThemes(cohortFacts, { limiter, prompts: promptOverrides?.keyThemes }),
  ]);

  return {
    cohortFacts,
    readiness,
    sections: {
      assessmentOutcomes,
      assessmentCategories,
      overallImpact,
      strengthsImprovements,
      participantReasons,
      keyAreasChallenges,
      keyThemes,
    },
    sessionFacts,
    meta: {
      processed: sessionFacts.length,
      skipped,
      mapLogs,
    },
  };
}

