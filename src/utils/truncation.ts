/**
 * Truncation utilities for input size limiting
 */

import type { LogSignalBundle, LogWhispererConfig } from '../core/types.js';
import { safeDate } from './dates.js';

/**
 * Truncate a string to a maximum length, adding ellipsis if truncated
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Truncate an array to a maximum length
 */
export function truncateArray<T>(arr: T[], maxLength: number): T[] {
  return arr.slice(0, maxLength);
}

/**
 * Estimate character count of a signal bundle
 */
function estimateBundleSize(bundle: LogSignalBundle): number {
  let size = 0;

  // Errors
  for (const error of bundle.errors) {
    size += JSON.stringify(error).length;
  }

  // Performance
  for (const perf of bundle.performance) {
    size += JSON.stringify(perf).length;
  }

  return size;
}

/**
 * Truncate signal bundle to fit within budget constraints
 */
export function truncateBundle(
  bundle: LogSignalBundle,
  config: LogWhispererConfig
): LogSignalBundle {
  const maxChars = config.ai.budgetControls?.maxInputChars ?? 50000;
  const maxEvents = config.ai.budgetControls?.maxEvents ?? 500;
  const maxSamples = config.ai.budgetControls?.maxSamplesPerQuery ?? 5;
  const topErrors = config.sampling?.topErrorGroups ?? 10;

  const truncated: LogSignalBundle = {
    ...bundle,
    errors: [...bundle.errors],
    performance: [...bundle.performance],
    metadata: {
      ...bundle.metadata,
      truncated: false,
    },
  };

  // Sort errors by count and take top N
  truncated.errors.sort((a, b) => b.count - a.count);
  truncated.errors = truncateArray(truncated.errors, topErrors);

  // Limit sample messages per error
  for (const error of truncated.errors) {
    error.sampleMessages = truncateArray(error.sampleMessages, maxSamples);
    // Truncate individual messages
    error.sampleMessages = error.sampleMessages.map((msg) =>
      truncateString(msg, 500)
    );
  }

  // Limit performance signals
  truncated.performance.sort((a, b) => b.p95Duration - a.p95Duration);
  truncated.performance = truncateArray(truncated.performance, topErrors);

  // Overall event limit
  const totalEvents = truncated.errors.length + truncated.performance.length;
  if (totalEvents > maxEvents) {
    const ratio = maxEvents / totalEvents;
    const errorCount = Math.floor(truncated.errors.length * ratio);
    const perfCount = Math.floor(truncated.performance.length * ratio);
    truncated.errors = truncateArray(truncated.errors, errorCount);
    truncated.performance = truncateArray(truncated.performance, perfCount);
  }

  // Character limit check
  let currentSize = estimateBundleSize(truncated);
  if (currentSize > maxChars) {
    // Aggressively truncate messages
    for (const error of truncated.errors) {
      error.sampleMessages = error.sampleMessages.map((msg) =>
        truncateString(msg, 200)
      );
      // Remove some samples if still too large
      if (currentSize > maxChars) {
        error.sampleMessages = truncateArray(error.sampleMessages, 2);
        currentSize = estimateBundleSize(truncated);
      }
    }
  }

  // Mark as truncated if we made any changes
  if (
    truncated.errors.length < bundle.errors.length ||
    truncated.performance.length < bundle.performance.length ||
    truncated.errors.some(
      (e, i) => e.sampleMessages.length < bundle.errors[i]?.sampleMessages.length
    )
  ) {
    truncated.metadata.truncated = true;
  }

  return truncated;
}

/**
 * Format bundle as text for AI input
 */
export function formatBundleForAI(bundle: LogSignalBundle): string {
  const lines: string[] = [];

  // Ensure dates are Date objects
  const fromDate = safeDate(bundle.timeWindow.from);
  const toDate = safeDate(bundle.timeWindow.to);

  lines.push(`Time Window: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
  lines.push('');

  if (bundle.errors.length === 0 && bundle.performance.length === 0) {
    lines.push('## Summary');
    lines.push('');
    lines.push('**No errors or performance issues found during this time window.**');
    lines.push('');
    lines.push('This indicates the system was operating normally with no operational issues to report.');
    lines.push('');
  } else if (bundle.errors.length > 0) {
    lines.push('## Errors and Exceptions');
    for (const error of bundle.errors) {
      // Ensure dates are Date objects
      const firstSeen = safeDate(error.firstSeen);
      const lastSeen = safeDate(error.lastSeen);
      
      lines.push(`- ${error.operationName} / ${error.exceptionType}`);
      lines.push(`  Count: ${error.count}`);
      lines.push(`  First seen: ${firstSeen.toISOString()}`);
      lines.push(`  Last seen: ${lastSeen.toISOString()}`);
      if (error.sampleMessages.length > 0) {
        lines.push(`  Sample messages:`);
        for (const msg of error.sampleMessages) {
          lines.push(`    - ${msg}`);
        }
      }
      if (error.context && error.context.length > 0) {
        lines.push(`  Contextual logs (${error.context.length} entries around error time - use these for root cause analysis):`);
        // Include more contextual logs for better RCA (up to 20 instead of 10)
        for (const ctx of error.context.slice(0, 20)) {
          const ctxTime = safeDate(ctx.timeGenerated);
          if (ctx.logType === 'trace' && ctx.message) {
            const msg = ctx.message.length > 400 ? ctx.message.substring(0, 400) + '...' : ctx.message;
            lines.push(`    [${ctxTime.toISOString()}] ${ctx.severityLevel || 'INFO'}: ${msg}`);
          } else if (ctx.logType === 'dependency') {
            const status = ctx.success === false ? 'FAILED' : ctx.success === true ? 'SUCCESS' : 'UNKNOWN';
            lines.push(`    [${ctxTime.toISOString()}] Dependency: ${ctx.type || 'unknown'} -> ${ctx.target || 'unknown'} (${status}, ${ctx.durationMs?.toFixed(0) || '?'}ms)`);
          } else if (ctx.logType === 'request') {
            lines.push(`    [${ctxTime.toISOString()}] Request: ${ctx.name || ctx.url || 'unknown'} (${ctx.resultCode || '?'}, ${ctx.durationMs?.toFixed(0) || '?'}ms, ${ctx.success === false ? 'FAILED' : 'SUCCESS'})`);
          }
        }
        if (error.context.length > 20) {
          lines.push(`    ... and ${error.context.length - 20} more contextual log entries`);
        }
      }
      lines.push('');
    }
  }

  if (bundle.performance.length > 0) {
    lines.push('## Performance Issues');
    for (const perf of bundle.performance) {
      lines.push(`- ${perf.operationName}${perf.resultCode ? ` (${perf.resultCode})` : ''}`);
      lines.push(`  Requests: ${perf.requestCount}`);
      lines.push(`  Avg: ${perf.avgDuration.toFixed(2)}ms, P95: ${perf.p95Duration.toFixed(2)}ms, P99: ${perf.p99Duration.toFixed(2)}ms`);
      lines.push(`  Failures: ${perf.failureCount}`);
      lines.push('');
    }
  } else if (bundle.errors.length > 0) {
    // Only show this if we have errors but no performance issues
    lines.push('## Performance Issues');
    lines.push('No performance issues found during this time window.');
    lines.push('');
  }

  if (bundle.metadata.truncated) {
    lines.push('_Note: Data was truncated to fit within limits_');
  }

  return lines.join('\n');
}
