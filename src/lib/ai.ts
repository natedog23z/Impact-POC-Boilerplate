/**
 * AI Utilities for Background Automation Tasks
 * 
 * This module provides helper functions for using AI in background processes
 * without requiring a chat UI. Perfect for content generation, data analysis,
 * and automated text processing.
 */

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIRequestOptions {
  messages: AIMessage[];
  systemPrompt?: string;
  stream?: boolean;
}

/**
 * Generate AI response for background tasks
 * 
 * @param prompt - The user prompt/question
 * @param systemPrompt - Optional custom system prompt
 * @param stream - Whether to return streaming response (default: false)
 * @returns Promise resolving to AI response text or ReadableStream
 */
export async function generateAIResponse(
  prompt: string, 
  systemPrompt?: string,
  stream: boolean = false
): Promise<string | ReadableStream> {
  const options: AIRequestOptions = {
    messages: [
      { role: 'user', content: prompt }
    ],
    systemPrompt
  };

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.statusText}`);
  }

  if (stream) {
    return response.body!;
  }

  // For non-streaming, collect all chunks
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  return result;
}

/**
 * Summarize long text content
 */
export async function summarizeContent(content: string, maxLength: number = 200): Promise<string> {
  const prompt = `Please summarize the following content in ${maxLength} characters or less:\n\n${content}`;
  return await generateAIResponse(prompt) as string;
}

/**
 * Generate email content
 */
export async function generateEmail(
  subject: string, 
  keyPoints: string[], 
  tone: 'formal' | 'friendly' | 'professional' = 'professional'
): Promise<string> {
  const prompt = `Generate an email with the subject "${subject}" that covers these key points:
${keyPoints.map(point => `- ${point}`).join('\n')}

Use a ${tone} tone and format it as a complete email.`;

  return await generateAIResponse(prompt) as string;
}

/**
 * Analyze data and provide insights
 */
export async function analyzeData(data: any, analysisType: string = 'general insights'): Promise<string> {
  const prompt = `Please analyze this data and provide ${analysisType}:

${JSON.stringify(data, null, 2)}

Focus on key trends, patterns, and actionable insights.`;

  return await generateAIResponse(prompt) as string;
}

/**
 * Generate content based on template and data
 */
export async function generateContent(
  template: string, 
  data: Record<string, any>
): Promise<string> {
  const prompt = `Using this template and data, generate the final content:

Template: ${template}

Data: ${JSON.stringify(data, null, 2)}

Replace any placeholders and ensure the content flows naturally.`;

  return await generateAIResponse(prompt) as string;
}

/**
 * Process streaming AI response with callback
 */
export async function processStreamingResponse(
  prompt: string,
  onChunk: (chunk: string) => void,
  systemPrompt?: string
): Promise<void> {
  const stream = await generateAIResponse(prompt, systemPrompt, true) as ReadableStream;
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Example usage for common automation tasks
 */
export const AIExamples = {
  // Generate a project summary
  async generateProjectSummary(projectData: any): Promise<string> {
    return await generateContent(
      'Generate a comprehensive project summary that includes: project goals, key metrics, current status, and next steps.',
      projectData
    );
  },

  // Create automated reports
  async createReport(title: string, data: any[]): Promise<string> {
    const prompt = `Create a ${title} report based on this data. Include:
- Executive summary
- Key findings
- Data analysis
- Recommendations

Data: ${JSON.stringify(data, null, 2)}`;

    return await generateAIResponse(prompt) as string;
  },

  // Process user feedback
  async analyzeFeedback(feedback: string[]): Promise<string> {
    const prompt = `Analyze this user feedback and provide:
- Common themes
- Sentiment analysis
- Priority issues
- Recommended actions

Feedback:
${feedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;

    return await generateAIResponse(prompt) as string;
  }
};
