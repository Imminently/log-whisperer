/**
 * Tests for truncation utilities
 */

import { describe, it, expect } from 'vitest';
import { truncateString, truncateArray, truncateBundle } from '../../src/utils/truncation.js';
import type { LogSignalBundle, LogWhispererConfig } from '../../src/core/types.js';

describe('Truncation Utilities', () => {
  it('should truncate long strings', () => {
    const longString = 'a'.repeat(100);
    const truncated = truncateString(longString, 50);
    expect(truncated.length).toBe(50);
    expect(truncated).toContain('...');
  });

  it('should not truncate short strings', () => {
    const shortString = 'hello';
    const truncated = truncateString(shortString, 50);
    expect(truncated).toBe(shortString);
  });

  it('should truncate arrays', () => {
    const arr = [1, 2, 3, 4, 5];
    const truncated = truncateArray(arr, 3);
    expect(truncated).toHaveLength(3);
    expect(truncated).toEqual([1, 2, 3]);
  });

  it('should not truncate short arrays', () => {
    const arr = [1, 2];
    const truncated = truncateArray(arr, 5);
    expect(truncated).toHaveLength(2);
    expect(truncated).toEqual([1, 2]);
  });

  it('should truncate bundle to fit limits', () => {
    const bundle: LogSignalBundle = {
      timeWindow: {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-02'),
      },
      errors: Array.from({ length: 20 }, (_, i) => ({
        operationName: `op${i}`,
        exceptionType: 'Exception',
        count: 10,
        firstSeen: new Date(),
        lastSeen: new Date(),
        sampleMessages: ['msg1', 'msg2', 'msg3', 'msg4', 'msg5'],
      })),
      performance: Array.from({ length: 20 }, (_, i) => ({
        operationName: `op${i}`,
        requestCount: 100,
        avgDuration: 1000,
        p95Duration: 2000,
        p99Duration: 3000,
        failureCount: 5,
      })),
      metadata: {
        queryDurations: {},
        rowCounts: {},
        truncated: false,
      },
    };

    const config: LogWhispererConfig = {
      provider: 'azure',
      timeWindow: {},
      azure: {
        workspaceId: 'test',
      },
      ai: {
        provider: 'openai',
        budgetControls: {
          maxInputChars: 1000,
          maxEvents: 10,
          maxSamplesPerQuery: 2,
        },
      },
      notifiers: {},
      sampling: {
        topErrorGroups: 5,
        samplesPerGroup: 2,
      },
    };

    const truncated = truncateBundle(bundle, config);
    expect(truncated.errors.length).toBeLessThanOrEqual(5);
    expect(truncated.performance.length).toBeLessThanOrEqual(5);
    expect(truncated.metadata.truncated).toBe(true);

    // Check sample messages are limited
    for (const error of truncated.errors) {
      expect(error.sampleMessages.length).toBeLessThanOrEqual(2);
    }
  });
});
