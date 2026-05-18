/**
 * Helpers for resolving environment-specific explorer configuration.
 */

import type {
  ExplorerEnvironmentConfig,
  ExplorerEnvironmentServiceGroupConfig,
  ExplorerServiceConfig,
  ExplorerServiceGroupConfig,
  ExplorerServiceInput,
} from './explorer-types.js';
import type { LogWhispererConfig } from './types.js';

export interface ResolvedExplorerConfig {
  environment: ExplorerEnvironmentConfig;
  services: ExplorerServiceConfig[];
  config: LogWhispererConfig;
}

function serviceId(service: ExplorerServiceInput): string {
  return typeof service === 'string' ? service : service.id;
}

function serviceName(service: ExplorerServiceInput): string {
  return typeof service === 'string' ? service : service.name;
}

function prefixedServiceName(service: ExplorerServiceInput, settings?: ExplorerEnvironmentServiceGroupConfig): string {
  const name = serviceName(service);
  return settings?.servicePrefix ? `${settings.servicePrefix}-${name}` : name;
}

function mergeAzure(
  base: LogWhispererConfig['azure'],
  override?: ExplorerEnvironmentConfig['azure']
): LogWhispererConfig['azure'] {
  if (!override) return base;
  return {
    ...base,
    ...override,
    auth: {
      ...(base.auth || {}),
      ...(override.auth || {}),
    },
    queryLimits: {
      ...(base.queryLimits || {}),
      ...(override.queryLimits || {}),
    },
  };
}

function defaultEnvironment(): ExplorerEnvironmentConfig {
  return {
    id: process.env.ENVIRONMENT || 'local',
    serviceGroups: {},
  };
}

export function explorerServiceGroups(config: Pick<LogWhispererConfig, 'explorer'>): ExplorerServiceGroupConfig[] {
  return config.explorer?.serviceGroups || [];
}

function groupSettings(
  environment: ExplorerEnvironmentConfig,
  groupId: string
): ExplorerEnvironmentServiceGroupConfig {
  const configured = environment.serviceGroups?.[groupId];
  if (!configured) {
    throw new Error(`Explorer environment ${environment.id} is missing settings for service group ${groupId}.`);
  }
  return configured;
}

export function resolveExplorerEnvironment(
  config: LogWhispererConfig,
  environmentId?: string
): ResolvedExplorerConfig {
  const environments = config.explorer?.environments || [];
  const environment =
    environments.find((item) => item.id === environmentId) ||
    environments[0] ||
    defaultEnvironment();

  if (environmentId && environment.id !== environmentId) {
    throw new Error(`Unknown explorer environment: ${environmentId}`);
  }

  const environmentAzure = mergeAzure(config.azure, environment.azure);
  const services = explorerServiceGroups(config).flatMap((group) => {
    const settings = groupSettings(environment, group.id);
    const inheritedAzure = {
      ...(environment.azure || {}),
      ...(settings.azure || {}),
    };

    return group.services.map((service): ExplorerServiceConfig => {
      if (typeof service !== 'string') {
        const cloudRoleName = service.azure?.cloudRoleName || prefixedServiceName(service, settings);
        return {
          ...service,
          host: service.host || settings.host,
          environment: environment.id,
          serviceGroupId: group.id,
          azure: {
            ...inheritedAzure,
            ...(service.azure || {}),
            cloudRoleName,
          },
        };
      }

      return {
        id: service,
        name: service,
        provider: 'azure',
        host: settings.host,
        environment: environment.id,
        serviceGroupId: group.id,
        azure: {
          ...inheritedAzure,
          cloudRoleName: prefixedServiceName(service, settings),
        },
      };
    });
  });

  return {
    environment,
    services,
    config: {
      ...config,
      azure: environmentAzure,
      explorer: config.explorer
        ? {
          ...config.explorer,
            resolvedServices: services,
          }
        : config.explorer,
    },
  };
}

export function explorerServiceIds(config: {
  serviceGroups: ExplorerServiceGroupConfig[];
}): string[] {
  return config.serviceGroups.flatMap((group) => group.services.map(serviceId));
}
