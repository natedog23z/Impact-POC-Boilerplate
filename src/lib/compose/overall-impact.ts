import { generateObject } from 'ai';
import { z } from 'zod';

import type { CohortFacts, SectionOutput } from '@/types/schemas';

import { composeOpenAI, defaultComposeLimiter, type ComposeOptions } from './shared';

const MODEL_NAME = 'gpt-4o-mini';
const proseSchema = z.object({
  prose: z.string().min(1).max(800),
});

const SYSTEM_PROMPT = `You summarize overall program impact for an executive dashboard. Use only the supplied cohort facts. Emphasize scale (sessions), milestone completion, notable qualitative signals, and key data-quality caveats. Keep prose under 120 words, clear and confident, and avoid hype.`;

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
