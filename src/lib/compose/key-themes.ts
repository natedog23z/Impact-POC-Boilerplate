import { generateObject } from 'ai';
import { z } from 'zod';

import type { CohortFacts, SectionOutput } from '@/types/schemas';
import { composeOpenAI, defaultComposeLimiter, extractFirstJsonObject, type ComposeOptions } from './shared';

const MODEL_NAME = 'gpt-4o-mini';

const themeItemSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(12).max(220),
  percentMentioned: z.number().min(0).max(100).nullable(),
});

const responseSchema = z.object({
  prose: z.string().min(1).max(800),
  themes: z.array(themeItemSchema).min(3).max(6),
});

const SYSTEM_PROMPT = `You create a "Key Themes" section for an impact dashboard.
Use only the provided cohort facts: topThemes (tags with counts), exemplar quotes (optional), completion, and data-quality notes.
Tasks:
- Convert the most frequent theme tags into concise, human-friendly titles.
- Write a one-sentence description for each title that reflects what participants are saying, grounded in tags and quotes.
- Include percentMentioned for each item computed from provided counts and cohort size (already provided in the prompt data when available).
Constraints: 3–6 items, neutral tone, no hype, no diagnoses or PII. Keep prose under 120 words.`;

export async function composeKeyThemes(
  cohort: CohortFacts,
  options: ComposeOptions = {},
): Promise<SectionOutput> {
  const limiter = options.limiter ?? defaultComposeLimiter;
  const modelName = options.model ?? MODEL_NAME;

  const total = Math.max(1, cohort.nSessions);
  const series = cohort.topThemes.map((t) => ({
    tag: t.tag,
    count: t.count,
    percentMentioned: Math.round((t.count / total) * 100),
  }));

  if (!series.length) {
    return {
      prose:
        'Qualitative themes are not yet available. As more reflections are collected, common themes will be summarized here.',
      component: { themes: [] },
    } satisfies SectionOutput;
  }

  const payload = buildPromptPayload(cohort, series);

  let object;
  try {
    ({ object } = await limiter(() =>
      generateObject({
        model: composeOpenAI(modelName),
        schema: responseSchema,
        temperature: 0.35,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: payload },
        ],
      }),
    ));
  } catch (err: any) {
    const raw = err?.text as string | undefined;
    const recovered = raw ? extractFirstJsonObject(raw) : null;
    if (recovered && typeof recovered === 'object' && recovered !== null && 'themes' in (recovered as any) && 'prose' in (recovered as any)) {
      object = recovered as z.infer<typeof responseSchema>;
    } else {
      throw err;
    }
  }

  return {
    prose: object.prose.trim(),
    component: {
      themes: object.themes,
    },
  } satisfies SectionOutput;
}

function buildPromptPayload(
  cohort: CohortFacts,
  series: Array<{ tag: string; count: number; percentMentioned: number }>,
): string {
  const data = {
    programId: cohort.programId,
    nSessions: cohort.nSessions,
    completion: cohort.completion,
    topThemes: series,
    exemplarQuotes: cohort.exemplarQuotes.slice(0, 2).map((q) => ({ text: q.text, theme: q.theme })),
    dataQualityNotes: cohort.dataQualityNotes.slice(0, 6),
  };
  return `CohortFacts data (themes only):\n${JSON.stringify(data, null, 2)}\n\n` +
    `Using only this data, write: 1) a 2–3 sentence overview (prose) summarizing the dominant themes; 2) 3–6 theme items with {title, description, percentMentioned}. Titles should be derived from tags. Descriptions must be one sentence, grounded in tags and quotes. Avoid assumptions beyond the provided data.`;
}


