/**
 * Mock Azure provider for testing
 */

import type { ILogProvider, LogSignalBundle, LogWhispererConfig } from '../../src/core/types.js';

export class MockAzureProvider implements ILogProvider {
  name = 'azure';

  async collectSignals(config: LogWhispererConfig): Promise<LogSignalBundle> {
    return {
      timeWindow: {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000),
        to: new Date(),
      },
      errors: [
        {
          operationName: 'TestFunction',
          exceptionType: 'NullReferenceException',
          count: 10,
          firstSeen: new Date(),
          lastSeen: new Date(),
          sampleMessages: ['Error message 1', 'Error message 2'],
        },
      ],
      performance: [
        {
          operationName: 'SlowFunction',
          requestCount: 100,
          avgDuration: 2000,
          p95Duration: 3000,
          p99Duration: 5000,
          failureCount: 5,
        },
      ],
      metadata: {
        queryDurations: { errors: 100, performance: 150 },
        rowCounts: { errors: 1, performance: 1 },
        truncated: false,
      },
    };
  }
}
