/**
 * Slack webhook notifier implementation
 */

import type { INotifier, NotificationMeta, NotifyResult, Summary, LogWhispererConfig } from '../../core/types.js';
import { formatSummaryForSlack } from '../../utils/formatting.js';

// Slack webhook message size limit (approximate)
const SLACK_MESSAGE_MAX_LENGTH = 4000;

/**
 * Truncate message to fit Slack limits
 */
function truncateForSlack(message: string): string {
  if (message.length <= SLACK_MESSAGE_MAX_LENGTH) {
    return message;
  }

  // Try to truncate at a reasonable point (e.g., before last section)
  const truncated = message.substring(0, SLACK_MESSAGE_MAX_LENGTH - 100);
  const lastNewline = truncated.lastIndexOf('\n');
  if (lastNewline > SLACK_MESSAGE_MAX_LENGTH * 0.8) {
    return truncated.substring(0, lastNewline) + '\n\n_Message truncated due to length limits_';
  }

  return truncated + '\n\n_Message truncated due to length limits_';
}

export class SlackNotifier implements INotifier {
  name = 'slack';
  private config?: LogWhispererConfig;

  constructor(config?: LogWhispererConfig) {
    this.config = config;
  }

  async send(summary: Summary, meta: NotificationMeta): Promise<NotifyResult> {
    const webhookUrl = this.config?.notifiers.slack?.webhookUrl || process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL environment variable is required');
    }

    // Format summary for Slack
    let message = formatSummaryForSlack(summary);

    // Add metadata if available
    if (meta.environment || meta.serviceName) {
      const metaParts: string[] = [];
      if (meta.environment) {
        metaParts.push(`Environment: ${meta.environment}`);
      }
      if (meta.serviceName) {
        metaParts.push(`Service: ${meta.serviceName}`);
      }
      message = `${message}\n\n_${metaParts.join(' | ')}_`;
    }

    // Truncate if needed
    message = truncateForSlack(message);

    // Build Slack payload
    const payload: {
      text: string;
      username?: string;
      icon_emoji?: string;
      channel?: string;
    } = {
      text: message,
    };

    // Add optional fields from config
    const slackConfig = this.config?.notifiers.slack;
    payload.username = slackConfig?.username || 'Log Whisperer';
    payload.icon_emoji = slackConfig?.iconEmoji || ':mag:';
    if (slackConfig?.channel) {
      payload.channel = slackConfig.channel;
    }

    // Send to Slack
    let retries = 3;
    let lastError: Error | undefined;

    while (retries > 0) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Slack API error: ${response.status} ${errorText}`);
        }

        return {
          success: true,
          messageId: response.headers.get('X-Slack-Request-Id') || undefined,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('4')) {
          throw lastError;
        }

        retries--;
        if (retries > 0) {
          // Exponential backoff
          const delay = 1000 * Math.pow(2, 3 - retries);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Failed to send to Slack after retries',
    };
  }
}
