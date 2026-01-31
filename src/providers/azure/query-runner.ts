/**
 * Query runner for Azure Monitor Logs with retries
 */

import { DefaultAzureCredential, ClientSecretCredential, type TokenCredential } from '@azure/identity';
import { LogsQueryClient } from '@azure/monitor-query';
import type { LogWhispererConfig } from '../../core/types.js';

/**
 * Execute a KQL query with retries
 */
export async function executeQuery(
  query: string,
  workspaceId: string,
  config: LogWhispererConfig,
  from: Date,
  to: Date
): Promise<unknown[]> {
  const maxRetries = config.azure.queryLimits?.retries ?? 3;
  const timeoutMs = config.azure.queryLimits?.timeoutMs ?? 60000;

  // Create credential
  let credential: TokenCredential;
  if (config.azure.auth?.useDefaultCredential !== false) {
    credential = new DefaultAzureCredential();
  } else if (config.azure.auth?.clientId && config.azure.auth?.clientSecret) {
    credential = new ClientSecretCredential(
      config.azure.tenantId || '',
      config.azure.auth.clientId,
      config.azure.auth.clientSecret
    );
  } else {
    credential = new DefaultAzureCredential();
  }

  const client = new LogsQueryClient(credential);

  let lastError: Error | undefined;
  const backoffMs = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Azure Monitor Query expects timespan as an object with startTime and endTime
      // Ensure dates are valid Date objects
      if (!(from instanceof Date) || !(to instanceof Date)) {
        throw new Error('Invalid date objects provided');
      }
      
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new Error('Invalid date values (NaN)');
      }
      
      if (to.getTime() <= from.getTime()) {
        throw new Error('End time must be after start time');
      }
      
      const result = await Promise.race([
        client.queryWorkspace(workspaceId, query, {
          startTime: from,
          endTime: to,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
        ),
      ]);

      if (result.tables && result.tables.length > 0) {
        const table = result.tables[0];
        const rows: unknown[] = [];

        for (const row of table.rows) {
          const rowObj: Record<string, unknown> = {};
          for (let i = 0; i < table.columnDescriptors.length; i++) {
            const col = table.columnDescriptors[i];
            rowObj[col.name] = row[i];
          }
          rows.push(rowObj);
        }

        return rows;
      }

      return [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on auth errors
      if (lastError.message.includes('authentication') || lastError.message.includes('401')) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error('Query failed after retries');
}
