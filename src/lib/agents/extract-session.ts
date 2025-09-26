import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import pLimit, { type LimitFunction } from 'p-limit';
import { z } from 'zod';

import type { RawSession, OutcomeNoteMilestone, ReflectionMilestone } from '@/lib/mock-sessions/types';

const extractionQuoteSchema = z.object({
  text: z.string().min(6).max(220),
  theme: z.string().min(1).optional(),
});

const extractionSchema = z.object({
  strengths: z.array(z.string().min(2)).max(6),
  improvements: z.array(z.string().min(2)).max(6),
  themes: z.array(z.string().min(2)).max(6),
  quotes: z.array(extractionQuoteSchema).max(2),
});

export type SessionExtraction = {
  strengths: string[];
  improvements: string[];
  themes: string[];
  quotes: ReadonlyArray<{ text: string; theme?: string; sessionId: string }>;
  model: string;
};

const SYSTEM_PROMPT = `You analyze counseling program session notes. Return concise tags that represent participant strengths, improvement targets, and overarching themes. Use only language present in the supplied reflections and outcome notes. Avoid diagnoses, assumptions, or new facts. Provide 1–2 short quotes already present in the text. Do not fabricate content.`;

const defaultLimiter = pLimit(8);
const MODEL_NAME = 'gpt-4o-mini';
export const EXTRACTION_AGENT_VERSION = 'session-extract@0.1.0';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is required for session extraction.');
}

const openai = createOpenAI({
  apiKey,
});

export async function extractSessionSignals(
  session: RawSession,
  options: { limiter?: LimitFunction; model?: string } = {},
): Promise<SessionExtraction> {
  const limiter = options.limiter ?? defaultLimiter;
  const modelName = options.model ?? MODEL_NAME;

  return limiter(async () => {
    const context = buildContext(session);

    if (!context) {
      return {
        strengths: [],
        improvements: [],
        themes: [],
        quotes: [],
        model: 'none',
      } satisfies SessionExtraction;
    }

    const { object } = await generateObject({
      model: openai(modelName),
      schema: extractionSchema,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildUserPrompt(session.sessionId, context),
        },
      ],
    });

    return {
      strengths: [...object.strengths],
      improvements: [...object.improvements],
      themes: [...object.themes],
      quotes: object.quotes.map((quote) => ({
        sessionId: session.sessionId,
        text: quote.text,
        theme: quote.theme,
      })),
      model: modelName,
    } satisfies SessionExtraction;
  });
}

function buildUserPrompt(sessionId: string, context: string): string {
  return `Session ID: ${sessionId}\n\nNarrative snippets:\n${context}\n\nReturn JSON with arrays: strengths, improvements, themes (≤6 items each, concise tags) and quotes (1–2 entries with existing text). Quotes must be between 6 and 220 characters.`;
}

function buildContext(session: RawSession): string | null {
  const fragments: string[] = [];

  const outcomeMilestones = session.milestones.filter(
    (milestone): milestone is OutcomeNoteMilestone => milestone.type === 'Outcome Note',
  );

  for (const milestone of outcomeMilestones) {
    const lines: string[] = [];
    if (milestone.title) {
      lines.push(`Outcome: ${milestone.title}`);
    }
    const outcome = milestone.markdownOutcome ?? {};
    const { date, focus, notes, plan } = outcome;
    if (date) lines.push(`Date: ${formatField(date)}`);
    if (focus) lines.push(`Focus: ${formatField(focus)}`);
    if (notes) lines.push(`Notes: ${formatField(notes)}`);
    if (Array.isArray(plan) && plan.length) {
      lines.push(`Plan: ${plan.join('; ')}`);
    }
    if (lines.length) {
      fragments.push(lines.join(' | '));
    }
  }

  const reflectionMilestones = session.milestones.filter(
    (milestone): milestone is ReflectionMilestone => milestone.type === 'Reflection',
  );

  for (const milestone of reflectionMilestones) {
    const text = milestone.reflection?.text ?? milestone.text;
    if (text && text.trim()) {
      fragments.push(`Reflection: ${sanitizeNewlines(text)}`);
    }
  }

  if (!fragments.length) {
    return null;
  }

  const joined = fragments.join('\n');
  return truncate(joined, 1200);
}

function formatField(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeNewlines(entry)).join('; ');
  }
  return sanitizeNewlines(value);
}

function sanitizeNewlines(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}
