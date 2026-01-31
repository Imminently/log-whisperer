/**
 * CLI command: run
 */

import { loadConfig } from '../../core/config.js';
import { runLogWhisperer } from '../../core/orchestrator.js';
import type { CLIOptions } from '../../core/types.js';
import { formatSummaryAsMarkdown, formatSummaryAsPlainText } from '../../utils/formatting.js';
import { createCLIProgress } from '../../utils/progress.js';

export async function runCommand(options: CLIOptions): Promise<number> {
  try {
    const config = await loadConfig(options);

    const progress = createCLIProgress();
    const result = await runLogWhisperer(config, {
      dryRun: options.dryRun || false,
      skipAI: options.noAi || false,
      progress: progress.callback,
    });
    progress.finish('Analysis complete');
    console.log('');

    // Output results
    if (options.verbose) {
      console.error('Metrics:', JSON.stringify(result.metrics, null, 2));
    }

    if (result.summary) {
      if (config.output?.markdown !== false) {
        console.log(formatSummaryAsMarkdown(result.summary));
      } else {
        console.log(formatSummaryAsPlainText(result.summary));
      }
    } else if (options.noAi) {
      console.log('Raw data collected (--no-ai flag used)');
      if (result.metrics.rowsProcessed > 0) {
        console.log(`Processed ${result.metrics.rowsProcessed} rows`);
      }
    }

    if (result.errors.length > 0) {
      console.error('Errors occurred:');
      for (const error of result.errors) {
        console.error(`  [${error.stage}] ${error.error}`);
      }
    }

    return result.success ? 0 : 1;
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : String(error));
    return 1;
  }
}
