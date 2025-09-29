import { generateObject } from 'ai';
import { z } from 'zod';

import type { CohortFacts, SectionOutput } from '@/types/schemas';
import { composeOpenAI, defaultComposeLimiter, type ComposeOptions, guardSystemPrompt, logComposeRequest, logComposeSuccess, logComposeError } from './shared';
import { PARTICIPANT_REASONS_SYSTEM_PROMPT } from './prompt-defaults';

const MODEL_NAME = 'gpt-4o-mini';

const reasonItemSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(12).max(220),
  percent: z.number().min(0).max(100),
});

const responseSchema = z.object({
  prose: z.string().min(1).max(800),
  reasons: z.array(reasonItemSchema).min(1).max(6),
});

// System prompt is now sourced from shared defaults and can be overridden via ComposeOptions

export async function composeParticipantReasons(
  cohort: CohortFacts,
  options: ComposeOptions = {},
): Promise<SectionOutput> {
  const limiter = options.limiter ?? defaultComposeLimiter;
  const modelName = options.model ?? MODEL_NAME;

  const total = Math.max(1, cohort.nSessions);
  const series = cohort.topReasons.map((r) => ({
    tag: r.tag,
    count: r.count,
    percent: Math.round((r.count / total) * 100),
  }));

  if (!series.length) {
    return {
      prose: 'Participant application reasons are not yet available. Collect intake responses to surface why participants are seeking the program.',
      component: { reasons: [] },
    } satisfies SectionOutput;
  }

  const payload = buildPromptPayload(cohort, series);

  const systemMsg = guardSystemPrompt(options.prompts?.system ?? PARTICIPANT_REASONS_SYSTEM_PROMPT, 800);
  const userMsg = options.prompts?.user
    ? options.prompts.user
    : options.prompts?.userInstructions
    ? `${payload}\n\nAdditional instructions:\n${options.prompts.userInstructions}`
    : payload;
  logComposeRequest('participantReasons', modelName, systemMsg, userMsg, options.prompts);

  const { object } = await limiter(() =>
    generateObject({
      model: composeOpenAI(modelName),
      schema: responseSchema,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg },
      ],
    }),
  );

  logComposeSuccess('participantReasons', object);

  return {
    prose: object.prose.trim(),
    component: {
      reasons: object.reasons,
    },
  } satisfies SectionOutput;
}

function buildPromptPayload(
  cohort: CohortFacts,
  series: Array<{ tag: string; count: number; percent: number }>,
): string {
  const data = {
    programId: cohort.programId,
    nSessions: cohort.nSessions,
    topReasons: series,
    dataQualityNotes: cohort.dataQualityNotes.slice(0, 6),
  };
  return `CohortFacts data (reasons only):\n${JSON.stringify(data, null, 2)}\n\n` +
    `Using only this data, write: 1) a 2–3 sentence overview (prose) describing why participants sought {offering name} in neutral, respectful language; 2) up to 6 reason items with {title, description, percent} where percent is already provided.`;
}


