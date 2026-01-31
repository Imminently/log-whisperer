/**
 * CLI command: validate-config
 */

import { loadConfig, validateConfig } from '../../core/config.js';
import type { CLIOptions } from '../../core/types.js';
import { testAzureConnection, testOpenAIConnection, testSlackWebhook } from '../../utils/validation.js';
import { createCLIProgress } from '../../utils/progress.js';

export async function validateConfigCommand(options: CLIOptions): Promise<number> {
  try {
    const config = await loadConfig(options);
    const progress = createCLIProgress();

    // Step 1: Validate schema
    progress.callback('Validating configuration schema...');
    const validation = validateConfig(config);

    if (!validation.valid) {
      progress.finish('Configuration schema is invalid');
      console.error('\n✗ Configuration schema errors:');
      for (const error of validation.errors) {
        console.error(`  - ${error}`);
      }
      return 1;
    }

    progress.callback('Configuration schema is valid');
    console.log('\n✓ Configuration schema is valid');
    console.log(`  Provider: ${config.provider}`);
    console.log(`  Workspace ID: ${config.azure.workspaceId}`);
    console.log(`  AI Provider: ${config.ai.provider}`);
    console.log(`  Model: ${config.ai.model || 'gpt-4o'}`);
    console.log('');

    let allValid = true;

    // Step 2: Test Azure connection
    if (config.provider === 'azure') {
      progress.callback('Testing Azure connection...');
      const azureTest = await testAzureConnection(config);
      
      if (azureTest.success) {
        progress.callback('Azure connection successful');
        console.log('✓ Azure connection: OK');
        if (azureTest.details) {
          console.log(`  ${azureTest.details}`);
        }
      } else {
        progress.callback('Azure connection failed');
        console.error('✗ Azure connection: FAILED');
        console.error(`  Error: ${azureTest.error}`);
        if (azureTest.details) {
          console.error(`  ${azureTest.details}`);
        }
        allValid = false;
      }
      console.log('');
    }

    // Step 3: Test OpenAI connection
    if (config.ai.provider === 'openai') {
      progress.callback('Testing OpenAI connection...');
      const openAITest = await testOpenAIConnection(config);
      
      if (openAITest.success) {
        progress.callback('OpenAI connection successful');
        console.log('✓ OpenAI connection: OK');
        if (openAITest.details) {
          console.log(`  ${openAITest.details}`);
        }
      } else {
        progress.callback('OpenAI connection failed');
        console.error('✗ OpenAI connection: FAILED');
        console.error(`  Error: ${openAITest.error}`);
        if (openAITest.details) {
          console.error(`  ${openAITest.details}`);
        }
        allValid = false;
      }
      console.log('');
    }

    // Step 4: Test Slack webhook (optional)
    if (config.notifiers.slack?.webhookUrl || process.env.SLACK_WEBHOOK_URL) {
      progress.callback('Testing Slack webhook...');
      const slackTest = await testSlackWebhook(config);
      
      if (slackTest.success) {
        progress.callback('Slack webhook valid');
        console.log('✓ Slack webhook: OK');
        if (slackTest.details) {
          console.log(`  ${slackTest.details}`);
        }
      } else {
        progress.callback('Slack webhook validation failed');
        console.error('✗ Slack webhook: FAILED');
        console.error(`  Error: ${slackTest.error}`);
        if (slackTest.details) {
          console.error(`  ${slackTest.details}`);
        }
        // Don't fail overall validation for Slack - it's optional
      }
      console.log('');
    } else {
      console.log('⚠ Slack: Not configured (optional)');
      console.log('');
    }

    progress.finish('Validation complete');

    if (allValid) {
      console.log('✓ All connectivity tests passed!');
      return 0;
    } else {
      console.error('✗ Some connectivity tests failed. Please fix the errors above.');
      return 1;
    }
  } catch (error) {
    console.error('Failed to load configuration:', error instanceof Error ? error.message : String(error));
    return 1;
  }
}
