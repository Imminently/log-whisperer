/**
 * Local HTTP server for Log Whisperer Explorer.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, relative, sep } from 'node:path';
import { URL } from 'node:url';
import type { LogWhispererConfig } from '../core/types.js';
import { explorerServiceIds, resolveExplorerEnvironment } from '../core/explorer-config.js';
import { AzureExplorerProvider } from '../providers/azure/explorer-provider.js';
import { redactSecretsFromObject } from '../utils/redaction.js';
import { explorerHtml } from './assets.js';

interface ExplorerServerOptions {
  port?: number;
  host?: string;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

function sendHtml(response: ServerResponse, body: string): void {
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(body);
}

function contentType(pathname: string): string {
  const ext = extname(pathname);
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.ttf') return 'font/ttf';
  if (ext === '.woff') return 'font/woff';
  if (ext === '.woff2') return 'font/woff2';
  return 'application/octet-stream';
}

async function sendMonacoAsset(pathname: string, response: ServerResponse): Promise<void> {
  const root = join(process.cwd(), 'node_modules', 'monaco-editor', 'min', 'vs');
  const relativePath = decodeURIComponent(pathname.replace(/^\/monaco\/vs\/?/, ''));
  const filePath = normalize(join(root, relativePath));
  const pathFromRoot = relative(root, filePath);

  if (pathFromRoot.startsWith('..') || pathFromRoot.includes(`..${sep}`)) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'content-type': contentType(filePath),
      'cache-control': 'public, max-age=3600',
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) as Record<string, unknown> : {};
}

function dateFromBody(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function stringFromBody(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;
  return value;
}

function numberFromBody(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function environmentIdFromBody(value: unknown): string | undefined {
  return stringFromBody(value);
}

function filtersFromBody(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const filters: Record<string, string> = {};
  for (const [key, filterValue] of Object.entries(value)) {
    if (typeof filterValue === 'string' && filterValue.trim().length > 0) {
      filters[key] = filterValue.trim();
    }
  }
  return filters;
}

function ensureExplorerConfig(config: LogWhispererConfig): void {
  if (!config.explorer || explorerServiceIds(config.explorer).length === 0) {
    throw new Error('Explorer config is missing services. Add explorer.serviceGroups to your log-whisperer config.');
  }
  if (!config.explorer.detectors.some((detector) => detector.type === 'api-start')) {
    throw new Error('Explorer config needs at least one api-start detector.');
  }
}

export async function startExplorerServer(
  config: LogWhispererConfig,
  options: ExplorerServerOptions = {}
): Promise<{ url: string; close: () => Promise<void> }> {
  ensureExplorerConfig(config);

  const port = options.port || config.explorer?.defaults?.port || 4173;
  const host = options.host || '127.0.0.1';
  const providerFor = (environmentId?: string) => new AzureExplorerProvider(resolveExplorerEnvironment(config, environmentId).config);

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', `http://${host}:${port}`);

      if (request.method === 'GET' && url.pathname === '/') {
        sendHtml(response, explorerHtml);
        return;
      }

      if (request.method === 'GET' && url.pathname.startsWith('/monaco/vs/')) {
        await sendMonacoAsset(url.pathname, response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/config') {
        const selected = resolveExplorerEnvironment(config, url.searchParams.get('environmentId') || undefined);
        sendJson(response, 200, {
          providerStatus: 'Azure configured',
          environment: selected.environment.id,
          environments: (config.explorer?.environments?.length
            ? config.explorer.environments
            : [selected.environment]
          ).map((environment) => ({
            id: environment.id,
            host: Object.values(environment.serviceGroups || {})[0]?.host || config.explorer?.host,
          })),
          services: selected.services,
          host: Object.values(selected.environment.serviceGroups || {})[0]?.host || config.explorer?.host,
          detectors: (config.explorer?.detectors || []).map((detector) => ({
            id: detector.id,
            type: detector.type,
            serviceId: detector.serviceId,
            source: detector.source || 'any',
            fieldExtractors: detector.fieldExtractors || [],
            searchFields: detector.searchFields || [],
            sensitiveFields: detector.sensitiveFields || [],
          })),
          defaults: config.explorer?.defaults || {},
        });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/transactions/search') {
        const body = await readJson(request);
        const serviceId = stringFromBody(body.serviceId);
        const from = dateFromBody(body.from);
        const to = dateFromBody(body.to);
        const provider = providerFor(environmentIdFromBody(body.environmentId));

        if (!serviceId || !from || !to) {
          sendJson(response, 400, { error: 'serviceId, from, and to are required.' });
          return;
        }

        const result = await provider.searchTransactions({
          serviceId,
          from,
          to,
          seedDetectorId: stringFromBody(body.seedDetectorId),
          filters: filtersFromBody(body.filters),
          maxRows: numberFromBody(body.maxRows),
        });

        sendJson(response, 200, redactSecretsFromObject(result));
        return;
      }

      const operationMatch = /^\/api\/operations\/([^/]+)\/logs$/.exec(url.pathname);
      if (request.method === 'POST' && operationMatch) {
        const body = await readJson(request);
        const serviceId = stringFromBody(body.serviceId);
        const provider = providerFor(environmentIdFromBody(body.environmentId));
        if (!serviceId) {
          sendJson(response, 400, { error: 'serviceId is required.' });
          return;
        }

        const result = await provider.getOperationLogs({
          serviceId,
          operationId: decodeURIComponent(operationMatch[1]),
          from: dateFromBody(body.from),
          to: dateFromBody(body.to),
          maxRows: numberFromBody(body.maxRows),
        });

        sendJson(response, 200, redactSecretsFromObject(result));
        return;
      }

      const linkedMatch = /^\/api\/services\/([^/]+)\/linked-logs$/.exec(url.pathname);
      if (request.method === 'POST' && linkedMatch) {
        const body = await readJson(request);
        const from = dateFromBody(body.from);
        const to = dateFromBody(body.to);
        const correlationValue = stringFromBody(body.correlationValue);
        const provider = providerFor(environmentIdFromBody(body.environmentId));

        if (!from || !to || !correlationValue) {
          sendJson(response, 400, { error: 'from, to, and correlationValue are required.' });
          return;
        }

        const result = await provider.getLinkedLogs({
          serviceId: decodeURIComponent(linkedMatch[1]),
          correlationValue,
          from,
          to,
          callTime: dateFromBody(body.callTime),
          url: stringFromBody(body.url),
          method: stringFromBody(body.method),
          tenant: stringFromBody(body.tenant),
          targetPath: stringFromBody(body.targetPath),
          maxRows: numberFromBody(body.maxRows),
        });

        sendJson(response, 200, redactSecretsFromObject(result));
        return;
      }

      sendJson(response, 404, { error: 'Not found' });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  return {
    url: `http://${host}:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
