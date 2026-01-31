/**
 * Core type definitions for Log Whisperer
 */

/**
 * Main configuration interface
 */
export interface LogWhispererConfig {
  provider: 'azure'; // Extensible for future providers

  timeWindow: {
    lastHours?: number; // e.g., 24
    from?: Date | string; // ISO string or Date
    to?: Date | string;
  };

  azure: {
    workspaceId: string; // Log Analytics workspace GUID
    tenantId?: string;
    subscriptionId?: string;
    resourceGroup?: string;
    auth?: {
      useDefaultCredential?: boolean; // Default: true
      clientId?: string;
      clientSecret?: string; // Via env var only
    };
    queryLimits?: {
      maxRows?: number; // Default: 1000
      timeoutMs?: number; // Default: 60000
      retries?: number; // Default: 3
    };
  };

  ai: {
    provider: 'openai';
    apiKey?: string; // Via env var: OPENAI_API_KEY
    model?: string; // Default: 'gpt-4o'
    maxTokens?: number; // Default: 2000
    temperature?: number; // Default: 0.3
    budgetControls?: {
      maxInputChars?: number; // Default: 50000
      maxEvents?: number; // Default: 500
      maxSamplesPerQuery?: number; // Default: 5
    };
    promptTemplate?: string; // Override default prompt
  };

  notifiers: {
    slack?: {
      webhookUrl: string; // Via env var: SLACK_WEBHOOK_URL
      channel?: string;
      username?: string; // Default: 'Log Whisperer'
      iconEmoji?: string; // Default: ':mag:'
    };
  };

  output?: {
    verbosity?: 'quiet' | 'normal' | 'verbose';
    includeRawStats?: boolean;
    markdown?: boolean; // Default: true
  };

  sampling?: {
    maxRowsPerQuery?: number; // Default: 500
    topErrorGroups?: number; // Default: 10
    samplesPerGroup?: number; // Default: 3
    enableTimeBucketing?: boolean; // Detect spikes
    bucketMinutes?: number; // Default: 60
  };
}

/**
 * Progress callback for long-running operations
 */
export type ProgressCallback = (message: string) => void;

/**
 * Log Provider interface - abstracts different log sources
 */
export interface ILogProvider {
  name: string;
  collectSignals(config: LogWhispererConfig, progress?: ProgressCallback): Promise<LogSignalBundle>;
}

/**
 * Contextual log entry around an error
 */
export interface ErrorContext {
  timeGenerated: Date;
  logType: 'trace' | 'dependency' | 'request';
  message?: string;
  severityLevel?: string;
  type?: string;
  target?: string;
  success?: boolean;
  durationMs?: number;
  resultCode?: string;
  url?: string;
  data?: string;
}

/**
 * Error signal from log queries
 */
export interface ErrorSignal {
  operationName: string;
  exceptionType: string;
  problemId?: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  sampleMessages: string[];
  context?: ErrorContext[]; // Contextual logs around the error
}

/**
 * Performance signal from log queries
 */
export interface PerformanceSignal {
  operationName: string;
  resultCode?: string;
  requestCount: number;
  avgDuration: number;
  p95Duration: number;
  p99Duration: number;
  failureCount: number;
}

/**
 * Bundle of signals collected from log provider
 */
export interface LogSignalBundle {
  timeWindow: { from: Date; to: Date };
  errors: ErrorSignal[];
  performance: PerformanceSignal[];
  metadata: {
    queryDurations: Record<string, number>;
    rowCounts: Record<string, number>;
    truncated: boolean;
  };
}

/**
 * AI Summariser interface
 */
export interface IAISummariser {
  summarise(bundle: LogSignalBundle, config: LogWhispererConfig): Promise<Summary>;
}

/**
 * Error summary in AI output
 */
export interface ErrorSummary {
  description: string;
  count: number;
  firstOccurrence?: string; // ISO timestamp of first occurrence
  rootCauseAnalysis?: string; // Detailed RCA based on contextual logs
  investigationGuidance?: string; // Specific things developers should look for
  likelyCause?: string; // Brief summary (for backward compatibility)
}

/**
 * Performance hotspot in AI output
 */
export interface PerformanceSummary {
  operation: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  rootCauseAnalysis?: string; // Analysis of what might be causing performance issues
  investigationGuidance?: string; // What to check for performance issues
}

/**
 * AI-generated summary
 */
export interface Summary {
  title: string;
  bullets: string[]; // 3-7 key findings
  errorGroups: ErrorSummary[];
  performanceHotspots: PerformanceSummary[];
  suggestedActions: string[];
  metadata: { tokensUsed: number; model: string };
}

/**
 * Notification metadata
 */
export interface NotificationMeta {
  timeWindow: { from: Date; to: Date };
  environment?: string;
  serviceName?: string;
}

/**
 * Notifier interface
 */
export interface INotifier {
  name: string;
  send(summary: Summary, meta: NotificationMeta): Promise<NotifyResult>;
}

/**
 * Notification result
 */
export interface NotifyResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Run result from orchestrator
 */
export interface RunResult {
  success: boolean;
  summary?: Summary;
  metrics: {
    queryDurations: Record<string, number>;
    totalDuration: number;
    rowsProcessed: number;
    tokensUsed?: number;
    truncated: boolean;
  };
  errors: Array<{
    stage: 'provider' | 'ai' | 'notifier';
    error: string;
  }>;
}

/**
 * CLI options
 */
export interface CLIOptions {
  config?: string;
  provider?: string;
  lastHours?: number;
  from?: string;
  to?: string;
  dryRun?: boolean;
  noAi?: boolean;
  verbose?: boolean;
}
