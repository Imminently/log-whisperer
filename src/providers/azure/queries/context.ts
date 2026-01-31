/**
 * KQL query for contextual logs around an error
 */

/**
 * Build a query to get contextual logs around an error occurrence
 * This includes traces, dependencies, and requests in a time window around the error
 */
export function buildContextQuery(
  operationName: string,
  exceptionType: string,
  problemId: string | undefined,
  from: Date,
  to: Date,
  contextWindowMinutes: number = 5
): string {
  const fromStr = from.toISOString();
  const toStr = to.toISOString();
  
  // Expand the time window by contextWindowMinutes on each side
  const contextFrom = new Date(from.getTime() - contextWindowMinutes * 60 * 1000);
  const contextTo = new Date(to.getTime() + contextWindowMinutes * 60 * 1000);
  const contextFromStr = contextFrom.toISOString();
  const contextToStr = contextTo.toISOString();

  // Build filter for matching the error
  const operationFilter = operationName !== 'unknown' ? `OperationName == "${operationName.replace(/"/g, '\\"')}"` : '';
  const exceptionFilter = exceptionType !== 'unknown' ? `ExceptionType == "${exceptionType.replace(/"/g, '\\"')}"` : '';
  const problemFilter = problemId ? `ProblemId == "${problemId.replace(/"/g, '\\"')}"` : '';
  
  const filters = [operationFilter, exceptionFilter, problemFilter].filter(f => f).join(' and ');

  return `
let errorWindow = AppExceptions
| where TimeGenerated between (datetime("${fromStr}") .. datetime("${toStr}"))
${filters ? `| where ${filters}` : ''}
| summarize ErrorTimes = make_list(TimeGenerated) by OperationName, ExceptionType
| mv-expand ErrorTimes to typeof(datetime);
let contextWindow = range ErrorTime from errorWindow
| extend ContextStart = ErrorTime - ${contextWindowMinutes}m, ContextEnd = ErrorTime + ${contextWindowMinutes}m
| project ContextStart, ContextEnd, OperationName;
let traces = AppTraces
| where TimeGenerated between (datetime("${contextFromStr}") .. datetime("${contextToStr}"))
| join kind=inner contextWindow on $left.OperationName == $right.OperationName
| where TimeGenerated between (ContextStart .. ContextEnd)
| project TimeGenerated, OperationName, Message, SeverityLevel
| order by TimeGenerated desc
| take 20;
let dependencies = AppDependencies
| where TimeGenerated between (datetime("${contextFromStr}") .. datetime("${contextToStr}"))
| join kind=inner contextWindow on $left.OperationName == $right.OperationName
| where TimeGenerated between (ContextStart .. ContextEnd)
| project TimeGenerated, OperationName, Type, Target, Success, DurationMs
| order by TimeGenerated desc
| take 20;
let requests = AppRequests
| where TimeGenerated between (datetime("${contextFromStr}") .. datetime("${contextToStr}"))
| join kind=inner contextWindow on $left.OperationName == $right.OperationName
| where TimeGenerated between (ContextStart .. ContextEnd)
| project TimeGenerated, OperationName, Name, Success, DurationMs, ResultCode, Url
| order by TimeGenerated desc
| take 20;
union traces, dependencies, requests
| order by TimeGenerated desc
`.trim();
}

/**
 * Simplified context query that just gets logs around the error time window
 */
export function buildSimpleContextQuery(
  operationName: string,
  from: Date,
  to: Date,
  contextWindowMinutes: number = 5
): string {
  const contextFrom = new Date(from.getTime() - contextWindowMinutes * 60 * 1000);
  const contextTo = new Date(to.getTime() + contextWindowMinutes * 60 * 1000);
  const contextFromStr = contextFrom.toISOString();
  const contextToStr = contextTo.toISOString();
  const opName = operationName !== 'unknown' ? operationName.replace(/"/g, '\\"') : '';

  // Use a simpler approach - get traces first (most useful for debugging)
  let query = `
AppTraces
| where TimeGenerated between (datetime("${contextFromStr}") .. datetime("${contextToStr}"))
`;
  
  if (opName) {
    query += `| where OperationName == "${opName}"\n`;
  }
  
  query += `| project TimeGenerated, OperationName, Message, SeverityLevel
| order by TimeGenerated desc
| take 20
`;

  return query.trim();
}
