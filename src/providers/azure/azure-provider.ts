/**
 * Azure Application Insights log provider
 */

import type { ILogProvider, LogSignalBundle, LogWhispererConfig, ErrorContext, ProgressCallback } from '../../core/types.js';
import type { ErrorSignal, PerformanceSignal } from '../../core/types.js';
import { executeQuery } from './query-runner.js';
import { buildErrorsQuery } from './queries/errors.js';
import { buildPerformanceQuery } from './queries/performance.js';
import { buildSimpleContextQuery } from './queries/context.js';
import { safeDate } from '../../utils/dates.js';

export class AzureProvider implements ILogProvider {
  name = 'azure';

  async collectSignals(config: LogWhispererConfig, progress?: ProgressCallback): Promise<LogSignalBundle> {
    // Calculate time window
    const now = new Date();
    let from: Date;
    let to: Date = now;

    if (config.timeWindow.from) {
      from = config.timeWindow.from instanceof Date ? config.timeWindow.from : new Date(config.timeWindow.from);
    } else if (config.timeWindow.lastHours) {
      from = new Date(now.getTime() - config.timeWindow.lastHours * 60 * 60 * 1000);
    } else {
      // Default to last 24 hours
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    if (config.timeWindow.to) {
      to = config.timeWindow.to instanceof Date ? config.timeWindow.to : new Date(config.timeWindow.to);
    }

    const maxRows = config.azure.queryLimits?.maxRows ?? 1000;
    const workspaceId = config.azure.workspaceId;

    const metadata: LogSignalBundle['metadata'] = {
      queryDurations: {},
      rowCounts: {},
      truncated: false,
    };

    // Query errors
    progress?.('Querying error logs...');
    const errorsQuery = buildErrorsQuery(from, to, maxRows);
    const errorsStart = Date.now();
    let errors: ErrorSignal[] = [];

    try {
      const errorsRows = await executeQuery(errorsQuery, workspaceId, config, from, to);
      metadata.queryDurations.errors = Date.now() - errorsStart;
      metadata.rowCounts.errors = errorsRows.length;
      progress?.(`Found ${errorsRows.length} error groups`);

      errors = errorsRows.map((row: any) => {
        // Extract sample messages from the list
        let sampleMessages: string[] = [];
        
        if (row.SampleMessages) {
          if (Array.isArray(row.SampleMessages)) {
            sampleMessages = row.SampleMessages
              .map((m: unknown) => String(m))
              .filter((m: string) => m && m.trim() && m !== 'null' && m !== 'undefined');
          } else {
            const msg = String(row.SampleMessages);
            if (msg && msg.trim() && msg !== 'null' && msg !== 'undefined') {
              sampleMessages = [msg];
            }
          }
        }
        
        // Remove duplicates and limit to 10
        const uniqueMessages = [...new Set(sampleMessages)].slice(0, 10);

        // Safely convert dates
        let firstSeen: Date;
        let lastSeen: Date;
        try {
          firstSeen = safeDate(row.FirstSeen);
        } catch (e) {
          // Fallback to now if date is invalid
          firstSeen = new Date();
        }
        try {
          lastSeen = safeDate(row.LastSeen);
        } catch (e) {
          // Fallback to now if date is invalid
          lastSeen = new Date();
        }

        const errorSignal: ErrorSignal = {
          operationName: String(row.OperationName || 'unknown'),
          exceptionType: String(row.ExceptionType || 'unknown'),
          problemId: row.ProblemId ? String(row.ProblemId) : undefined,
          count: Number(row.Count || 0),
          firstSeen,
          lastSeen,
          sampleMessages: uniqueMessages,
        };

        return errorSignal;
      });

      // For errors, fetch contextual logs (all errors, not just top 5)
      const contextWindowMinutes = 5; // Get logs 5 minutes before/after
      const errorsToAnalyze = errors; // Analyze all errors for better context
      
      if (errorsToAnalyze.length > 0) {
        progress?.(`Collecting contextual logs for ${errorsToAnalyze.length} error groups...`);
        
        for (let i = 0; i < errorsToAnalyze.length; i++) {
          const error = errorsToAnalyze[i];
          try {
            progress?.(`Analyzing error ${i + 1}/${errorsToAnalyze.length}: ${error.operationName} / ${error.exceptionType}`);
            
            const contextQuery = buildSimpleContextQuery(
              error.operationName,
              error.firstSeen,
              error.lastSeen,
              contextWindowMinutes
            );
            
            const contextStart = Date.now();
            const contextRows = await executeQuery(contextQuery, workspaceId, config, 
              new Date(error.firstSeen.getTime() - contextWindowMinutes * 60 * 1000),
              new Date(error.lastSeen.getTime() + contextWindowMinutes * 60 * 1000)
            );
            
          const context: ErrorContext[] = contextRows.map((row: any) => {
            let timeGenerated: Date;
            try {
              timeGenerated = safeDate(row.TimeGenerated);
            } catch (e) {
              // Skip invalid dates in context
              return null;
            }
            return {
              timeGenerated,
              logType: 'trace' as const,
              message: row.Message ? String(row.Message) : undefined,
              severityLevel: row.SeverityLevel ? String(row.SeverityLevel) : undefined,
            };
          }).filter((ctx): ctx is ErrorContext => ctx !== null);

            error.context = context;
            metadata.queryDurations[`context_${error.operationName}`] = Date.now() - contextStart;
          } catch (contextError) {
            // Don't fail the whole operation if context query fails
            // Silently continue - progress callback will show we're still working
          }
        }
      }
    } catch (error) {
      metadata.queryDurations.errors = Date.now() - errorsStart;
      throw new Error(`Failed to query errors: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Query performance
    progress?.('Querying performance metrics...');
    const performanceQuery = buildPerformanceQuery(from, to, maxRows);
    const performanceStart = Date.now();
    let performance: PerformanceSignal[] = [];

    try {
      const performanceRows = await executeQuery(performanceQuery, workspaceId, config, from, to);
      metadata.queryDurations.performance = Date.now() - performanceStart;
      metadata.rowCounts.performance = performanceRows.length;
      progress?.(`Found ${performanceRows.length} performance issues`);

      performance = performanceRows.map((row: any) => ({
        operationName: String(row.OperationName || 'unknown'),
        resultCode: row.ResultCode ? String(row.ResultCode) : undefined,
        requestCount: Number(row.RequestCount || 0),
        avgDuration: Number(row.AvgDuration || 0),
        p95Duration: Number(row.P95Duration || 0),
        p99Duration: Number(row.P99Duration || 0),
        failureCount: Number(row.FailureCount || 0),
      }));
    } catch (error) {
      metadata.queryDurations.performance = Date.now() - performanceStart;
      throw new Error(`Failed to query performance: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      timeWindow: { from, to },
      errors,
      performance,
      metadata,
    };
  }
}
