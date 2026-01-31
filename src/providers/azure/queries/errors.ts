/**
 * KQL query for errors and exceptions
 */

/**
 * Build the errors/exceptions query
 */
export function buildErrorsQuery(from: Date, to: Date, maxRows: number): string {
  const fromStr = from.toISOString();
  const toStr = to.toISOString();

  return `
AppExceptions
| where TimeGenerated between (datetime("${fromStr}") .. datetime("${toStr}"))
| summarize 
    Count = count(),
    FirstSeen = min(TimeGenerated),
    LastSeen = max(TimeGenerated),
    SampleMessages = make_list(OuterMessage, 10)
  by OperationName, ExceptionType, ProblemId
| top ${maxRows} by Count desc
`.trim();
}
