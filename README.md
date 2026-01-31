# Log Whisperer

AI-powered daily summaries of operational issues in cloud runtimes. Query logs, summarize findings with AI, and deliver actionable insights via Slack.

## Features

- **Azure Application Insights Integration**: Query logs using KQL via Azure Monitor
- **AI Summarization**: Generate concise, actionable summaries using OpenAI
- **Slack Notifications**: Deliver digests directly to Slack channels
- **Flexible Configuration**: Config files, environment variables, or CLI flags
- **CLI & Library**: Use as a command-line tool or import as a Node.js module
- **Cost Control**: Built-in input truncation and token limits
- **Security**: Automatic secret redaction before sending to AI

## Installation

```bash
bun install log-whisperer
```

Or use globally:

```bash
bun install -g log-whisperer
```

## Quick Start

### 1. Create a configuration file

Create `log-whisperer.config.json`:

```json
{
  "provider": "azure",
  "timeWindow": {
    "lastHours": 24
  },
  "azure": {
    "workspaceId": "your-workspace-id"
  },
  "ai": {
    "provider": "openai",
    "model": "gpt-4o"
  },
  "notifiers": {
    "slack": {
      "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    }
  }
}
```

### 2. Set up Slack Webhook

Log Whisperer sends notifications via Slack webhooks. You need to create a Slack app and configure an incoming webhook:

#### Option A: Using Slack Manifest (Recommended)

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From an app manifest"**
3. Select your workspace
4. Copy and paste the contents of `slack.manifest.yaml` (included in this repository)
5. Click **"Create"**
6. After the app is created, go to **"Incoming Webhooks"** in the left sidebar
7. Toggle **"Activate Incoming Webhooks"** to **On**
8. Click **"Add New Webhook to Workspace"**
9. Select the channel where you want to receive notifications
10. Click **"Allow"**
11. Copy the **Webhook URL** (it looks like `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`)

#### Option B: Manual Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Enter app name: **"Log Whisperer"**
4. Select your workspace
5. Click **"Create App"**
9. Go to **"Incoming Webhooks"** in the left sidebar
10. Toggle **"Activate Incoming Webhooks"** to **On**
11. Click **"Add New Webhook to Workspace"**
12. Select the channel where you want to receive notifications
13. Click **"Allow"**
14. Copy the **Webhook URL**

#### Add Webhook URL to Config

Add the webhook URL to your configuration:

```json
{
  "notifiers": {
    "slack": {
      "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    }
  }
}
```

Or set it as an environment variable:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### 3. Set environment variables

```bash
export OPENAI_API_KEY="sk-..."
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
export AZURE_WORKSPACE_ID="your-workspace-id"
```

### 4. Authenticate with Azure

Log Whisperer uses `DefaultAzureCredential`, which supports:
- Managed Identity (when running in Azure)
- Azure CLI (`az login`)
- Environment variables (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`)

For local development, simply run:
```bash
az login
```

See the [Azure Configuration](#azure-configuration) section for detailed instructions on getting all Azure configuration values.

### 5. Run

```bash
log-whisperer run
```

## CLI Usage

### Run Analysis

```bash
# Use default config
log-whisperer run

# Specify config file
log-whisperer run --config ./my-config.json

# Custom time window
log-whisperer run --last-hours 12
log-whisperer run --from 2024-01-01T00:00:00Z --to 2024-01-02T00:00:00Z

# Dry run (don't send notifications)
log-whisperer run --dry-run

# Skip AI summarization (output raw results)
log-whisperer run --no-ai

# Verbose output
log-whisperer run --verbose
```

### Validate Configuration

```bash
log-whisperer validate-config
log-whisperer validate-config --config ./my-config.json
```

### Sample Queries

Test your Azure connection and see query results:

```bash
log-whisperer sample-queries
log-whisperer sample-queries --last-hours 1
```

## Library Usage

```typescript
import { LogWhisperer, loadConfig } from 'log-whisperer';

// Load config
const config = await loadConfig();

// Create instance
const whisperer = new LogWhisperer(config);

// Run analysis
const result = await whisperer.run();

if (result.success) {
  console.log('Summary:', result.summary);
  console.log('Metrics:', result.metrics);
} else {
  console.error('Errors:', result.errors);
}
```

Or use the convenience function:

```typescript
import { runLogWhisperer, loadConfig } from 'log-whisperer';

const config = await loadConfig();
const result = await runLogWhisperer(config, { dryRun: true });
```

## Configuration

Configuration can be provided via:
1. Config file (`log-whisperer.config.json` or `.yaml`)
2. Environment variables
3. CLI flags (highest precedence)

### Config File Schema

See `log-whisperer.config.example.json` for a complete example.

Key settings:

- **provider**: `"azure"` (currently only Azure is supported)
- **timeWindow**: Time range for log queries
  - `lastHours`: Number of hours to look back
  - `from`/`to`: Explicit ISO date strings
- **azure**: Azure-specific settings
  - `workspaceId`: Log Analytics workspace GUID (required) - see [Azure Configuration](#azure-configuration) for how to get this
  - `tenantId`: Azure tenant ID (optional)
  - `subscriptionId`: Azure subscription ID (optional)
  - `resourceGroup`: Resource group name (optional)
  - `auth`: Authentication settings (optional, defaults to `DefaultAzureCredential`)
  - `queryLimits`: Query limits (maxRows, timeoutMs, retries)
- **ai**: AI summarization settings
  - `provider`: `"openai"`
  - `model`: Model name (default: `"gpt-4o"`)
  - `maxTokens`: Maximum tokens in response (default: 2000)
  - `temperature`: Temperature for generation (default: 0.3)
  - `budgetControls`: Input size limits
- **notifiers**: Notification settings
  - `slack`: Slack webhook configuration
- **sampling**: Data sampling controls
  - `topErrorGroups`: Number of top error groups to include
  - `samplesPerGroup`: Number of sample messages per error

### Environment Variables

- `OPENAI_API_KEY`: OpenAI API key (required)
- `SLACK_WEBHOOK_URL`: Slack webhook URL (required for Slack notifications)
- `AZURE_WORKSPACE_ID`: Azure Log Analytics workspace ID
- `AZURE_TENANT_ID`: Azure tenant ID (optional)
- `AZURE_CLIENT_ID`: Azure client ID (optional, for service principal auth)
- `AZURE_CLIENT_SECRET`: Azure client secret (optional, for service principal auth)

## Azure Configuration

### Getting Your Azure Configuration Values

#### Workspace ID (Required)

The workspace ID must be a GUID (not the workspace name). You can find it in several ways:

**Option 1: Azure Portal**
1. Navigate to your Log Analytics workspace in the Azure Portal
2. Go to **Overview**
3. Copy the **Workspace ID** (it's a GUID like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

**Option 2: Azure CLI**
```bash
az monitor log-analytics workspace show \
  --resource-group <your-resource-group> \
  --workspace-name <your-workspace-name> \
  --query customerId \
  --output tsv
```

**Option 3: Azure Portal (Alternative)**
1. Go to your Log Analytics workspace
2. Click on **Properties** in the left menu
3. Copy the **Workspace ID** value

#### Tenant ID (Optional)

Only needed if using service principal authentication:

**Azure Portal:**
1. Go to **Microsoft Entra ID** (formerly Azure Active Directory)
2. Click on **Overview**
3. Copy the **Tenant ID**

**Azure CLI:**
```bash
az account show --query tenantId --output tsv
```

#### Subscription ID (Optional)

**Azure Portal:**
1. Go to **Subscriptions** in the Azure Portal
2. Find your subscription
3. Copy the **Subscription ID**

**Azure CLI:**
```bash
az account show --query id --output tsv
```

#### Resource Group (Optional)

**Azure Portal:**
1. Navigate to your Log Analytics workspace
2. The resource group is shown in the **Overview** section

**Azure CLI:**
```bash
az monitor log-analytics workspace show \
  --resource-group <your-resource-group> \
  --workspace-name <your-workspace-name> \
  --query resourceGroup \
  --output tsv
```

### Authentication

Log Whisperer uses `DefaultAzureCredential`, which tries authentication methods in this order:

1. **Environment Variables** (if set):
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_TENANT_ID`

2. **Managed Identity** (when running in Azure):
   - Automatically used when running on Azure resources (VMs, Functions, etc.)

3. **Azure CLI** (for local development):
   ```bash
   az login
   ```

4. **Visual Studio Code** (if Azure extension is installed)

5. **Azure PowerShell** (if logged in)

For local development, the easiest method is:
```bash
az login
```

This will authenticate you and `DefaultAzureCredential` will automatically use your Azure CLI credentials.

### Azure Permissions

Your Azure identity needs the following permissions:

- **Log Analytics Reader** role on the Log Analytics workspace
- Or **Application Insights Component Reader** if using classic Application Insights

To grant permissions:

```bash
# Using Azure CLI
az role assignment create \
  --assignee <your-identity> \
  --role "Log Analytics Reader" \
  --scope /subscriptions/<subscription-id>/resourceGroups/<rg>/providers/Microsoft.OperationalInsights/workspaces/<workspace-name>
```

**Finding your identity:**
- For user accounts: Your email address or user principal name
- For service principals: The service principal's object ID or app ID
- For managed identities: The managed identity's object ID

**Example:**
```bash
# Grant to your user account
az role assignment create \
  --assignee your-email@example.com \
  --role "Log Analytics Reader" \
  --scope /subscriptions/01ba87f7-9ffa-44dd-b03b-2b8ef0b0ee34/resourceGroups/edward-qut-dev/providers/Microsoft.OperationalInsights/workspaces/edward-qut-dev-workspace
```

### Complete Azure Config Example

```json
{
  "azure": {
    "workspaceId": "12345678-1234-1234-1234-123456789012",
    "tenantId": "255416a8-93a0-49ee-89c7-a006edf5805d",
    "subscriptionId": "01ba87f7-9ffa-44dd-b03b-2b8ef0b0ee34",
    "resourceGroup": "my-resource-group",
    "auth": {
      "useDefaultCredential": true
    },
    "queryLimits": {
      "maxRows": 1000,
      "timeoutMs": 60000,
      "retries": 3
    }
  }
}
```

**Note:** Only `workspaceId` is required. All other fields are optional and can be omitted if using `DefaultAzureCredential` with Azure CLI authentication.

## Slack Configuration

### Creating a Slack App and Webhook

Log Whisperer uses Slack's Incoming Webhooks to send notifications. You need to:

1. **Create a Slack App** (see [Set up Slack Webhook](#2-set-up-slack-webhook) above)
2. **Create an Incoming Webhook** for your desired channel
3. **Copy the Webhook URL** into your configuration

### Webhook URL Format

Slack webhook URLs look like:
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

### Security Note

⚠️ **Keep your webhook URL secret!** Anyone with the URL can post messages to your Slack channel. Don't commit it to version control. Use environment variables or secure secret management.

### Testing Your Webhook

You can test your webhook URL with curl:

```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message from Log Whisperer"}' \
  https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

If successful, you should see the message appear in your Slack channel.

### Multiple Channels

To send notifications to multiple channels, you can:
- Create multiple webhooks (one per channel) and configure multiple Slack notifiers (future feature)
- Or use a single webhook and route messages programmatically

## Adding a New Provider

1. Create a new provider class implementing `ILogProvider`:

```typescript
import type { ILogProvider, LogSignalBundle, LogWhispererConfig } from 'log-whisperer';

export class MyProvider implements ILogProvider {
  name = 'my-provider';

  async collectSignals(config: LogWhispererConfig): Promise<LogSignalBundle> {
    // Implement your provider logic
  }
}
```

2. Register it in the orchestrator (or extend the config to support it)

3. Update the config schema to include your provider's settings

## Adding a New Notifier

1. Create a new notifier class implementing `INotifier`:

```typescript
import type { INotifier, Summary, NotificationMeta, NotifyResult } from 'log-whisperer';

export class MyNotifier implements INotifier {
  name = 'my-notifier';

  async send(summary: Summary, meta: NotificationMeta): Promise<NotifyResult> {
    // Implement your notification logic
  }
}
```

2. Add it to the notifiers array in the orchestrator

3. Update the config schema to include your notifier's settings

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## License

MIT
