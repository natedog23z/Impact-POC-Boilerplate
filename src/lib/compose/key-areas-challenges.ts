import { generateObject } from 'ai';
import { z } from 'zod';

import type { CohortFacts, SectionOutput } from '@/types/schemas';
import { composeOpenAI, defaultComposeLimiter, type ComposeOptions, guardSystemPrompt, logComposeRequest, logComposeSuccess, logComposeError, extractFirstJsonObject } from './shared';
import { KEY_AREAS_CHALLENGES_SYSTEM_PROMPT } from './prompt-defaults';

const MODEL_NAME = 'gpt-4o-mini';

const listItemSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(12).max(220),
});

const responseSchema = z.object({
  proseLeft: z.string().min(1).max(400),
  proseRight: z.string().min(1).max(400),
  impacts: z.array(listItemSchema).min(1).max(6),
  challenges: z.array(listItemSchema).min(1).max(6),
});

// System prompt is now sourced from shared defaults and can be overridden via ComposeOptions

export async function composeKeyAreasChallenges(
  cohort: CohortFacts,
  options: ComposeOptions = {},
): Promise<SectionOutput> {
  const limiter = options.limiter ?? defaultComposeLimiter;
  const modelName = options.model ?? MODEL_NAME;

  const payload = buildPromptPayload(cohort);

  const systemMsg = guardSystemPrompt(options.prompts?.system ?? KEY_AREAS_CHALLENGES_SYSTEM_PROMPT, 800);
  const userMsg = options.prompts?.user
    ? options.prompts.user
    : options.prompts?.userInstructions
    ? `${payload}\n\nAdditional instructions:\n${options.prompts.userInstructions}`
    : payload;
  logComposeRequest('keyAreasChallenges', modelName, systemMsg, userMsg, options.prompts);

  let object;
  try {
    ({ object } = await limiter(() =>
      generateObject({
        model: composeOpenAI(modelName),
        schema: responseSchema,
        temperature: 0.35,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
      }),
    ));
    logComposeSuccess('keyAreasChallenges', object);
  } catch (err: any) {
    // Attempt recovery if only prose length overflowed or JSON duplication occurred
    logComposeError('keyAreasChallenges', err);
    const raw = err?.text as string | undefined;
    const recovered = raw ? extractFirstJsonObject(raw) : null;
    if (recovered && typeof recovered === 'object' && recovered !== null) {
      const candidate: any = recovered;
      // Coerce fields and truncate prose to constraints
      const truncate = (s: unknown, max: number) =>
        typeof s === 'string' ? s.slice(0, max) : '';
      const coerceItems = (arr: any): Array<{ title: string; description: string }> => {
        if (!Array.isArray(arr)) return [];
        return arr
          .filter((it) => it && typeof it === 'object')
          .map((it) => ({
            title: String((it as any).title || '').slice(0, 80),
            description: String((it as any).description || '').slice(0, 220),
          }))
          .slice(0, 6);
      };
      object = {
        proseLeft: truncate(candidate.proseLeft, 400) || 'Highlights from assessed outcomes and participant strengths.',
        proseRight: truncate(candidate.proseRight, 400) || 'Common challenges the program helps participants navigate.',
        impacts: coerceItems(candidate.impacts),
        challenges: coerceItems(candidate.challenges),
      };
    } else {
      // Deterministic minimal fallback derived from cohort facts
      const left = 'Highlights from assessed outcomes and participant strengths.';
      const right = 'Common challenges the program helps participants navigate.';
      const toItems = (tags: Array<{ tag: string; count: number }>) =>
        tags.slice(0, 4).map((t) => ({ title: t.tag, description: 'Notable frequency in cohort data.' }));
      object = {
        proseLeft: left,
        proseRight: right,
        impacts: toItems(cohort.topStrengths),
        challenges: toItems(cohort.topChallenges),
      };
    }
  }

  return {
    prose: `${String(object.proseLeft || '').trim()}\n\n${String(object.proseRight || '').trim()}`.trim(),
    component: {
      impacts: object.impacts,
      challenges: object.challenges,
    },
  } satisfies SectionOutput;
}

function buildPromptPayload(cohort: CohortFacts): string {
  const series = cohort.assessments
    .map((a) => ({ key: a.key, label: a.label, avgChange: a.avgChange, pctImproved: a.pctImproved }))
    .filter((a) => a.avgChange !== null || a.pctImproved !== null)
    .sort((a, b) => (Number(b.pctImproved ?? 0) - Number(a.pctImproved ?? 0)) || (Number(b.avgChange ?? 0) - Number(a.avgChange ?? 0)) )
    .slice(0, 12);

  const payload = {
    programId: cohort.programId,
    nSessions: cohort.nSessions,
    completion: cohort.completion,
    assessments: series,
    topStrengths: cohort.topStrengths.slice(0, 10),
    topImprovements: cohort.topImprovements.slice(0, 10),
    topThemes: cohort.topThemes.slice(0, 10),
    topChallenges: cohort.topChallenges.slice(0, 10),
    topReasons: cohort.topReasons.slice(0, 10),
    exemplarQuotes: cohort.exemplarQuotes.slice(0, 2),
    notes: cohort.dataQualityNotes,
  };

  return `CohortFacts data for synthesis (ordered and truncated for clarity):\n${JSON.stringify(payload, null, 2)}\n\nWrite two short overviews and item lists as specified.`;
}


