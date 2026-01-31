/**
 * Tests for configuration system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateConfig } from '../../src/core/config.js';
import type { LogWhispererConfig } from '../../src/core/types.js';

describe('Config Validation', () => {
  it('should validate a minimal valid config', () => {
    const config: Partial<LogWhispererConfig> = {
      provider: 'azure',
      timeWindow: {},
      azure: {
        workspaceId: 'test-workspace-id',
      },
      ai: {
        provider: 'openai',
      },
      notifiers: {},
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject config without workspaceId', () => {
    const config: Partial<LogWhispererConfig> = {
      provider: 'azure',
      timeWindow: {},
      azure: {} as any,
      ai: {
        provider: 'openai',
      },
      notifiers: {},
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid provider', () => {
    const config: Partial<LogWhispererConfig> = {
      provider: 'invalid' as any,
      timeWindow: {},
      azure: {
        workspaceId: 'test-workspace-id',
      },
      ai: {
        provider: 'openai',
      },
      notifiers: {},
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it('should accept valid timeWindow with lastHours', () => {
    const config: Partial<LogWhispererConfig> = {
      provider: 'azure',
      timeWindow: {
        lastHours: 24,
      },
      azure: {
        workspaceId: 'test-workspace-id',
      },
      ai: {
        provider: 'openai',
      },
      notifiers: {},
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it('should accept valid timeWindow with from/to', () => {
    const config: Partial<LogWhispererConfig> = {
      provider: 'azure',
      timeWindow: {
        from: new Date(),
        to: new Date(),
      },
      azure: {
        workspaceId: 'test-workspace-id',
      },
      ai: {
        provider: 'openai',
      },
      notifiers: {},
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });
});
