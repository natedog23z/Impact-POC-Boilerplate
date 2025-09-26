import { generateObject } from 'ai';
import { z } from 'zod';

import type { CohortFacts, SectionOutput } from '@/types/schemas';
import { composeOpenAI, defaultComposeLimiter, type ComposeOptions } from './shared';

const MODEL_NAME = 'gpt-4o-mini';

const itemSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(12).max(220),
});

const responseSchema = z.object({
  prose: z.string().min(1).max(800),
  strengths: z.array(itemSchema).min(1).max(6),
  improvements: z.array(itemSchema).min(1).max(6),
});

const SYSTEM_PROMPT = `You produce a balanced "Strengths and Areas for Improvement" section for an impact dashboard.
Use only the provided cohort facts (counts, top tags, limited quotes). Turn the most frequent strength tags into clear titles with one-sentence plain-language descriptions that reflect the cohort.
For improvements, convert the most frequent improvement and challenge tags into constructive, neutral recommendations (one sentence each). Avoid hype, clinical claims, or PII.
Return concise items (≤ 6 each).`;

export async function composeStrengthsImprovements(
  cohort: CohortFacts,
  options: ComposeOptions = {},
): Promise<SectionOutput> {
  const limiter = options.limiter ?? defaultComposeLimiter;
  const modelName = options.model ?? MODEL_NAME;

  const payload = buildPromptPayload(cohort);

  const { object } = await limiter(() =>
    generateObject({
      model: composeOpenAI(modelName),
      schema: responseSchema,
      temperature: 0.35,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: payload },
      ],
    }),
  );

  return {
    prose: object.prose.trim(),
    component: {
      strengths: object.strengths,
      improvements: object.improvements,
    },
  } satisfies SectionOutput;
}

function buildPromptPayload(cohort: CohortFacts): string {
  // Keep only the essential, ordered context for the model
  const data = {
    programId: cohort.programId,
    nSessions: cohort.nSessions,
    completion: cohort.completion,
    dataQualityNotes: cohort.dataQualityNotes.slice(0, 6),
    topStrengths: cohort.topStrengths.slice(0, 6),
    topImprovements: cohort.topImprovements.slice(0, 6),
    topChallenges: cohort.topChallenges.slice(0, 6),
    exemplarQuotes: cohort.exemplarQuotes.slice(0, 2).map((q) => ({ text: q.text, theme: q.theme })),
  };

  return `CohortFacts data:\n${JSON.stringify(data, null, 2)}\n\n` +
    `Using only this data, write:\n` +
    `1) A 2–3 sentence overview ("prose").\n` +
    `2) Up to 6 "strengths" items with {title, description}.\n` +
    `3) Up to 6 "improvements" items with {title, description}.\n` +
    `Titles should be short and descriptive. Descriptions should be one sentence, grounded in the tags and quotes. Avoid assumptions beyond the data.`;
}


