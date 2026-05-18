/**
 * KQL builders for the interactive explorer.
 */

import type { ExplorerServiceConfig } from '../../core/explorer-types.js';

function escapeKqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function roleFilter(service: ExplorerServiceConfig): string {
  const cloudRoleName = service.azure?.cloudRoleName || service.id;
  if (!cloudRoleName) return '';

  const role = escapeKqlString(cloudRoleName);
  return `| where tostring(column_ifexists("AppRoleName", column_ifexists("cloud_RoleName", ""))) == "${role}"`;
}

function baseUnion(fromFilter: string, service: ExplorerServiceConfig): string {
  const filter = roleFilter(service);

  return `
let traces =
AppTraces
${fromFilter}
${filter}
| project
    TimeGenerated,
    TableName = "AppTraces",
    Source = "trace",
    OperationName = tostring(column_ifexists("OperationName", "")),
    OperationId = tostring(column_ifexists("OperationId", column_ifexists("operation_Id", ""))),
    ParentId = tostring(column_ifexists("ParentId", column_ifexists("operation_ParentId", ""))),
    TelemetryId = tostring(column_ifexists("Id", column_ifexists("id", ""))),
    AppRoleName = tostring(column_ifexists("AppRoleName", column_ifexists("cloud_RoleName", ""))),
    Message = tostring(column_ifexists("Message", "")),
    SeverityLevel = tostring(column_ifexists("SeverityLevel", "")),
    Type = "",
    Target = "",
    Name = "",
    Url = "",
    DurationMs = real(null),
    ResultCode = "",
    Success = bool(null),
    Raw = pack_all();
let requests =
AppRequests
${fromFilter}
${filter}
| project
    TimeGenerated,
    TableName = "AppRequests",
    Source = "request",
    OperationName = tostring(column_ifexists("OperationName", "")),
    OperationId = tostring(column_ifexists("OperationId", column_ifexists("operation_Id", ""))),
    ParentId = tostring(column_ifexists("ParentId", column_ifexists("operation_ParentId", ""))),
    TelemetryId = tostring(column_ifexists("Id", column_ifexists("id", ""))),
    AppRoleName = tostring(column_ifexists("AppRoleName", column_ifexists("cloud_RoleName", ""))),
    Message = tostring(column_ifexists("Name", "")),
    SeverityLevel = "",
    Type = "",
    Target = "",
    Name = tostring(column_ifexists("Name", "")),
    Url = tostring(column_ifexists("Url", "")),
    DurationMs = todouble(column_ifexists("DurationMs", real(null))),
    ResultCode = tostring(column_ifexists("ResultCode", "")),
    Success = tobool(column_ifexists("Success", bool(null))),
    Raw = pack_all();
let dependencies =
AppDependencies
${fromFilter}
${filter}
| project
    TimeGenerated,
    TableName = "AppDependencies",
    Source = "dependency",
    OperationName = tostring(column_ifexists("OperationName", "")),
    OperationId = tostring(column_ifexists("OperationId", column_ifexists("operation_Id", ""))),
    ParentId = tostring(column_ifexists("ParentId", column_ifexists("operation_ParentId", ""))),
    TelemetryId = tostring(column_ifexists("Id", column_ifexists("id", ""))),
    AppRoleName = tostring(column_ifexists("AppRoleName", column_ifexists("cloud_RoleName", ""))),
    Message = tostring(column_ifexists("Data", column_ifexists("Name", ""))),
    SeverityLevel = "",
    Type = tostring(column_ifexists("Type", "")),
    Target = tostring(column_ifexists("Target", "")),
    Name = tostring(column_ifexists("Name", "")),
    Url = "",
    DurationMs = todouble(column_ifexists("DurationMs", real(null))),
    ResultCode = tostring(column_ifexists("ResultCode", "")),
    Success = tobool(column_ifexists("Success", bool(null))),
    Raw = pack_all();
let exceptions =
AppExceptions
${fromFilter}
${filter}
| project
    TimeGenerated,
    TableName = "AppExceptions",
    Source = "exception",
    OperationName = tostring(column_ifexists("OperationName", "")),
    OperationId = tostring(column_ifexists("OperationId", column_ifexists("operation_Id", ""))),
    ParentId = tostring(column_ifexists("ParentId", column_ifexists("operation_ParentId", ""))),
    TelemetryId = tostring(column_ifexists("Id", column_ifexists("id", ""))),
    AppRoleName = tostring(column_ifexists("AppRoleName", column_ifexists("cloud_RoleName", ""))),
    Message = tostring(column_ifexists("OuterMessage", column_ifexists("Message", ""))),
    SeverityLevel = tostring(column_ifexists("SeverityLevel", "")),
    Type = tostring(column_ifexists("ExceptionType", "")),
    Target = "",
    Name = tostring(column_ifexists("ProblemId", "")),
    Url = "",
    DurationMs = real(null),
    ResultCode = "",
    Success = bool(null),
    Raw = pack_all();
union traces, requests, dependencies, exceptions
`;
}

export function buildExplorerSearchQuery(
  from: Date,
  to: Date,
  service: ExplorerServiceConfig,
  maxRows: number,
  messageContains: string[] = []
): string {
  const fromStr = from.toISOString();
  const toStr = to.toISOString();
  const fromFilter = `| where TimeGenerated between (datetime("${fromStr}") .. datetime("${toStr}"))`;
  const messageFilters = messageContains
    .filter((value) => value.trim().length > 0)
    .map((value) => `| where Message contains "${escapeKqlString(value.trim())}"`)
    .join('\n');

  return `
${baseUnion(fromFilter, service)}
${messageFilters}
| order by TimeGenerated desc
| take ${maxRows}
`.trim();
}

export function buildOperationLogsQuery(
  operationId: string,
  service: ExplorerServiceConfig,
  maxRows: number
): string {
  const escapedOperationId = escapeKqlString(operationId);
  const fromFilter = `| where tostring(column_ifexists("OperationId", column_ifexists("operation_Id", ""))) == "${escapedOperationId}"`;

  return `
${baseUnion(fromFilter, service)}
| order by TimeGenerated asc
| take ${maxRows}
`.trim();
}

export function buildLinkedLogsQuery(
  correlationValue: string,
  from: Date,
  to: Date,
  service: ExplorerServiceConfig,
  maxRows: number
): string {
  const fromStr = from.toISOString();
  const toStr = to.toISOString();
  const escapedCorrelation = escapeKqlString(correlationValue);
  const fromFilter = `| where TimeGenerated between (datetime("${fromStr}") .. datetime("${toStr}"))`;

  return `
${baseUnion(fromFilter, service)}
| where OperationId == "${escapedCorrelation}"
| order by TimeGenerated asc
| take ${maxRows}
`.trim();
}
