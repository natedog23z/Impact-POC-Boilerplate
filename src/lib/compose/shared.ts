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
