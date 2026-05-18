import { describe, expect, it } from 'vitest';
import { detectExplorerEvents, filterTransactionCandidates, transactionCandidatesFromDetections } from '../../src/core/detector-engine.js';
import type { ExplorerDetectorConfig, NormalizedLogEvent } from '../../src/core/explorer-types.js';

describe('Detector Engine', () => {
  it('matches anchored api-start regexes against the raw message', () => {
    const event: NormalizedLogEvent = {
      id: 'event-1',
      serviceId: 'primary-api',
      serviceName: 'Primary API',
      provider: 'azure',
      source: 'trace',
      table: 'AppTraces',
      timeGenerated: new Date('2026-05-16T21:44:46.000Z'),
      operationId: 'operation-1',
      telemetryId: 'telemetry-1',
      operationName: 'GET /api',
      message:
        'Service - API called: [ requestId: "138375bc-74ae-45d5-909a-2f7e2de97156", method: "GET", headers: {"x-tenancy":"TENANT","x-original-url":"/api/?$type=item"} ]',
      raw: {},
    };
    const detectors: ExplorerDetectorConfig[] = [
      {
        id: 'primary-api-start',
        type: 'api-start',
        phase: 'start',
        correlationField: 'requestId',
        serviceId: 'primary-api',
        source: 'trace',
        messageRegex: '^Service - API called:\\s*\\[(?<payload>.*)\\]\\s*$',
        fieldExtractors: [
          { name: 'requestId', regex: 'requestId:\\s*"(?<value>[^"]+)"' },
          { name: 'method', regex: 'method:\\s*"(?<value>[A-Z]+)"' },
          { name: 'tenant', regex: '"x-tenancy":"(?<value>[^"]+)"' },
        ],
      },
    ];

    const detected = detectExplorerEvents([event], detectors);
    const candidates = transactionCandidatesFromDetections([event], detected, detectors);

    expect(detected).toHaveLength(1);
    expect(detected[0].phase).toBe('start');
    expect(detected[0].correlationValue).toBe('138375bc-74ae-45d5-909a-2f7e2de97156');
    expect(candidates).toHaveLength(1);
    expect(candidates[0].method).toBe('GET');
    expect(candidates[0].tenant).toBe('TENANT');
  });

  it('uses user fields extracted directly from api-start logs', () => {
    const event: NormalizedLogEvent = {
      id: 'event-3',
      serviceId: 'primary-api',
      serviceName: 'Primary API',
      provider: 'azure',
      source: 'trace',
      table: 'AppTraces',
      timeGenerated: new Date('2026-05-16T21:44:46.000Z'),
      operationId: 'operation-3',
      telemetryId: 'telemetry-3',
      message: 'Service - API called: [ requestId: "request-3", method: "GET", user: {"preferred_username":"user@example.com"} ]',
      raw: {},
    };
    const detectors: ExplorerDetectorConfig[] = [
      {
        id: 'api-start',
        type: 'api-start',
        serviceId: 'primary-api',
        source: 'trace',
        messageRegex: '^Service - API called:',
        fieldExtractors: [
          { name: 'requestId', regex: 'requestId:\\s*"(?<value>[^"]+)"' },
          { name: 'preferred_username', regex: '"preferred_username":"(?<value>[^"]+)"' },
        ],
      },
    ];

    const detections = detectExplorerEvents([event], detectors);
    const candidates = transactionCandidatesFromDetections([event], detections, detectors);

    expect(candidates[0].user).toBe('user@example.com');
    expect(filterTransactionCandidates(candidates, { user: 'user' })).toHaveLength(1);
  });
});
