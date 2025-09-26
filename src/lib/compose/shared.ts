import { createOpenAI } from '@ai-sdk/openai';
import pLimit, { type LimitFunction } from 'p-limit';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is required for composer functions.');
}

export const composeOpenAI = createOpenAI({
  apiKey,
});

export const defaultComposeLimiter = pLimit(4);

export type ComposeOptions = {
  limiter?: LimitFunction;
  model?: string;
};

// Best-effort recovery: extract the first complete JSON object from a string
// Useful when models accidentally duplicate JSON outputs causing parse failures upstream
export function extractFirstJsonObject(text: string): unknown | null {
  if (!text) return null;
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
