/**
 * Configuration loading and merging system
 */

import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';
import type { LogWhispererConfig, CLIOptions } from './types.js';

const ConfigSchema = z.object({
  provider: z.literal('azure'),
  timeWindow: z.object({
    lastHours: z.number().positive().optional(),
    from: z.union([z.string(), z.date()]).optional(),
    to: z.union([z.string(), z.date()]).optional(),
  }),
  azure: z.object({
    workspaceId: z.string().min(1),
    tenantId: z.string().optional(),
    subscriptionId: z.string().optional(),
    resourceGroup: z.string().optional(),
    auth: z
      .object({
        useDefaultCredential: z.boolean().optional(),
        clientId: z.string().optional(),
        clientSecret: z.string().optional(),
      })
      .optional(),
    queryLimits: z
      .object({
        maxRows: z.number().positive().optional(),
        timeoutMs: z.number().positive().optional(),
        retries: z.number().int().min(0).optional(),
      })
      .optional(),
  }),
  ai: z.object({
    provider: z.literal('openai'),
    apiKey: z.string().optional(),
    model: z.string().optional(),
    maxTokens: z.number().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
    budgetControls: z
      .object({
        maxInputChars: z.number().positive().optional(),
        maxEvents: z.number().positive().optional(),
        maxSamplesPerQuery: z.number().positive().optional(),
      })
      .optional(),
    promptTemplate: z.string().optional(),
  }),
  notifiers: z.object({
    slack: z
      .object({
        webhookUrl: z.string().url().optional(),
        channel: z.string().optional(),
        username: z.string().optional(),
        iconEmoji: z.string().optional(),
      })
      .optional(),
  }),
  output: z
    .object({
      verbosity: z.enum(['quiet', 'normal', 'verbose']).optional(),
      includeRawStats: z.boolean().optional(),
      markdown: z.boolean().optional(),
    })
    .optional(),
  sampling: z
    .object({
      maxRowsPerQuery: z.number().positive().optional(),
      topErrorGroups: z.number().positive().optional(),
      samplesPerGroup: z.number().positive().optional(),
      enableTimeBucketing: z.boolean().optional(),
      bucketMinutes: z.number().positive().optional(),
    })
    .optional(),
});

type ConfigInput = z.infer<typeof ConfigSchema>;

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<ConfigInput> = {
  azure: {
    auth: {
      useDefaultCredential: true,
    },
    queryLimits: {
      maxRows: 1000,
      timeoutMs: 60000,
      retries: 3,
    },
  } as any,
  ai: {
    provider: 'openai',
    model: 'gpt-4o',
    maxTokens: 2000,
    temperature: 0.3,
    budgetControls: {
      maxInputChars: 50000,
      maxEvents: 500,
      maxSamplesPerQuery: 5,
    },
  } as any,
  notifiers: {
    slack: {
      username: 'Log Whisperer',
      iconEmoji: ':mag:',
    },
  } as any,
  output: {
    verbosity: 'normal',
    includeRawStats: false,
    markdown: true,
  },
  sampling: {
    maxRowsPerQuery: 500,
    topErrorGroups: 10,
    samplesPerGroup: 3,
    enableTimeBucketing: false,
    bucketMinutes: 60,
  },
} as Partial<ConfigInput>;

/**
 * Load configuration from environment variables
 */
function loadEnvConfig(): Partial<ConfigInput> {
  const env: Partial<ConfigInput> = {};

  // Azure config from env
  if (process.env.AZURE_WORKSPACE_ID) {
    env.azure = { ...(env.azure || {}), workspaceId: process.env.AZURE_WORKSPACE_ID } as any;
  }
  if (process.env.AZURE_TENANT_ID) {
    env.azure = { ...(env.azure || {}), tenantId: process.env.AZURE_TENANT_ID } as any;
  }
  if (process.env.AZURE_SUBSCRIPTION_ID) {
    env.azure = { ...(env.azure || {}), subscriptionId: process.env.AZURE_SUBSCRIPTION_ID } as any;
  }
  if (process.env.AZURE_CLIENT_ID) {
    env.azure = {
      ...(env.azure || {}),
      auth: { ...(env.azure?.auth || {}), clientId: process.env.AZURE_CLIENT_ID },
    } as any;
  }
  if (process.env.AZURE_CLIENT_SECRET) {
    env.azure = {
      ...(env.azure || {}),
      auth: { ...(env.azure?.auth || {}), clientSecret: process.env.AZURE_CLIENT_SECRET },
    } as any;
  }

  // AI config from env
  if (process.env.OPENAI_API_KEY) {
    env.ai = { ...(env.ai || {}), apiKey: process.env.OPENAI_API_KEY } as any;
  }
  if (process.env.OPENAI_MODEL) {
    env.ai = { ...(env.ai || {}), model: process.env.OPENAI_MODEL } as any;
  }

  // Slack config from env
  if (process.env.SLACK_WEBHOOK_URL) {
    env.notifiers = {
      ...env.notifiers,
      slack: { ...env.notifiers?.slack, webhookUrl: process.env.SLACK_WEBHOOK_URL },
    };
  }

  return env;
}

/**
 * Load configuration from file using cosmiconfig
 */
async function loadFileConfig(configPath?: string): Promise<Partial<ConfigInput> | null> {
  const explorer = cosmiconfig('log-whisperer', {
    searchPlaces: [
      'log-whisperer.config.json',
      'log-whisperer.config.yaml',
      'log-whisperer.config.yml',
      '.log-whispererrc',
      '.log-whispererrc.json',
      '.log-whispererrc.yaml',
      '.log-whispererrc.yml',
    ],
  });

  try {
    const result = configPath ? await explorer.load(configPath) : await explorer.search();
    return result?.config as Partial<ConfigInput> | null;
  } catch (error) {
    if (configPath) {
      throw new Error(`Failed to load config from ${configPath}: ${error}`);
    }
    return null;
  }
}

/**
 * Merge configurations with proper precedence
 */
function mergeConfigs(
  ...configs: Array<Partial<ConfigInput> | null>
): Partial<ConfigInput> {
  const merged: Partial<ConfigInput> = {};

  for (const config of configs) {
    if (!config) continue;

    // Deep merge for nested objects
    if (config.azure) {
      merged.azure = {
        ...(merged.azure || {}),
        ...config.azure,
        auth: { ...(merged.azure?.auth || {}), ...(config.azure.auth || {}) },
        queryLimits: { ...(merged.azure?.queryLimits || {}), ...(config.azure.queryLimits || {}) },
      } as any;
    }

    if (config.ai) {
      merged.ai = {
        ...(merged.ai || {}),
        ...config.ai,
        budgetControls: { ...(merged.ai?.budgetControls || {}), ...(config.ai.budgetControls || {}) },
      } as any;
    }

    if (config.notifiers) {
      merged.notifiers = {
        ...(merged.notifiers || {}),
        ...config.notifiers,
        slack: { ...(merged.notifiers?.slack || {}), ...(config.notifiers.slack || {}) },
      } as any;
    }

    if (config.output) {
      merged.output = { ...(merged.output || {}), ...config.output };
    }

    if (config.sampling) {
      merged.sampling = { ...(merged.sampling || {}), ...config.sampling };
    }

    if (config.timeWindow) {
      merged.timeWindow = { ...(merged.timeWindow || {}), ...config.timeWindow };
    }

    if (config.provider) {
      merged.provider = config.provider;
    }
  }

  return merged;
}

/**
 * Apply CLI options to config
 */
function applyCLIOptions(config: Partial<ConfigInput>, options: CLIOptions): Partial<ConfigInput> {
  const result = { ...config };

  if (options.provider) {
    result.provider = options.provider as 'azure';
  }

  if (options.lastHours || options.from || options.to) {
    result.timeWindow = {
      ...result.timeWindow,
      ...(options.lastHours && { lastHours: options.lastHours }),
      ...(options.from && { from: options.from }),
      ...(options.to && { to: options.to }),
    };
  }

  return result;
}

/**
 * Normalize date strings to Date objects
 */
function normalizeDates(config: Partial<ConfigInput>): Partial<LogWhispererConfig> {
  const normalized = { ...config } as Partial<LogWhispererConfig>;

  if (normalized.timeWindow?.from && typeof normalized.timeWindow.from === 'string') {
    normalized.timeWindow.from = new Date(normalized.timeWindow.from);
  }
  if (normalized.timeWindow?.to && typeof normalized.timeWindow.to === 'string') {
    normalized.timeWindow.to = new Date(normalized.timeWindow.to);
  }

  return normalized;
}

/**
 * Load and merge configuration from all sources
 */
export async function loadConfig(
  cliOptions?: CLIOptions,
  overrideConfig?: Partial<LogWhispererConfig>
): Promise<LogWhispererConfig> {
  // Load in precedence order (lowest to highest)
  const fileConfig = await loadFileConfig(cliOptions?.config);
  const envConfig = loadEnvConfig();

  // Merge: defaults -> file -> env -> CLI -> override
  let merged = mergeConfigs(
    DEFAULT_CONFIG as Partial<ConfigInput>,
    fileConfig,
    envConfig,
    cliOptions ? applyCLIOptions({}, cliOptions) : null,
    overrideConfig as Partial<ConfigInput>
  );

  // Normalize dates
  merged = normalizeDates(merged) as Partial<ConfigInput>;

  // Validate with zod
  const validated = ConfigSchema.parse(merged);

  return validated as LogWhispererConfig;
}

/**
 * Validate configuration without loading from file
 */
export function validateConfig(config: Partial<LogWhispererConfig>): {
  valid: boolean;
  errors: string[];
} {
  try {
    ConfigSchema.parse(config);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: [String(error)] };
  }
}
