import { generateObject } from 'ai';
import { z } from 'zod';

import type { CohortFacts, SectionOutput } from '@/types/schemas';

import { composeOpenAI, defaultComposeLimiter, extractFirstJsonObject, type ComposeOptions } from './shared';

const MODEL_NAME = 'gpt-4o-mini';
const proseSchema = z.object({
  prose: z.string().min(1).max(800),
});

const SYSTEM_PROMPT = `You are composing a concise "Assessment Outcomes" summary for an impact dashboard. Use only the provided cohort metrics. Highlight key trends in average change and percent improved. Call out data sparsity when necessary. Keep prose under 120 words, professional, and factual.`;

export async function composeAssessmentOutcomes(
  cohort: CohortFacts,
  options: ComposeOptions = {},
): Promise<SectionOutput> {
  const series = cohort.assessments.map((assessment) => ({
    key: assessment.key,
    label: assessment.label,
    avgPre: assessment.avgPre,
    avgPost: assessment.avgPost,
    avgChange: assessment.avgChange,
    pctImproved: assessment.pctImproved,
    betterWhen: (assessment as any).betterWhen,
  }));

  if (!series.length) {
    return {
      prose: 'Assessment data is not yet available for this cohort. Continue collecting pre- and post-survey responses to surface outcomes.',
      component: {
        series: [],
      },
    } satisfies SectionOutput;
  }

  const limiter = options.limiter ?? defaultComposeLimiter;
  const modelName = options.model ?? MODEL_NAME;

  let object;
  try {
    ({ object } = await limiter(() =>
      generateObject({
        model: composeOpenAI(modelName),
        schema: proseSchema,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: buildAssessmentPrompt(cohort),
          },
        ],
      }),
    ));
  } catch (err: any) {
    const raw = err?.text as string | undefined;
    const recovered = raw ? extractFirstJsonObject(raw) : null;
    if (recovered && typeof recovered === 'object' && recovered !== null && 'prose' in (recovered as any)) {
      object = recovered as z.infer<typeof proseSchema>;
    } else {
      throw err;
    }
  }

  return {
    prose: object.prose.trim(),
    component: {
      series,
    },
  } satisfies SectionOutput;
}

function buildAssessmentPrompt(cohort: CohortFacts): string {
  const payload = {
    programId: cohort.programId,
    nSessions: cohort.nSessions,
    nWithPrePost: cohort.nWithPrePost,
    completion: cohort.completion,
    dataQualityNotes: cohort.dataQualityNotes,
    assessments: cohort.assessments.map((a) => ({
      key: a.key,
      label: a.label,
      avgPre: a.avgPre,
      avgPost: a.avgPost,
      avgChange: a.avgChange,
      pctImproved: a.pctImproved,
      betterWhen: (a as any).betterWhen,
    })),
  };

  return `CohortFacts data:\n${JSON.stringify(payload, null, 2)}\n\nWrite a short Assessment Outcomes summary that references these metrics explicitly. When a metric's 'betterWhen' is 'lower', treat negative avgChange as improvement; use plain language like 'a decrease in worry'. Avoid assumptions beyond this data.`;
}
