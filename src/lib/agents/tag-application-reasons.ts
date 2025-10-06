import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import pLimit, { type LimitFunction } from 'p-limit';
import { z } from 'zod';

const schema = z.object({
  tags: z.array(z.object({
    tag: z.string().min(2).max(40),
    confidence: z.number().min(0).max(1),
  })).min(0).max(8),
});

const SYSTEM_PROMPT = `You convert application reasons into 1–3 short, program-agnostic intent tags.
- Use only the provided answers; do not invent details beyond them.
- Tags are 1–4 words, neutral, non-PII, and broadly understandable (e.g., "Burnout Recovery", "Skill Development", "Community Support").
- If an answer is vague or off-topic, return no tags for that answer.
- Return JSON strictly matching the provided schema.`;

const defaultLimiter = pLimit(8);
const MODEL_NAME = 'gpt-4o-mini';
export const APPLICATION_TAGGER_VERSION = 'application-tagger@0.1.0';

const apiKey = process.env.OPENAI_API_KEY;
const FEATURE_FLAG = process.env.ENABLE_LLM_REASON_TAGS === 'true';
const TAGGER_ENABLED = Boolean(apiKey) && FEATURE_FLAG;

const openai = createOpenAI({ apiKey });

export function isApplicationTaggerEnabled(): boolean {
  return TAGGER_ENABLED;
}

export async function tagApplicationReasons(
  answers: string[],
  options: { limiter?: LimitFunction; model?: string; minConfidence?: number } = {},
): Promise<{ tags: string[]; model: string }> {
  const limiter = options.limiter ?? defaultLimiter;
  const modelName = options.model ?? MODEL_NAME;
  const min = options.minConfidence ?? 0.6;

  if (!TAGGER_ENABLED || answers.length === 0) {
    return { tags: [], model: TAGGER_ENABLED ? modelName : 'none' };
  }

  const input = answers
    .map((a, i) => `#${i + 1}: ${a.replace(/\s+/g, ' ').trim()}`)
    .join('\n');

  try {
    const { object } = await limiter(() =>
      generateObject({
        model: openai(modelName),
        schema,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Application reasons (one per line):\n${input}\n\nReturn tags:` },
        ],
      }),
    );

    const seen = new Set<string>();
    const tags: string[] = [];
    for (const t of object.tags) {
      if (t.confidence < min) continue;
      const key = t.tag.trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(titleCaseShort(key));
      if (tags.length >= 10) break;
    }
    return { tags, model: modelName };
  } catch (err) {
    console.warn('Application tagger failed; continuing with no tags', err);
    return { tags: [], model: 'none' };
  }
}

function titleCaseShort(s: string): string {
  const small = new Set(['and', 'or', 'of', 'the', 'in', 'on', 'for', 'to', 'a', 'an', 'with']);
  return s
    .split(/\s+/)
    .slice(0, 4)
    .map((w, i) => (small.has(w) && i > 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}


