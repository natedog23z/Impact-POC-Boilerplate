import { generateObject } from 'ai';
import { z } from 'zod';

import type { CohortFacts, SectionOutput } from '@/types/schemas';

import { composeOpenAI, defaultComposeLimiter, type ComposeOptions, guardSystemPrompt, logComposeRequest, logComposeSuccess, logComposeError } from './shared';
import { OVERALL_IMPACT_SYSTEM_PROMPT } from './prompt-defaults';

const MODEL_NAME = 'gpt-4o-mini';
const proseSchema = z.object({
  prose: z.string().min(1).max(800),
});

// System prompt is now sourced from shared defaults and can be overridden via ComposeOptions

export async function composeOverallImpact(
  cohort: CohortFacts,
  options: ComposeOptions = {},
): Promise<SectionOutput> {
  const quotes = cohort.exemplarQuotes.slice(0, 2);

  const limiter = options.limiter ?? defaultComposeLimiter;
  const modelName = options.model ?? MODEL_NAME;

  let object;
  try {
    const systemMsg = guardSystemPrompt(options.prompts?.system ?? OVERALL_IMPACT_SYSTEM_PROMPT, 800);
    const userMsg = (() => {
      const base = buildImpactPrompt(cohort, quotes);
      if (options.prompts?.user) return options.prompts.user;
      if (options.prompts?.userInstructions) return `${base}\n\nAdditional instructions:\n${options.prompts.userInstructions}`;
      return base;
    })();

    logComposeRequest('overallImpact', modelName, systemMsg, userMsg, options.prompts);
    ({ object } = await limiter(() =>
      generateObject({
        model: composeOpenAI(modelName),
        schema: proseSchema,
        temperature: 0.35,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
      }),
    ));
    logComposeSuccess('overallImpact', object);
  } catch (err: any) {
    logComposeError('overallImpact', err);
    // Best-effort fallback: try to salvage prose from text, then enforce length
    const text: string | undefined = err?.text;
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.prose === 'string') {
          const truncated = parsed.prose.slice(0, 800);
          object = { prose: truncated };
        }
      } catch {
        // ignore
      }
    }
    if (!object) throw err;
  }

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
