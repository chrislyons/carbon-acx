export type ComputeRequest = Record<string, unknown>;

export type ComputeOptions = Omit<RequestInit, 'method' | 'body'>;

export interface ReferenceEntry {
  key?: string;
  n?: number;
  text?: string;
}

export interface ComputeResponse {
  manifest?: Record<string, unknown>;
  figures?: Record<string, unknown>;
  references?: ReferenceEntry[];
  datasetId?: string;
  [key: string]: unknown;
}

export interface HealthResponse {
  ok: boolean;
  dataset: string | null;
  error?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toReferenceEntry(value: unknown): ReferenceEntry | null {
  if (!isRecord(value)) {
    return null;
  }
  const text = typeof value.text === 'string' ? value.text.trim() : null;
  if (!text) {
    return null;
  }
  const entry: ReferenceEntry = { text };
  if (typeof value.key === 'string' && value.key.trim()) {
    entry.key = value.key.trim();
  }
  if (typeof value.n === 'number' && Number.isFinite(value.n)) {
    entry.n = Math.trunc(value.n);
  }
  return entry;
}

export function parseComputeResponse(payload: unknown): ComputeResponse {
  if (!isRecord(payload)) {
    throw new Error('Invalid compute response payload');
  }
  if (!isRecord(payload.figures)) {
    throw new Error('Compute response missing figures');
  }
  if (typeof payload.datasetId !== 'string' || !payload.datasetId.trim()) {
    throw new Error('Compute response missing datasetId');
  }

  const references = Array.isArray(payload.references)
    ? payload.references
        .map((entry) => toReferenceEntry(entry))
        .filter((entry): entry is ReferenceEntry => entry !== null)
    : [];

  return {
    ...payload,
    references
  } satisfies ComputeResponse;
}

export async function compute(
  payload: ComputeRequest,
  options: ComputeOptions = {}
): Promise<ComputeResponse> {
  const { headers, ...fetchOptions } = options;
  const response = await fetch('/api/compute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {})
    },
    body: JSON.stringify(payload),
    ...fetchOptions
  });

  const body = await response.json().catch(() => {
    throw new Error('Failed to parse compute response');
  });

  if (!response.ok) {
    const message = (isRecord(body) && typeof body.error === 'string' && body.error) ||
      (typeof body === 'string' && body) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return parseComputeResponse(body);
}

export async function health(options: RequestInit = {}): Promise<HealthResponse> {
  const response = await fetch('/api/health', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.headers ?? {})
    },
    ...options
  });

  const body = await response.json().catch(() => ({}));

  if (!isRecord(body) || typeof body.ok !== 'boolean') {
    throw new Error('Health response malformed');
  }

  const dataset = typeof body.dataset === 'string' ? body.dataset : null;
  const error = typeof body.error === 'string' ? body.error : null;

  if (!response.ok || !body.ok) {
    throw new Error(error || `Health check failed with status ${response.status}`);
  }

  return { ok: true, dataset, error } satisfies HealthResponse;
}

export type ExportFormat = 'csv' | 'json' | 'txt';

export async function exportView(
  format: ExportFormat,
  payload: ComputeRequest,
  options: ComputeOptions = {}
): Promise<Response> {
  const { headers, ...fetchOptions } = options;
  const params = new URLSearchParams({ format });
  const accept =
    format === 'csv' ? 'text/csv' : format === 'txt' ? 'text/plain' : 'application/json';
  const response = await fetch(`/api/compute/export?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: accept,
      ...(headers ?? {})
    },
    body: JSON.stringify(payload),
    ...fetchOptions
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response;
}
