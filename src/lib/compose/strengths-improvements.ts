import { generateObject } from 'ai';
import { z } from 'zod';

import type { CohortFacts, SectionOutput } from '@/types/schemas';
import { composeOpenAI, defaultComposeLimiter, type ComposeOptions, guardSystemPrompt, logComposeRequest, logComposeSuccess, logComposeError } from './shared';
import { STRENGTHS_IMPROVEMENTS_SYSTEM_PROMPT } from './prompt-defaults';

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

// System prompt is now sourced from shared defaults and can be overridden via ComposeOptions

export async function composeStrengthsImprovements(
  cohort: CohortFacts,
  options: ComposeOptions = {},
): Promise<SectionOutput> {
  const limiter = options.limiter ?? defaultComposeLimiter;
  const modelName = options.model ?? MODEL_NAME;

  const payload = buildPromptPayload(cohort);

  const systemMsg = guardSystemPrompt(options.prompts?.system ?? STRENGTHS_IMPROVEMENTS_SYSTEM_PROMPT, 800);
  const userMsg = options.prompts?.user
    ? options.prompts.user
    : options.prompts?.userInstructions
    ? `${payload}\n\nAdditional instructions:\n${options.prompts.userInstructions}`
    : payload;
  logComposeRequest('strengthsImprovements', modelName, systemMsg, userMsg, options.prompts);
  const { object } = await limiter(() =>
    generateObject({
      model: composeOpenAI(modelName),
      schema: responseSchema,
      temperature: 0.35,
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg },
      ],
    }),
  );
  logComposeSuccess('strengthsImprovements', object);

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


