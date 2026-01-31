/**
 * OpenAI client wrapper
 */

import OpenAI from 'openai';
import type { LogWhispererConfig } from '../core/types.js';

/**
 * Create OpenAI client from config
 */
export function createOpenAIClient(config: LogWhispererConfig): OpenAI {
  const apiKey = config.ai.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable or provide in config.');
  }

  return new OpenAI({
    apiKey,
  });
}

/**
 * Call OpenAI API for summarisation
 */
export async function summarizeWithOpenAI(
  client: OpenAI,
  prompt: string,
  config: LogWhispererConfig
): Promise<{ content: string; tokensUsed: number; model: string }> {
  const model = config.ai.model || 'gpt-4o';
  // Increase default max tokens for models that need more space for detailed RCA
  // gpt-5-mini and similar models may need more tokens for comprehensive responses
  const defaultMaxTokens = model.includes('gpt-5') || model.includes('gpt-4o-mini') ? 4000 : 2000;
  const maxTokens = config.ai.maxTokens || defaultMaxTokens;
  const temperature = config.ai.temperature ?? 0.3;

  // Determine which parameter to use based on model
  // Newer models (gpt-4o-mini, o1, etc.) use max_completion_tokens
  // Older models use max_tokens
  const useMaxCompletionTokens = model.includes('o1') || 
                                  model.includes('gpt-4o-mini') || 
                                  model.includes('gpt-5') ||
                                  model.includes('gpt-4o-2024');

  // Some models don't support temperature parameter (or only support default value)
  // Models like gpt-5-mini only support temperature=1 (default)
  const supportsTemperature = !model.includes('gpt-5-mini') && 
                              !model.includes('o1');

  try {
    const requestParams: any = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that analyzes operational logs and provides concise, actionable summaries in JSON format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    };

    // Only add temperature if the model supports it
    if (supportsTemperature) {
      requestParams.temperature = temperature;
    }

    // Use the appropriate parameter based on model
    if (useMaxCompletionTokens) {
      requestParams.max_completion_tokens = maxTokens;
    } else {
      requestParams.max_tokens = maxTokens;
    }

    const response = await client.chat.completions.create(requestParams);

    const content = response.choices[0]?.message?.content || '';
    const tokensUsed = response.usage?.total_tokens || 0;

    return {
      content,
      tokensUsed,
      model,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }
}
