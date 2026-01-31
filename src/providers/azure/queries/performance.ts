/**
 * KQL query for performance issues
 */

/**
 * Build the performance query
 */
export function buildPerformanceQuery(from: Date, to: Date, maxRows: number): string {
  const fromStr = from.toISOString();
  const toStr = to.toISOString();

  return `
AppRequests
| where TimeGenerated between (datetime("${fromStr}") .. datetime("${toStr}"))
| summarize 
    RequestCount = count(),
    AvgDuration = avg(DurationMs),
    P95Duration = percentile(DurationMs, 95),
    P99Duration = percentile(DurationMs, 99),
    FailureCount = countif(Success == false)
  by OperationName, ResultCode
| where P95Duration > 1000 or FailureCount > 0
| top ${maxRows} by P95Duration desc
`.trim();
}
