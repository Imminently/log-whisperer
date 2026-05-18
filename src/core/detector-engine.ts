/**
 * Detector engine for converting normalized logs into explorer events.
 */

import type {
  DetectedExplorerEvent,
  ExplorerDetectorConfig,
  ExplorerEventKind,
  ExplorerLogSource,
  NormalizedLogEvent,
  TransactionCandidate,
} from './explorer-types.js';

interface CompiledFieldExtractor {
  name: string;
  regex: RegExp;
}

interface CompiledDetector {
  config: ExplorerDetectorConfig;
  kind: ExplorerEventKind;
  source: ExplorerLogSource;
  matcher?: RegExp;
  fieldExtractors: CompiledFieldExtractor[];
}

function detectorKind(type: ExplorerDetectorConfig['type']): ExplorerEventKind {
  if (type === 'database') return 'database-call';
  if (type === 'service-call') return 'external-service-call';
  if (type === 'api-call') return 'custom';
  if (type === 'correlation') return 'custom';
  if (type === 'queue') return 'queue-message';
  return type;
}

function eventText(event: NormalizedLogEvent): string {
  const parts = [
    event.message,
    event.operationName,
    event.name,
    event.url,
    event.target,
    event.resultCode,
  ].filter((part): part is string => Boolean(part));

  return parts.join(' ');
}

function stableId(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(':').replace(/[^A-Za-z0-9_.:-]/g, '_');
}

function firstCapture(match: RegExpExecArray): string | undefined {
  if (match.groups?.value) return match.groups.value;
  return match[1];
}

export function compileExplorerDetectors(detectors: ExplorerDetectorConfig[]): CompiledDetector[] {
  return detectors.map((config) => {
    const pattern = config.messageRegex || config.regex;
    return {
      config,
      kind: detectorKind(config.type),
      source: config.source || 'any',
      matcher: pattern ? new RegExp(pattern, 'i') : undefined,
      fieldExtractors: (config.fieldExtractors || []).map((extractor) => ({
        name: extractor.name,
        regex: new RegExp(extractor.regex, 'i'),
      })),
    };
  });
}

export function detectExplorerEvents(
  events: NormalizedLogEvent[],
  detectors: ExplorerDetectorConfig[]
): DetectedExplorerEvent[] {
  const compiled = compileExplorerDetectors(detectors);
  const detected: DetectedExplorerEvent[] = [];

  for (const event of events) {
    const primaryText = event.message || '';
    const fallbackText = eventText(event);

    for (const detector of compiled) {
      if (detector.config.serviceId !== '*' && detector.config.serviceId !== event.serviceId) {
        continue;
      }

      if (detector.source !== 'any' && detector.source !== event.source) {
        continue;
      }

      const fields: Record<string, string> = {};
      const matchText = primaryText || fallbackText;
      if (detector.matcher) {
        detector.matcher.lastIndex = 0;
        let match = detector.matcher.exec(matchText);
        if (!match && fallbackText !== matchText) {
          detector.matcher.lastIndex = 0;
          match = detector.matcher.exec(fallbackText);
        }
        if (!match) continue;
        if (match.groups) {
          Object.assign(fields, match.groups);
        }
      }

      for (const extractor of detector.fieldExtractors) {
        extractor.regex.lastIndex = 0;
        let match = extractor.regex.exec(matchText);
        if (!match && fallbackText !== matchText) {
          extractor.regex.lastIndex = 0;
          match = extractor.regex.exec(fallbackText);
        }
        const value = match ? firstCapture(match) : undefined;
        if (value) {
          fields[extractor.name] = value;
        }
      }

      const correlationField = detector.config.correlationField;
      const correlationValue = correlationField ? fields[correlationField] : undefined;

      detected.push({
        id: stableId(event.id, detector.config.id),
        detectorId: detector.config.id,
        kind: detector.kind,
        phase: detector.config.phase || 'instant',
        correlationField,
        correlationValue,
        confidence: detector.config.confidence || 'medium',
        serviceId: event.serviceId,
        source: event.source,
        timeGenerated: event.timeGenerated,
        message: event.message,
        operationId: event.operationId,
        telemetryId: event.telemetryId,
        parentId: event.parentId,
        targetServiceId: detector.config.targetServiceId,
        targetLabel: detector.config.targetLabel,
        fields,
        rawEventId: event.id,
      });
    }
  }

  return detected;
}

export function transactionCandidatesFromDetections(
  events: NormalizedLogEvent[],
  detectedEvents: DetectedExplorerEvent[],
  detectors: ExplorerDetectorConfig[]
): TransactionCandidate[] {
  const eventById = new Map(events.map((event) => [event.id, event]));
  const detectorById = new Map(detectors.map((detector) => [detector.id, detector]));
  const candidates: TransactionCandidate[] = [];

  for (const detected of detectedEvents) {
    if (detected.kind !== 'api-start') continue;

    const event = eventById.get(detected.rawEventId);
    if (!event) continue;

    const detector = detectorById.get(detected.detectorId);
    const fields = detected.fields;
    const requestId = fields.requestId || fields.requestid || fields.requestID;
    const path = fields.path || fields.url || event.url || event.operationName;
    const user = fields.user || fields.preferred_username || fields.upn || fields.email || fields.username || fields.userName;

    candidates.push({
      id: stableId(event.operationId, event.telemetryId, requestId, detected.detectorId, event.id),
      detectorId: detected.detectorId,
      serviceId: event.serviceId,
      serviceName: event.serviceName,
      timeGenerated: event.timeGenerated,
      operationId: event.operationId,
      requestId,
      method: fields.method,
      path,
      tenant: fields.tenant,
      user,
      origin: fields.origin,
      fields,
      messagePreview: event.message ? event.message.slice(0, 240) : undefined,
      rawEventId: event.id,
    });

    if (!detector?.searchFields?.length) {
      continue;
    }
  }

  return candidates;
}

export function filterTransactionCandidates(
  candidates: TransactionCandidate[],
  filters: Record<string, string> | undefined
): TransactionCandidate[] {
  const activeFilters = Object.entries(filters || {}).filter(([, value]) => value.trim().length > 0);
  if (activeFilters.length === 0) return candidates;

  return candidates.filter((candidate) =>
    activeFilters.every(([key, value]) => {
      const haystack = String(candidate.fields[key] || (candidate as unknown as Record<string, unknown>)[key] || '').toLowerCase();
      return haystack.includes(value.toLowerCase());
    })
  );
}
