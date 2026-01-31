/**
 * LogWhisperer orchestrator - main class that coordinates providers, AI, and notifiers
 */

import type {
  ILogProvider,
  IAISummariser,
  INotifier,
  LogWhispererConfig,
  LogSignalBundle,
  RunResult,
  Summary,
  ProgressCallback,
} from './types.js';
import { AzureProvider } from '../providers/azure/azure-provider.js';
import { AISummariser } from '../ai/summariser.js';
import { SlackNotifier } from '../notifiers/slack/slack-notifier.js';
import { truncateBundle } from '../utils/truncation.js';

export class LogWhisperer {
  private config: LogWhispererConfig;
  private provider: ILogProvider;
  private summariser: IAISummariser;
  private notifiers: INotifier[];

  constructor(config: LogWhispererConfig) {
    this.config = config;

    // Initialize provider
    if (config.provider === 'azure') {
      this.provider = new AzureProvider();
    } else {
      throw new Error(`Unsupported provider: ${config.provider}`);
    }

    // Initialize summariser
    if (config.ai.provider === 'openai') {
      this.summariser = new AISummariser();
    } else {
      throw new Error(`Unsupported AI provider: ${config.ai.provider}`);
    }

    // Initialize notifiers
    this.notifiers = [];
    if (config.notifiers.slack?.webhookUrl || process.env.SLACK_WEBHOOK_URL) {
      this.notifiers.push(new SlackNotifier(config));
    }
  }

  /**
   * Run the full pipeline: collect signals -> summarize -> notify
   */
  async run(options?: { dryRun?: boolean; skipAI?: boolean; progress?: ProgressCallback }): Promise<RunResult> {
    const startTime = Date.now();
    const errors: RunResult['errors'] = [];
    let bundle: LogSignalBundle | undefined;
    let summary: Summary | undefined;
    const progress = options?.progress;

    try {
      // Step 1: Collect signals from provider
      try {
        bundle = await this.provider.collectSignals(this.config, progress);
      } catch (error) {
        errors.push({
          stage: 'provider',
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      // Step 2: Truncate bundle if needed
      progress?.('Preparing data for analysis...');
      bundle = truncateBundle(bundle, this.config);

      // Step 3: Summarize with AI (unless skipped)
      if (!options?.skipAI) {
        try {
          progress?.('Generating AI summary...');
          summary = await this.summariser.summarise(bundle, this.config);
          progress?.('AI summary complete');
        } catch (error) {
          errors.push({
            stage: 'ai',
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      }

      // Step 4: Send notifications (unless dry run)
      if (!options?.dryRun && summary) {
        for (const notifier of this.notifiers) {
          try {
            progress?.(`Sending notification via ${notifier.name}...`);
            const meta = {
              timeWindow: bundle.timeWindow,
              environment: process.env.ENVIRONMENT,
              serviceName: process.env.SERVICE_NAME,
            };
            await notifier.send(summary, meta);
            progress?.(`Notification sent via ${notifier.name}`);
          } catch (error) {
            errors.push({
              stage: 'notifier',
              error: `${notifier.name}: ${error instanceof Error ? error.message : String(error)}`,
            });
            // Continue with other notifiers even if one fails
          }
        }
      }

      // Calculate metrics
      const totalDuration = Date.now() - startTime;
      const rowsProcessed = (bundle.errors.length + bundle.performance.length) || 0;

      return {
        success: errors.length === 0,
        summary,
        metrics: {
          queryDurations: bundle.metadata.queryDurations,
          totalDuration,
          rowsProcessed,
          tokensUsed: summary?.metadata.tokensUsed,
          truncated: bundle.metadata.truncated,
        },
        errors,
      };
    } catch (error) {
      // If we have a bundle, we can still return partial results
      const totalDuration = Date.now() - startTime;
      const rowsProcessed = bundle ? bundle.errors.length + bundle.performance.length : 0;

      return {
        success: false,
        summary,
        metrics: {
          queryDurations: bundle?.metadata.queryDurations || {},
          totalDuration,
          rowsProcessed,
          tokensUsed: summary?.metadata.tokensUsed,
          truncated: bundle?.metadata.truncated || false,
        },
        errors: errors.length > 0 ? errors : [
          {
            stage: 'provider',
            error: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): LogWhispererConfig {
    return this.config;
  }
}

/**
 * Convenience function to run LogWhisperer with a config
 */
export async function runLogWhisperer(
  config: LogWhispererConfig,
  options?: { dryRun?: boolean; skipAI?: boolean; progress?: ProgressCallback }
): Promise<RunResult> {
  const whisperer = new LogWhisperer(config);
  return whisperer.run(options);
}
