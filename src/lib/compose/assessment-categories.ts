import { generateObject } from 'ai';
import { z } from 'zod';

import type { CohortFacts, SectionOutput } from '@/types/schemas';
import { composeOpenAI, defaultComposeLimiter, type ComposeOptions } from './shared';

const MODEL_NAME = 'gpt-4o-mini';

const categorySchema = z.object({
  key: z.string().min(1).max(40),
  title: z.string().min(3).max(80),
  description: z.string().min(8).max(200).optional(),
  includedKeys: z.array(z.string().min(1)).min(1).max(8),
});

const responseSchema = z.object({
  prose: z.string().min(1).max(800),
  categories: z.array(categorySchema).min(3).max(8),
});

const SYSTEM_PROMPT = `Group quantitative survey assessments into concise outcome categories for an impact dashboard.
- Use only the provided assessment keys, labels, and direction-of-improvement (betterWhen).
- Create 4–6 human-friendly categories (e.g., "Meaning & Purpose", "Close Social Relationships", "Mental & Physical Health", "Financial & Material Stability").
- For each category, return a short title and list of includedKeys referencing the original assessment keys. Avoid fabricating keys; prefer grouping and sensible naming.
- Keep language neutral and professional. Avoid clinical claims or value judgments.
Return JSON only per the provided schema.`;

export type AssessmentCategory = z.infer<typeof categorySchema> & {
  percentImproved: number | null;
};

export async function composeAssessmentCategories(
  cohort: CohortFacts,
  options: ComposeOptions = {},
): Promise<SectionOutput> {
  const limiter = options.limiter ?? defaultComposeLimiter;
  const modelName = options.model ?? MODEL_NAME;

  const series = cohort.assessments.map((a) => ({
    key: a.key,
    label: a.label,
    pctImproved: a.pctImproved,
    avgChange: a.avgChange,
    betterWhen: (a as any).betterWhen,
  }));

  if (!series.length) {
    return {
      prose:
        'Assessment data is not yet available for this cohort. Once pre/post responses are collected, categories will be grouped automatically.',
      component: { categories: [] },
    } satisfies SectionOutput;
  }

  const payload = buildPromptPayload(series);

  const { object } = await limiter(() =>
    generateObject({
      model: composeOpenAI(modelName),
      schema: responseSchema,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: payload },
      ],
    }),
  );

  const byKey = new Map(series.map((s) => [s.key, s] as const));

  const categories: AssessmentCategory[] = object.categories.map((c) => {
    const vals = c.includedKeys
      .map((k) => byKey.get(k))
      .filter(Boolean)
      .map((v) => v as typeof series[number]);

    const valid = vals.filter((v) => typeof v.pctImproved === 'number');
    const percentImproved = valid.length
      ? roundTo(valid.reduce((sum, v) => sum + (v.pctImproved as number), 0) / valid.length, 4)
      : null;

    return { ...c, percentImproved };
  });

  return {
    prose: object.prose.trim(),
    component: {
      categories,
    },
  } satisfies SectionOutput;
}

function buildPromptPayload(series: Array<{ key: string; label: string; pctImproved: number | null; avgChange: number | null; betterWhen?: 'higher' | 'lower' }>): string {
  const input = {
    assessments: series.map((s) => ({
      key: s.key,
      label: s.label,
      pctImproved: s.pctImproved,
      avgChange: s.avgChange,
      betterWhen: s.betterWhen,
    })),
  };

  return `Assessments to group (keys, labels, metrics):\n${JSON.stringify(input, null, 2)}\n\nInstructions:\n- Propose 4–6 outcome categories that cover these items.\n- Use inclusive, plain-language titles.\n- Each assessment key should appear in at most one category. If an item does not fit, place it in the closest relevant category.\n- Do not invent numeric values; only group and name.\nReturn strictly valid JSON for { prose, categories[] }.`;
}

function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}


