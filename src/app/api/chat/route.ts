import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import type { CoreMessage } from 'ai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

/**
 * AI API Route for Background Automation Tasks
 * 
 * This endpoint can be used for:
 * - Content generation and summarization
 * - Data analysis and insights
 * - Text processing and transformation
 * - Automated report generation
 * - Email drafting and optimization
 * 
 * Example usage:
 * 
 * ```typescript
 * const response = await fetch('/api/chat', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     messages: [
 *       { role: 'user', content: 'Summarize this data: ...' }
 *     ]
 *   })
 * });
 * 
 * const reader = response.body?.getReader();
 * // Process streaming response...
 * ```
 */
type ChatRequest = {
  messages: CoreMessage[];
  systemPrompt?: string;
};

export async function POST(req: Request) {
  const { messages, systemPrompt } = (await req.json()) as ChatRequest;

  const chatHistory = messages ?? [];

  // Default system prompt for Gloo Impact automation tasks
  const defaultSystemPrompt = `You are an AI assistant for Gloo Impact, a platform focused on maximizing philanthropy with precision and transparency. 
  
  You help with background automation tasks such as:
  - Content generation and summarization
  - Data analysis and insights
  - Text processing and transformation
  - Report generation
  - Email drafting and optimization
  
  Always provide accurate, concise, and professional responses.`;

  // Ask OpenAI for a streaming completion given the prompt
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages: [
      {
        role: 'system',
        content: systemPrompt || defaultSystemPrompt,
      },
      ...chatHistory,
    ],
  });

  return result.toTextStreamResponse();
}
