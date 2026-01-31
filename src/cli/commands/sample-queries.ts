/**
 * CLI command: sample-queries
 */

import { loadConfig } from '../../core/config.js';
import { AzureProvider } from '../../providers/azure/azure-provider.js';
import type { CLIOptions } from '../../core/types.js';
import { createCLIProgress } from '../../utils/progress.js';

export async function sampleQueriesCommand(options: CLIOptions): Promise<number> {
  try {
    const config = await loadConfig(options);
    const provider = new AzureProvider();

    console.log('Running sample queries...');
    console.log(`Workspace ID: ${config.azure.workspaceId}`);
    console.log('');

    try {
      const progress = createCLIProgress();
      const bundle = await provider.collectSignals(config, progress.callback);
      progress.finish('Data collection complete');
      console.log('');

      console.log('Query Results:');
      console.log(`  Errors query: ${bundle.errors.length} groups`);
      console.log(`  Performance query: ${bundle.performance.length} groups`);
      console.log('');

      console.log('Query Durations:');
      for (const [query, duration] of Object.entries(bundle.metadata.queryDurations)) {
        console.log(`  ${query}: ${duration}ms`);
      }
      console.log('');

      console.log('Row Counts:');
      for (const [query, count] of Object.entries(bundle.metadata.rowCounts)) {
        console.log(`  ${query}: ${count} rows`);
      }
      console.log('');

      if (bundle.errors.length > 0) {
        console.log('Top Errors:');
        for (let i = 0; i < Math.min(10, bundle.errors.length); i++) {
          const error = bundle.errors[i];
          console.log(`  ${i + 1}. ${error.operationName} / ${error.exceptionType}`);
          console.log(`     Count: ${error.count} occurrences`);
          console.log(`     First seen: ${error.firstSeen.toISOString()}`);
          console.log(`     Last seen: ${error.lastSeen.toISOString()}`);
          if (error.sampleMessages && error.sampleMessages.length > 0) {
            console.log(`     Sample messages:`);
            for (const msg of error.sampleMessages.slice(0, 3)) {
              const truncated = msg.length > 200 ? msg.substring(0, 200) + '...' : msg;
              console.log(`       - ${truncated}`);
            }
          }
          if (error.context && error.context.length > 0) {
            console.log(`     Contextual logs (${error.context.length} entries around error time):`);
            for (const ctx of error.context.slice(0, 5)) {
              const timeStr = ctx.timeGenerated.toISOString();
              if (ctx.logType === 'trace' && ctx.message) {
                const msg = ctx.message.length > 150 ? ctx.message.substring(0, 150) + '...' : ctx.message;
                console.log(`       [${timeStr}] ${ctx.severityLevel || 'INFO'}: ${msg}`);
              } else if (ctx.logType === 'dependency') {
                console.log(`       [${timeStr}] Dependency: ${ctx.type || 'unknown'} -> ${ctx.target || 'unknown'} (${ctx.success ? 'success' : 'failed'}, ${ctx.durationMs?.toFixed(0) || '?'}ms)`);
              } else if (ctx.logType === 'request') {
                console.log(`       [${timeStr}] Request: ${ctx.url || 'unknown'} (${ctx.resultCode || '?'}, ${ctx.durationMs?.toFixed(0) || '?'}ms)`);
              }
            }
            if (error.context.length > 5) {
              console.log(`       ... and ${error.context.length - 5} more contextual log entries`);
            }
          }
          console.log('');
        }
      }

      if (bundle.performance.length > 0) {
        console.log('Top Performance Issues:');
        for (let i = 0; i < Math.min(10, bundle.performance.length); i++) {
          const perf = bundle.performance[i];
          console.log(`  ${i + 1}. ${perf.operationName}${perf.resultCode ? ` (${perf.resultCode})` : ''}`);
          console.log(`     Requests: ${perf.requestCount}`);
          console.log(`     Avg: ${perf.avgDuration.toFixed(2)}ms, P95: ${perf.p95Duration.toFixed(2)}ms, P99: ${perf.p99Duration.toFixed(2)}ms`);
          console.log(`     Failures: ${perf.failureCount}`);
          console.log('');
        }
      }

      return 0;
    } catch (error) {
      console.error('Query failed:', error instanceof Error ? error.message : String(error));
      return 1;
    }
  } catch (error) {
    console.error('Failed to load configuration:', error instanceof Error ? error.message : String(error));
    return 1;
  }
}
