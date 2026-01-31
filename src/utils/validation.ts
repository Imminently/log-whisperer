/**
 * Validation utilities for testing connectivity
 */

import type { LogWhispererConfig } from '../core/types.js';
import { DefaultAzureCredential, ClientSecretCredential, type TokenCredential } from '@azure/identity';
import { LogsQueryClient } from '@azure/monitor-query';
import { createOpenAIClient } from '../ai/openai-client.js';

/**
 * Test Azure connectivity
 */
export async function testAzureConnection(config: LogWhispererConfig): Promise<{
  success: boolean;
  error?: string;
  details?: string;
}> {
  try {
    // Create credential
    let credential: TokenCredential;
    if (config.azure.auth?.useDefaultCredential !== false) {
      credential = new DefaultAzureCredential();
    } else if (config.azure.auth?.clientId && config.azure.auth?.clientSecret) {
      credential = new ClientSecretCredential(
        config.azure.tenantId || '',
        config.azure.auth.clientId,
        config.azure.auth.clientSecret
      );
    } else {
      credential = new DefaultAzureCredential();
    }

    const client = new LogsQueryClient(credential);
    const workspaceId = config.azure.workspaceId;

    // Try a simple query to test connectivity
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const testQuery = `
AppTraces
| where TimeGenerated between (datetime("${oneHourAgo.toISOString()}") .. datetime("${now.toISOString()}"))
| take 1
`;

    const result = await client.queryWorkspace(workspaceId, testQuery, {
      startTime: oneHourAgo,
      endTime: now,
    });

    return {
      success: true,
      details: 'Successfully connected to Azure Monitor and queried workspace',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide helpful error messages
    if (errorMessage.includes('authentication') || errorMessage.includes('401') || errorMessage.includes('403')) {
      return {
        success: false,
        error: 'Authentication failed',
        details: 'Unable to authenticate with Azure. Check your credentials (try `az login` for local development).',
      };
    } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return {
        success: false,
        error: 'Workspace not found',
        details: `Workspace ID "${config.azure.workspaceId}" not found or not accessible. Verify the workspace ID is correct.`,
      };
    } else if (errorMessage.includes('permission') || errorMessage.includes('authorization')) {
      return {
        success: false,
        error: 'Insufficient permissions',
        details: 'Your Azure identity does not have permission to query this workspace. You need the "Log Analytics Reader" role.',
      };
    }

    return {
      success: false,
      error: 'Connection failed',
      details: errorMessage,
    };
  }
}

/**
 * Test OpenAI connectivity
 */
export async function testOpenAIConnection(config: LogWhispererConfig): Promise<{
  success: boolean;
  error?: string;
  details?: string;
}> {
  try {
    const client = createOpenAIClient(config);
    const model = config.ai.model || 'gpt-4o';

    // Try a simple API call to test connectivity
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: 'test',
        },
      ],
      max_tokens: 5,
    });

    if (response.choices && response.choices.length > 0) {
      return {
        success: true,
        details: `Successfully connected to OpenAI API (model: ${model})`,
      };
    }

    return {
      success: false,
      error: 'Invalid response',
      details: 'OpenAI API returned an unexpected response',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('authentication')) {
      return {
        success: false,
        error: 'Authentication failed',
        details: 'Invalid OpenAI API key. Check your OPENAI_API_KEY environment variable or config.',
      };
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        success: false,
        error: 'Rate limited',
        details: 'OpenAI API rate limit exceeded. This is temporary - try again later.',
      };
    } else if (errorMessage.includes('model') || errorMessage.includes('404')) {
      return {
        success: false,
        error: 'Model not found',
        details: `Model "${config.ai.model || 'gpt-4o'}" not found or not accessible. Check your model name.`,
      };
    }

    return {
      success: false,
      error: 'Connection failed',
      details: errorMessage,
    };
  }
}

/**
 * Test Slack webhook (basic validation)
 */
export async function testSlackWebhook(config: LogWhispererConfig): Promise<{
  success: boolean;
  error?: string;
  details?: string;
}> {
  const webhookUrl = config.notifiers.slack?.webhookUrl || process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      success: false,
      error: 'Not configured',
      details: 'Slack webhook URL not provided in config or SLACK_WEBHOOK_URL environment variable',
    };
  }

  // Basic URL validation
  try {
    const url = new URL(webhookUrl);
    if (!url.href.startsWith('https://hooks.slack.com/')) {
      return {
        success: false,
        error: 'Invalid URL format',
        details: 'Slack webhook URL should start with https://hooks.slack.com/',
      };
    }

    // Try a test request (Slack will return "invalid_payload" but that's OK - it means the webhook exists)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'test' }),
    });

    if (response.ok) {
      return {
        success: true,
        details: 'Slack webhook URL is valid and accessible',
      };
    } else {
      const responseText = await response.text();
      // Slack returns 200 even for invalid payloads sometimes, but 400 means invalid webhook
      if (response.status === 400 && responseText.includes('invalid_payload')) {
        return {
          success: true,
          details: 'Slack webhook URL is valid (test message format was invalid, but webhook exists)',
        };
      } else if (response.status === 404) {
        return {
          success: false,
          error: 'Webhook not found',
          details: 'Slack webhook URL returned 404. The webhook may have been deleted or the URL is incorrect.',
        };
      }

      return {
        success: false,
        error: 'Webhook validation failed',
        details: `Slack returned status ${response.status}: ${responseText.substring(0, 100)}`,
      };
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      return {
        success: false,
        error: 'Invalid URL format',
        details: 'Slack webhook URL is not a valid URL',
      };
    }

    return {
      success: false,
      error: 'Connection failed',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
