import { Configuration, OpenAIApi } from 'openai-edge';
import { OpenAIStream, StreamingTextResponse } from 'ai';

// Create an OpenAI API client (that's edge-friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

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
export async function POST(req: Request) {
  const { messages, systemPrompt } = await req.json();

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
  const response = await openai.createChatCompletion({
    model: 'gpt-4o-mini',
    stream: true,
    messages: [
      {
        role: 'system',
        content: systemPrompt || defaultSystemPrompt,
      },
      ...messages,
    ],
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);
  // Respond with the stream
  return new StreamingTextResponse(stream);
}
