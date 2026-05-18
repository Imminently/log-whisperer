/**
 * Azure-backed provider for the interactive explorer.
 */

import type {
  DetectedExplorerEvent,
  ExplorerServiceConfig,
  ExplorerLogSource,
  LinkedLogsRequest,
  NormalizedLogEvent,
  OperationLogsRequest,
  OperationLogsResult,
  TransactionSearchRequest,
  TransactionSearchResult,
} from '../../core/explorer-types.js';
import type { LogWhispererConfig } from '../../core/types.js';
import {
  detectExplorerEvents,
  filterTransactionCandidates,
  transactionCandidatesFromDetections,
} from '../../core/detector-engine.js';
import { redactSecretsFromObject } from '../../utils/redaction.js';
import { safeDate } from '../../utils/dates.js';
import { executeQuery } from './query-runner.js';
import { buildExplorerSearchQuery, buildLinkedLogsQuery, buildOperationLogsQuery } from './explorer-queries.js';

function stringValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value);
  return text.length > 0 ? text : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (String(value).toLowerCase() === 'true') return true;
  if (String(value).toLowerCase() === 'false') return false;
  return undefined;
}

function sourceValue(value: unknown): ExplorerLogSource {
  const source = stringValue(value);
  if (source === 'trace' || source === 'request' || source === 'dependency' || source === 'exception') {
    return source;
  }
  return 'any';
}

function rowValue(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  return undefined;
}

function defaultWindow(): { from: Date; to: Date } {
  const to = new Date();
  return {
    from: new Date(to.getTime() - 24 * 60 * 60 * 1000),
    to,
  };
}

export class AzureExplorerProvider {
  name = 'azure';

  constructor(private readonly config: LogWhispererConfig) {}

  async searchTransactions(request: TransactionSearchRequest): Promise<TransactionSearchResult> {
    const service = this.getService(request.serviceId);
    const maxRows = request.maxRows || this.config.explorer?.defaults?.maxRowsPerQuery || 500;
    const query = buildExplorerSearchQuery(request.from, request.to, service, maxRows, Object.values(request.filters || {}));
    const rows = await executeQuery(query, this.workspaceId(service), this.configForService(service), request.from, request.to);
    const events = rows.map((row, index) => this.normalizeRow(row, service, index));
    const detectors = this.config.explorer?.detectors || [];
    const seedDetectors = detectors.filter(
      (detector) =>
        detector.type === 'api-start' &&
        (!request.seedDetectorId || detector.id === request.seedDetectorId) &&
        (detector.serviceId === '*' || detector.serviceId === request.serviceId)
    );
    const detectedEvents = detectExplorerEvents(events, seedDetectors);
    const candidates = transactionCandidatesFromDetections(events, detectedEvents, seedDetectors);
    const filteredCandidates = filterTransactionCandidates(candidates, request.filters);
    const warnings: string[] = [];

    if (events.length === 0) {
      warnings.push('Azure returned no log rows for this service and time window.');
    } else if (detectedEvents.length === 0) {
      warnings.push('Azure returned log rows, but no api-start detector matched.');
    } else if (filteredCandidates.length === 0) {
      warnings.push('API-start detectors matched, but the active filters removed all candidates.');
    }

    if (events.length === maxRows) {
      warnings.push(`Candidate search reached the max row limit (${maxRows}). Narrow the time window or increase explorer.defaults.maxRowsPerQuery.`);
    }

    return {
      candidates: filteredCandidates,
      diagnostics: {
        queries: 1,
        rows: events.length,
        detectedEvents: detectedEvents.length,
        warnings,
      },
    };
  }

  async getOperationLogs(request: OperationLogsRequest): Promise<OperationLogsResult> {
    const service = this.getService(request.serviceId);
    const maxRows = request.maxRows || this.config.explorer?.defaults?.maxRowsPerTrace || 1000;
    const fallbackWindow = defaultWindow();
    const window = {
      from: request.from || fallbackWindow.from,
      to: request.to || fallbackWindow.to,
    };
    const query = buildOperationLogsQuery(request.operationId, service, maxRows);
    const rows = await executeQuery(query, this.workspaceId(service), this.configForService(service), window.from, window.to);
    const events = rows.map((row, index) => this.normalizeRow(row, service, index));
    const detectedEvents = detectExplorerEvents(events, this.config.explorer?.detectors || []);
    const warnings: string[] = [];

    if (events.length === maxRows) {
      warnings.push(`Operation logs reached the max row limit (${maxRows}).`);
    }

    return {
      operationId: request.operationId,
      events,
      detectedEvents,
      diagnostics: {
        queries: 1,
        rows: events.length,
        warnings,
      },
    };
  }

  async getLinkedLogs(request: LinkedLogsRequest): Promise<OperationLogsResult> {
    const service = this.getService(request.serviceId);
    const maxRows = request.maxRows || this.config.explorer?.defaults?.maxRowsPerTrace || 1000;
    const query = buildLinkedLogsQuery(request.correlationValue, request.from, request.to, service, maxRows);
    const rows = await executeQuery(query, this.workspaceId(service), this.configForService(service), request.from, request.to);
    const events = rows.map((row, index) => this.normalizeRow(row, service, index));
    const detectedEvents = detectExplorerEvents(events, this.config.explorer?.detectors || []);
    const operationId = events[0]?.operationId || request.correlationValue;
    const warnings: string[] = [];

    if (events.length === 0) {
      warnings.push(`No linked logs found for Azure operation_Id ${request.correlationValue}.`);
    }

    if (events.length === maxRows) {
      warnings.push(`Linked logs reached the max row limit (${maxRows}).`);
    }

    return {
      operationId,
      events,
      detectedEvents,
      diagnostics: {
        queries: 1,
        rows: events.length,
        warnings,
      },
    };
  }

  normalizeRow(row: unknown, service: ExplorerServiceConfig, index = 0): NormalizedLogEvent {
    const obj = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    const timeGenerated = safeDate(rowValue(obj, 'TimeGenerated') || new Date());
    const operationId = stringValue(rowValue(obj, 'OperationId', 'operation_Id'));
    const telemetryId = stringValue(rowValue(obj, 'TelemetryId', 'Id', 'id'));
    const table = stringValue(rowValue(obj, 'TableName')) || 'unknown';
    const raw = redactSecretsFromObject(obj) as Record<string, unknown>;
    const message = stringValue(rowValue(obj, 'Message', 'Data', 'OuterMessage', 'Name'));

    return {
      id: `${service.id}:${operationId || 'no-operation'}:${telemetryId || index}:${timeGenerated.getTime()}`,
      serviceId: service.id,
      serviceName: service.name,
      provider: 'azure',
      source: sourceValue(rowValue(obj, 'Source')),
      table,
      timeGenerated,
      operationId,
      telemetryId,
      parentId: stringValue(rowValue(obj, 'ParentId', 'operation_ParentId')),
      operationName: stringValue(rowValue(obj, 'OperationName')),
      severityLevel: stringValue(rowValue(obj, 'SeverityLevel')),
      level: stringValue(rowValue(obj, 'SeverityLevel')),
      message,
      type: stringValue(rowValue(obj, 'Type')),
      target: stringValue(rowValue(obj, 'Target')),
      name: stringValue(rowValue(obj, 'Name')),
      url: stringValue(rowValue(obj, 'Url')),
      durationMs: numberValue(rowValue(obj, 'DurationMs')),
      resultCode: stringValue(rowValue(obj, 'ResultCode')),
      success: booleanValue(rowValue(obj, 'Success')),
      raw,
    };
  }

  detectedEventsFor(events: NormalizedLogEvent[]): DetectedExplorerEvent[] {
    return detectExplorerEvents(events, this.config.explorer?.detectors || []);
  }

  private getService(serviceId: string): ExplorerServiceConfig {
    const service = (this.config.explorer?.resolvedServices || []).find((item) => item.id === serviceId);
    if (!service) {
      throw new Error(`Unknown explorer service: ${serviceId}`);
    }
    return service;
  }

  private workspaceId(service: ExplorerServiceConfig): string {
    return service.azure?.workspaceId || this.config.azure.workspaceId;
  }

  private configForService(service: ExplorerServiceConfig): LogWhispererConfig {
    const serviceAzure = { ...(service.azure || {}) };
    delete serviceAzure.cloudRoleName;
    delete serviceAzure.operationNamePrefix;
    return {
      ...this.config,
      azure: {
        ...this.config.azure,
        ...serviceAzure,
        auth: {
          ...(this.config.azure.auth || {}),
          ...(serviceAzure.auth || {}),
        },
        queryLimits: {
          ...(this.config.azure.queryLimits || {}),
          ...(serviceAzure.queryLimits || {}),
        },
      },
    };
  }
}
