/**
 * Types for the interactive log explorer UI.
 */

export type ExplorerEventKind =
  | 'api-start'
  | 'api-end'
  | 'database-call'
  | 'external-service-call'
  | 'queue-message'
  | 'cache-call'
  | 'auth-check'
  | 'domain-event'
  | 'warning'
  | 'error'
  | 'custom';

export type ExplorerDetectorType =
  | ExplorerEventKind
  | 'api-call'
  | 'correlation'
  | 'database'
  | 'service-call'
  | 'queue';

export type ExplorerLogSource = 'any' | 'trace' | 'request' | 'dependency' | 'exception';

export interface ExplorerFieldExtractorConfig {
  name: string;
  regex: string;
}

export interface ExplorerDetectorConfig {
  id: string;
  type: ExplorerDetectorType;
  serviceId: string;
  phase?: 'instant' | 'start' | 'end';
  correlationField?: string;
  source?: ExplorerLogSource;
  messageRegex?: string;
  regex?: string;
  fieldExtractors?: ExplorerFieldExtractorConfig[];
  searchFields?: string[];
  sensitiveFields?: string[];
  targetServiceId?: string;
  targetLabel?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface ExplorerAzureServiceConfig {
  workspaceId?: string;
  tenantId?: string;
  subscriptionId?: string;
  resourceGroup?: string;
  auth?: {
    useDefaultCredential?: boolean;
    clientId?: string;
    clientSecret?: string;
  };
  queryLimits?: {
    maxRows?: number;
    timeoutMs?: number;
    retries?: number;
  };
  cloudRoleName?: string;
  operationNamePrefix?: string;
}

export type ExplorerServiceInput = string | ExplorerServiceConfig;

export interface ExplorerServiceConfig {
  id: string;
  name: string;
  provider: 'azure';
  azure?: ExplorerAzureServiceConfig;
  host?: string;
  environment?: string;
  serviceGroupId?: string;
}

export interface ExplorerServiceGroupConfig {
  id: string;
  services: ExplorerServiceInput[];
}

export interface ExplorerDefaultsConfig {
  maxDepth?: number;
  contextWindowMinutes?: number;
  maxRowsPerQuery?: number;
  maxRowsPerTrace?: number;
  port?: number;
}

export interface ExplorerEnvironmentConfig {
  id: string;
  serviceGroups: Record<string, ExplorerEnvironmentServiceGroupConfig>;
  azure?: ExplorerAzureServiceConfig;
}

export interface ExplorerEnvironmentServiceGroupConfig {
  host: string;
  servicePrefix: string;
  azure?: ExplorerAzureServiceConfig;
}

export interface ExplorerConfig {
  serviceGroups: ExplorerServiceGroupConfig[];
  resolvedServices?: ExplorerServiceConfig[];
  detectors: ExplorerDetectorConfig[];
  environments: ExplorerEnvironmentConfig[];
  host?: string;
  defaults?: ExplorerDefaultsConfig;
}

export interface NormalizedLogEvent {
  id: string;
  serviceId: string;
  serviceName: string;
  provider: 'azure';
  source: ExplorerLogSource;
  table: string;
  timeGenerated: Date;
  operationId?: string;
  telemetryId?: string;
  parentId?: string;
  operationName?: string;
  severityLevel?: string;
  level?: string;
  message?: string;
  type?: string;
  target?: string;
  name?: string;
  url?: string;
  durationMs?: number;
  resultCode?: string;
  success?: boolean;
  raw: Record<string, unknown>;
}

export interface DetectedExplorerEvent {
  id: string;
  detectorId: string;
  kind: ExplorerEventKind;
  phase: 'instant' | 'start' | 'end';
  correlationField?: string;
  correlationValue?: string;
  confidence: 'low' | 'medium' | 'high';
  serviceId: string;
  source: ExplorerLogSource;
  timeGenerated: Date;
  message?: string;
  operationId?: string;
  telemetryId?: string;
  parentId?: string;
  targetServiceId?: string;
  targetLabel?: string;
  fields: Record<string, string>;
  rawEventId: string;
}

export interface TransactionCandidate {
  id: string;
  detectorId: string;
  serviceId: string;
  serviceName: string;
  timeGenerated: Date;
  operationId?: string;
  requestId?: string;
  method?: string;
  path?: string;
  tenant?: string;
  user?: string;
  origin?: string;
  fields: Record<string, string>;
  messagePreview?: string;
  rawEventId: string;
}

export interface TransactionSearchRequest {
  serviceId: string;
  from: Date;
  to: Date;
  seedDetectorId?: string;
  filters?: Record<string, string>;
  maxRows?: number;
}

export interface TransactionSearchResult {
  candidates: TransactionCandidate[];
  diagnostics: {
    queries: number;
    rows: number;
    detectedEvents: number;
    warnings: string[];
  };
}

export interface OperationLogsRequest {
  serviceId: string;
  operationId: string;
  from?: Date;
  to?: Date;
  maxRows?: number;
}

export interface LinkedLogsRequest {
  serviceId: string;
  correlationValue: string;
  from: Date;
  to: Date;
  callTime?: Date;
  url?: string;
  method?: string;
  tenant?: string;
  targetPath?: string;
  maxRows?: number;
}

export interface OperationLogsResult {
  operationId: string;
  events: NormalizedLogEvent[];
  detectedEvents: DetectedExplorerEvent[];
  diagnostics: {
    queries: number;
    rows: number;
    warnings: string[];
  };
}
