# Log Whisperer - Agent Usage Guide

This guide explains how to use `@imminently/log-whisperer` as a library in your code. For CLI usage, see the [README.md](./README.md).

## Installation

```bash
npm install @imminently/log-whisperer
# or
bun add @imminently/log-whisperer
```

## Quick Start

```typescript
import { runLogWhisperer, loadConfig } from '@imminently/log-whisperer';

// Load configuration (from file, env vars, or object)
const config = await loadConfig();

// Run the full pipeline
const result = await runLogWhisperer(config);

if (result.success) {
  console.log('Summary:', result.summary);
  console.log('Metrics:', result.metrics);
} else {
  console.error('Errors:', result.errors);
}
```

**Note for Azure Functions**: When running in Azure Functions, the package automatically uses the Function App's managed identity. You must grant the managed identity the **"Log Analytics Reader"** role on your Log Analytics workspace. See [Azure Functions & Managed Identity](#azure-functions--managed-identity) below for setup instructions.

## Main API

### `runLogWhisperer(config, options?)`

Convenience function that runs the full pipeline: collect logs → summarize with AI → send notifications.

```typescript
import { runLogWhisperer, loadConfig } from '@imminently/log-whisperer';

const config = await loadConfig();
const result = await runLogWhisperer(config, {
  dryRun: false,        // If true, don't send notifications
  skipAI: false,        // If true, skip AI summarization
  progress: (message) => console.log(message)  // Optional progress callback
});

// result.success: boolean
// result.summary?: Summary
// result.metrics: { rowsProcessed, errorsFound, performanceIssues, ... }
// result.errors: Array<{ stage: string, error: string }>
```

### `LogWhisperer` Class

For more control, use the class directly:

```typescript
import { LogWhisperer, loadConfig } from '@imminently/log-whisperer';

const config = await loadConfig();
const whisperer = new LogWhisperer(config);

// Run the full pipeline
const result = await whisperer.run({
  dryRun: false,
  skipAI: false,
  progress: (message) => console.log(message)
});

// Access configuration
const currentConfig = whisperer.getConfig();
```

### `loadConfig(options?)`

Load and merge configuration from multiple sources (config file, environment variables, CLI options).

```typescript
import { loadConfig } from '@imminently/log-whisperer';

// Load from default locations (log-whisperer.config.json, etc.)
const config = await loadConfig();

// Or with CLI-style options
const config = await loadConfig({
  config: './my-config.json',
  lastHours: 24
});

// Or override with a partial config object
const config = await loadConfig(undefined, {
  timeWindow: { lastHours: 12 },
  ai: { model: 'gpt-4o-mini' }
});
```

## Configuration

Configuration can be provided via:
1. Config file (`log-whisperer.config.json` or `.yaml`)
2. Environment variables
3. Direct object (when calling `loadConfig`)

### Minimal Configuration

```typescript
const config: LogWhispererConfig = {
  provider: 'azure',
  timeWindow: {
    lastHours: 24
  },
  azure: {
    workspaceId: 'your-workspace-id-guid'  // Required: Log Analytics workspace GUID
    // Optional but recommended for better authentication:
    // tenantId: 'your-tenant-id',
    // subscriptionId: 'your-subscription-id',
    // resourceGroup: 'your-resource-group-name'
  },
  ai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,  // Required: or set OPENAI_API_KEY env var
    model: 'gpt-4o-mini'
  },
  notifiers: {
    slack: {
      webhookUrl: 'https://hooks.slack.com/services/...'
    }
  }
};
```

**Note (Azure)**: Only `workspaceId` is strictly required. However, providing `tenantId`, `subscriptionId`, and `resourceGroup` can help with:
- More reliable authentication (especially with service principals)
- Better error messages
- Future features that may require these values

See the [README.md](./README.md) Azure Configuration section for detailed instructions on how to obtain these values.

**Note (AI)**: The AI provider requires an API key. You must set either `ai.apiKey` in config or the `OPENAI_API_KEY` environment variable; otherwise the AI stage will throw when creating the client.

### Required Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `SLACK_WEBHOOK_URL`: (Optional) Slack webhook URL
- `AZURE_WORKSPACE_ID`: (Optional) Azure workspace ID - can be provided in config instead

### Azure Configuration Details

**Required Azure Configuration:**
- `azure.workspaceId`: Log Analytics workspace GUID (required) - This is the only strictly required Azure field

**Optional but Recommended Azure Configuration:**
- `azure.tenantId`: Azure tenant ID - Helps with service principal authentication and more reliable auth
- `azure.subscriptionId`: Azure subscription ID - Useful for permissions, error messages, and future features
- `azure.resourceGroup`: Resource group name - Helps identify and locate the workspace

**Why provide optional fields?**
While only `workspaceId` is required, providing `tenantId`, `subscriptionId`, and `resourceGroup` offers:
- More reliable authentication (especially with service principals)
- Better error messages when things go wrong
- Support for future features that may require these values
- Easier troubleshooting and workspace identification

**How to get these values:**
See the [README.md](./README.md) Azure Configuration section for detailed step-by-step instructions on obtaining:
- Workspace ID (required)
- Tenant ID (optional)
- Subscription ID (optional)
- Resource Group (optional)

The README includes both Azure Portal and Azure CLI commands for each value.

### Azure Functions & Managed Identity

When running in Azure Functions, the package automatically uses the Function App's managed identity via `DefaultAzureCredential`. No credentials need to be provided in your code or configuration.

**Required Permissions:**
The Function App's managed identity needs the **"Log Analytics Reader"** role on the Log Analytics workspace. To grant this:

**Option 1: Azure Portal**
1. Go to your Log Analytics workspace
2. Click **"Access control (IAM)"** in the left menu
3. Click **"+ Add"** → **"Add role assignment"**
4. Select role: **"Log Analytics Reader"**
5. Click **"Next"**
6. Under **"Assign access to"**, select **"Managed identity"**
7. Click **"+ Select members"**
8. Select your Function App (or the managed identity)
9. Click **"Select"** → **"Next"** → **"Review + assign"**

**Option 2: Azure CLI**
```bash
# First, enable managed identity on your Function App (if not already enabled)
az functionapp identity assign \
  --name <your-function-app-name> \
  --resource-group <your-resource-group>

# Get the managed identity principal ID
PRINCIPAL_ID=$(az functionapp identity show \
  --name <your-function-app-name> \
  --resource-group <your-resource-group> \
  --query principalId \
  --output tsv)

# Grant Log Analytics Reader role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Log Analytics Reader" \
  --scope /subscriptions/<subscription-id>/resourceGroups/<rg>/providers/Microsoft.OperationalInsights/workspaces/<workspace-name>
```

**Troubleshooting:**
- If you get "insufficient access" errors, verify the role assignment was successful
- It may take a few minutes for role assignments to propagate
- Check that you're using the correct workspace ID (must be a GUID, not a name)
- Verify managed identity is enabled on your Function App: `az functionapp identity show --name <name> --resource-group <rg>`

### Azure Authentication

The package uses `DefaultAzureCredential` which supports:
- Managed Identity (when running in Azure)
- Azure CLI (`az login`) - Easiest for local development
- Environment variables (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`) - For service principals

## TypeScript Types

```typescript
import type {
  LogWhispererConfig,
  RunResult,
  Summary,
  ErrorSummary,
  PerformanceSummary,
  LogSignalBundle,
  ProgressCallback
} from '@imminently/log-whisperer';
```

### `RunResult`

```typescript
interface RunResult {
  success: boolean;
  summary?: Summary;
  metrics: {
    rowsProcessed: number;
    errorsFound: number;
    performanceIssues: number;
    durationMs: number;
  };
  errors: Array<{
    stage: string;  // 'provider' | 'ai' | 'notifier'
    error: string;
  }>;
}
```

### `Summary`

```typescript
interface Summary {
  title: string;
  bullets: string[];
  errorGroups: ErrorSummary[];
  performanceHotspots: PerformanceSummary[];
  suggestedActions: string[];
  metadata: {
    tokensUsed: number;
    model: string;
  };
}

interface ErrorSummary {
  description: string;
  count: number;
  firstOccurrence?: string;  // ISO timestamp
  rootCauseAnalysis?: string;
  investigationGuidance?: string;
  likelyCause?: string;
}

interface PerformanceSummary {
  operation: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  rootCauseAnalysis?: string;
  investigationGuidance?: string;
}
```

## Examples

### Basic Usage

```typescript
import { runLogWhisperer, loadConfig } from '@imminently/log-whisperer';

async function analyzeLogs() {
  const config = await loadConfig();
  const result = await runLogWhisperer(config);
  
  if (result.success && result.summary) {
    console.log(`Found ${result.summary.errorGroups.length} error groups`);
    console.log(`Found ${result.summary.performanceHotspots.length} performance issues`);
  }
}
```

### Custom Time Window

```typescript
import { runLogWhisperer, loadConfig } from '@imminently/log-whisperer';

const config = await loadConfig(undefined, {
  timeWindow: {
    from: new Date('2024-01-01T00:00:00Z'),
    to: new Date('2024-01-02T00:00:00Z')
  }
});

const result = await runLogWhisperer(config);
```

### Dry Run (No Notifications)

```typescript
const result = await runLogWhisperer(config, {
  dryRun: true  // Collect and summarize, but don't send to Slack
});

// Access the summary without sending notifications
if (result.summary) {
  console.log(result.summary.title);
  // Process summary as needed
}
```

### Skip AI (Get Raw Data)

```typescript
const result = await runLogWhisperer(config, {
  skipAI: true  // Collect logs but don't summarize with AI
});

// result.summary will be undefined
// Use result.metrics to see what was collected
console.log(`Processed ${result.metrics.rowsProcessed} log rows`);
```

### Progress Tracking

```typescript
const result = await runLogWhisperer(config, {
  progress: (message, current, total) => {
    console.log(`[${current}/${total}] ${message}`);
  }
});
```

### Error Handling

```typescript
const result = await runLogWhisperer(config);

if (!result.success) {
  for (const error of result.errors) {
    console.error(`Error in ${error.stage}: ${error.error}`);
  }
}
```

### Access Raw Log Bundle

If you need access to the raw log data before AI summarization:

```typescript
import { LogWhisperer, loadConfig } from '@imminently/log-whisperer';

const config = await loadConfig();
const whisperer = new LogWhisperer(config);

// You can extend the class or access internal methods
// For now, use run() which returns the summary
const result = await whisperer.run({ skipAI: true });
```

## CLI Commands

While this package is designed for programmatic use, it also provides CLI commands:

- `log-whisperer run` - Run analysis and send summary
- `log-whisperer validate-config` - Validate configuration
- `log-whisperer sample-queries` - Test Azure connection and see query results
- `log-whisperer agent` - Print this documentation

See [README.md](./README.md) for CLI usage details.

## Advanced Usage

### Custom Configuration

```typescript
import { LogWhisperer } from '@imminently/log-whisperer';
import type { LogWhispererConfig } from '@imminently/log-whisperer';

const config: LogWhispererConfig = {
  provider: 'azure',
  timeWindow: { lastHours: 12 },
  azure: {
    workspaceId: process.env.AZURE_WORKSPACE_ID!,  // Required
    tenantId: process.env.AZURE_TENANT_ID,         // Optional but recommended
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,  // Optional but recommended
    resourceGroup: process.env.AZURE_RESOURCE_GROUP,   // Optional but recommended
    queryLimits: {
      maxRows: 500,
      timeoutMs: 30000,
      retries: 2
    }
  },
  ai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
    maxTokens: 4000,
    temperature: 0.3
  },
  notifiers: {
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL
    }
  }
};

const whisperer = new LogWhisperer(config);
const result = await whisperer.run();
```

### Integration with Scheduled Jobs

```typescript
import { runLogWhisperer, loadConfig } from '@imminently/log-whisperer';

// Run daily at a scheduled time
async function dailyLogAnalysis() {
  try {
    const config = await loadConfig();
    const result = await runLogWhisperer(config);
    
    if (result.success) {
      console.log('Daily analysis completed successfully');
    } else {
      // Log errors to your monitoring system
      console.error('Analysis failed:', result.errors);
    }
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Example: Run every 24 hours
setInterval(dailyLogAnalysis, 24 * 60 * 60 * 1000);
```

## Package Information

- **Package Name**: `@imminently/log-whisperer`
- **Version**: 0.1.0
- **Node Version**: >=18.0.0
- **License**: MIT

## Support

For issues, questions, or contributions, please visit the GitHub repository.
