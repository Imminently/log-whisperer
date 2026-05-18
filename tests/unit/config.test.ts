/**
 * Tests for configuration system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateConfig } from '../../src/core/config.js';
import { resolveExplorerEnvironment } from '../../src/core/explorer-config.js';
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

  it('should accept valid explorer config', () => {
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
      explorer: {
        serviceGroups: [
          {
            id: 'api',
            services: [
              {
                id: 'api',
                name: 'API',
                provider: 'azure',
                azure: {
                  cloudRoleName: 'api-role',
                },
              },
            ],
          },
        ],
        environments: [
          {
            id: 'dev',
            serviceGroups: {
              api: {
                servicePrefix: 'dev',
                host: 'api.example.com',
              },
            },
          },
        ],
        detectors: [
          {
            id: 'api-start',
            type: 'api-start',
            serviceId: 'api',
            source: 'trace',
            messageRegex: '^API start',
            fieldExtractors: [
              {
                name: 'method',
                regex: 'method=(?<value>[A-Z]+)',
              },
            ],
          },
        ],
      },
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it('should accept explorer string services and environments', () => {
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
      explorer: {
        serviceGroups: [
          {
            id: 'timesheet',
            services: ['contacts', 'timesheets'],
          },
        ],
        environments: [
          {
            id: 'dev',
            azure: {
              workspaceId: 'dev-workspace-id',
              resourceGroup: 'dev-rg',
            },
            serviceGroups: {
              timesheet: {
                servicePrefix: 'dev',
                host: 'api.dev.example.com',
              },
            },
          },
        ],
        detectors: [
          {
            id: 'api-start',
            type: 'api-start',
            serviceId: '*',
            regex: '^API start',
          },
        ],
      },
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it('should resolve environment host, azure overrides, and prefixed service role names', () => {
    const config: LogWhispererConfig = {
      provider: 'azure',
      timeWindow: {},
      azure: {
        workspaceId: 'base-workspace-id',
        tenantId: 'base-tenant-id',
        auth: {
          useDefaultCredential: false,
          clientId: 'base-client-id',
          clientSecret: 'base-client-secret',
        },
      },
      ai: {
        provider: 'openai',
      },
      notifiers: {},
      explorer: {
        serviceGroups: [
          {
            id: 'api',
            services: ['contacts'],
          },
        ],
        environments: [
          {
            id: 'dev',
            azure: {
              workspaceId: 'dev-workspace-id',
              tenantId: 'dev-tenant-id',
            },
            serviceGroups: {
              api: {
                servicePrefix: 'dev',
                host: 'api.dev.example.com',
              },
            },
          },
        ],
        detectors: [
          {
            id: 'api-start',
            type: 'api-start',
            serviceId: '*',
          },
        ],
      },
    };

    const resolved = resolveExplorerEnvironment(config, 'dev');

    expect(resolved.environment.id).toBe('dev');
    expect(resolved.config.azure.workspaceId).toBe('dev-workspace-id');
    expect(resolved.config.azure.tenantId).toBe('dev-tenant-id');
    expect(resolved.config.azure.auth?.clientId).toBe('base-client-id');
    expect(resolved.services[0]).toMatchObject({
      id: 'contacts',
      name: 'contacts',
      host: 'api.dev.example.com',
      environment: 'dev',
      azure: {
        cloudRoleName: 'dev-contacts',
        workspaceId: 'dev-workspace-id',
      },
    });
  });

  it('should resolve per-environment service group deployment settings', () => {
    const config: LogWhispererConfig = {
      provider: 'azure',
      timeWindow: {},
      azure: {
        workspaceId: 'base-workspace-id',
      },
      ai: {
        provider: 'openai',
      },
      notifiers: {},
      explorer: {
        serviceGroups: [
          {
            id: 'timesheet',
            services: ['contacts', 'timesheets'],
          },
          {
            id: 'rules',
            services: ['sessions', 'decisionapi'],
          },
        ],
        environments: [
          {
            id: 'ed-qut-dev',
            azure: {
              workspaceId: 'env-workspace-id',
              resourceGroup: 'edward-qut-dev',
            },
            serviceGroups: {
              timesheet: {
                servicePrefix: 'ed-qut-dev',
                host: 'timeandattendance-api-dev.qut.imminently.co',
              },
              rules: {
                servicePrefix: 'qut-dev',
                host: 'rules-api.dev.qut.imminently.co',
              },
            },
          },
        ],
        detectors: [
          {
            id: 'api-start',
            type: 'api-start',
            serviceId: '*',
          },
        ],
      },
    };

    const result = validateConfig(config);
    const resolved = resolveExplorerEnvironment(config, 'ed-qut-dev');
    const contacts = resolved.services.find((service) => service.id === 'contacts');
    const decisionApi = resolved.services.find((service) => service.id === 'decisionapi');

    expect(result.valid).toBe(true);
    expect(resolved.config.azure.workspaceId).toBe('env-workspace-id');
    expect(contacts).toMatchObject({
      serviceGroupId: 'timesheet',
      host: 'timeandattendance-api-dev.qut.imminently.co',
      azure: {
        cloudRoleName: 'ed-qut-dev-contacts',
        resourceGroup: 'edward-qut-dev',
      },
    });
    expect(decisionApi).toMatchObject({
      serviceGroupId: 'rules',
      host: 'rules-api.dev.qut.imminently.co',
      azure: {
        cloudRoleName: 'qut-dev-decisionapi',
        resourceGroup: 'edward-qut-dev',
      },
    });
  });

  it('should reject explorer detectors that reference unknown services', () => {
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
      explorer: {
        serviceGroups: [
          {
            id: 'api',
            services: ['api'],
          },
        ],
        environments: [
          {
            id: 'dev',
            serviceGroups: {
              api: {
                servicePrefix: 'dev',
                host: 'api.dev.example.com',
              },
            },
          },
        ],
        detectors: [
          {
            id: 'api-start',
            type: 'api-start',
            serviceId: 'missing',
            regex: '^API start',
          },
        ],
      },
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('Unknown service id');
  });
});
