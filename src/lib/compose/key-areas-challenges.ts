import { generateObject } from 'ai';
import { z } from 'zod';

import type { CohortFacts, SectionOutput } from '@/types/schemas';
import { composeOpenAI, defaultComposeLimiter, type ComposeOptions } from './shared';

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

const SYSTEM_PROMPT = `You create a two-column dashboard section titled "Key Areas of Impact" and "Primary Challenges Addressed".
Use only the provided cohort facts: assessment deltas and % improved, top strengths/improvements/themes/challenges, reasons, completion, and exemplar quotes.
Synthesize:
- Key Areas of Impact: derive from the strongest positive assessment signals and frequent strengths/themes; write plain, non-technical benefits.
- Primary Challenges Addressed: derive from frequent challenges and improvement tags plus intake reasons; phrase as what the program helps with.
Keep items concise, neutral, and program-agnostic. Avoid hype, diagnoses, or PII. Limit to ≤ 6 items per column with single-sentence descriptions. Provide short prose intros for each column.`;

export async function composeKeyAreasChallenges(
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
    prose: `${object.proseLeft.trim()}\n\n${object.proseRight.trim()}`.trim(),
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


