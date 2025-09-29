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

export type PromptOverrides = {
  system?: string;
  // Replaces the entire user message content if provided
  user?: string;
  // If provided (and user is not), appended after the default user instructions
  userInstructions?: string;
};

export type ComposeOptions = {
  limiter?: LimitFunction;
  model?: string;
  prompts?: PromptOverrides;
};

export function guardSystemPrompt(systemPrompt: string, proseCharLimit: number = 800): string {
  const guard = `\n\nHard limits (do not ignore):\n- Follow the JSON schema exactly.\n- Keep any prose fields <= ${proseCharLimit} characters.\n- Avoid markdown headings, lists, or styling; write plain sentences.`;
  return `${systemPrompt}${guard}`;
}

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
