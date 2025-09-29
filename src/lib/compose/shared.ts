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

// --- Logging helpers (server-side only) ---
const SHOULD_LOG = Boolean(process.env.COMPOSE_LOG_PROMPTS);
const MAX_LOG_CHARS = Number(process.env.COMPOSE_LOG_MAX ?? 2000);

function truncate(text: string, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.floor(max * 0.7))}\n... [${text.length - Math.floor(max * 0.7)} chars omitted] ...\n${text.slice(-Math.floor(max * 0.3))}`;
}

export function logComposeRequest(
  section: string,
  modelName: string,
  systemMessage: string,
  userMessage: string,
  prompts?: PromptOverrides,
): void {
  if (!SHOULD_LOG) return;
  try {
    // eslint-disable-next-line no-console
    console.log(
      `\n[COMPOSE][REQUEST] ${section} -> ${modelName}\n` +
        `system:\n${truncate(systemMessage, MAX_LOG_CHARS)}\n\n` +
        `user:\n${truncate(userMessage, MAX_LOG_CHARS)}\n` +
        (prompts ? `overrides: ${JSON.stringify(prompts)}\n` : ''),
    );
  } catch {}
}

export function logComposeSuccess(section: string, result: unknown): void {
  if (!SHOULD_LOG) return;
  try {
    const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    // eslint-disable-next-line no-console
    console.log(`\n[COMPOSE][SUCCESS] ${section}\n${truncate(text, MAX_LOG_CHARS)}\n`);
  } catch {}
}

export function logComposeError(section: string, error: unknown): void {
  if (!SHOULD_LOG) return;
  try {
    // eslint-disable-next-line no-console
    console.error(`\n[COMPOSE][ERROR] ${section}`, error);
  } catch {}
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
