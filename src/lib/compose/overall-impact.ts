import { generateObject } from 'ai';
import { z } from 'zod';

import type { CohortFacts, SectionOutput } from '@/types/schemas';

import { composeOpenAI, defaultComposeLimiter, type ComposeOptions } from './shared';

const MODEL_NAME = 'gpt-4o-mini';
const proseSchema = z.object({
  prose: z.string().min(1).max(800),
});

const SYSTEM_PROMPT = `You are summarizing overall program impact for donors in an executive dashboard. Use ONLY the supplied cohort facts. Lead with scale (participants/sessions) and verified completion %, then the top 1–2 outcomes (pre→post signals or habit formation). Include exactly one short beneficiary quote if available. Close with a single sentence on next-step focus. Keep it under 120 words, confident, concrete, and free of hype or jargon. Acknowledge any data-quality notes in one clause if present.`;

export async function composeOverallImpact(
  cohort: CohortFacts,
  options: ComposeOptions = {},
): Promise<SectionOutput> {
  const quotes = cohort.exemplarQuotes.slice(0, 2);

  const limiter = options.limiter ?? defaultComposeLimiter;
  const modelName = options.model ?? MODEL_NAME;

  const { object } = await limiter(() =>
    generateObject({
      model: composeOpenAI(modelName),
      schema: proseSchema,
      temperature: 0.35,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildImpactPrompt(cohort, quotes),
        },
      ],
    }),
  );

  return {
    prose: object.prose.trim(),
    component: {
      meta: {
        nSessions: cohort.nSessions,
        completion: cohort.completion,
        notes: cohort.dataQualityNotes,
        quotes,
      },
    },
  } satisfies SectionOutput;
}

function buildImpactPrompt(cohort: CohortFacts, quotes: CohortFacts['exemplarQuotes']): string {
  const payload = {
    programId: cohort.programId,
    nSessions: cohort.nSessions,
    completion: cohort.completion,
    dataQualityNotes: cohort.dataQualityNotes,
    topStrengths: cohort.topStrengths.slice(0, 3),
    topImprovements: cohort.topImprovements.slice(0, 3),
    topThemes: cohort.topThemes.slice(0, 3),
    topChallenges: cohort.topChallenges.slice(0, 3),
    exemplarQuotes: quotes,
  };

  return `CohortFacts data:\n${JSON.stringify(payload, null, 2)}\n\nWrite a brief Overall Impact summary that integrates the quantitative completion metrics and the strongest qualitative signals. If data-quality notes exist, acknowledge them.`;
}
