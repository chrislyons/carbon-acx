import type { ComputeResult } from '../state/profile';

export type ComputeRequest = Record<string, unknown>;

export type ComputeOptions = Omit<RequestInit, 'method' | 'body'>;

const BASE_PATH = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
const ARTIFACT_BASE_PATH = `${BASE_PATH}/artifacts`;

const RAW_USE_COMPUTE_FLAG = import.meta.env.VITE_USE_COMPUTE_API;
export const USE_COMPUTE_API =
  RAW_USE_COMPUTE_FLAG === 'true' || (RAW_USE_COMPUTE_FLAG !== 'false' && import.meta.env.DEV);

function normalisePath(path: string): string {
  return path.replace(/^\/+/, '');
}

function resolveArtifactUrl(path: string): string {
  return `${ARTIFACT_BASE_PATH}/${normalisePath(path)}`;
}

async function fetchArtifact(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const response = await fetch(resolveArtifactUrl(path), {
    method: 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Artifact request failed with status ${response.status}`);
  }

  return response;
}

async function loadArtifactJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetchArtifact(path, { signal, headers: { Accept: 'application/json' } });
  return response.json();
}

async function loadArtifactText(path: string, signal?: AbortSignal): Promise<string> {
  const response = await fetchArtifact(path, { signal, headers: { Accept: 'text/plain' } });
  return response.text();
}

async function loadComputeArtifacts(signal?: AbortSignal): Promise<ComputeResult> {
  const [manifestJson, stackedJson, bubbleJson, sankeyJson, referencesText] = await Promise.all([
    loadArtifactJson('manifest.json', signal),
    loadArtifactJson('figures/stacked.json', signal),
    loadArtifactJson('figures/bubble.json', signal),
    loadArtifactJson('figures/sankey.json', signal),
    loadArtifactText('references/export_view_refs.txt', signal)
  ]);

  const references = referencesText
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const result = {
    manifest: manifestJson,
    figures: {
      stacked: stackedJson,
      bubble: bubbleJson,
      sankey: sankeyJson
    },
    references
  } as ComputeResult;

  const manifestRecord = manifestJson as { [key: string]: unknown };
  if (typeof manifestRecord.dataset_version === 'string') {
    result.datasetId = manifestRecord.dataset_version;
  } else if (typeof manifestRecord.build_hash === 'string') {
    result.datasetId = manifestRecord.build_hash;
  }

  return result;
}

export async function compute<TResponse = unknown>(
  payload: ComputeRequest,
  options: ComputeOptions = {}
): Promise<TResponse> {
  if (USE_COMPUTE_API) {
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

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Request failed with status ${response.status}`);
    }

    return (await response.json()) as TResponse;
  }

  const signal = options.signal ?? undefined;
  const artifactResult = await loadComputeArtifacts(signal);
  return artifactResult as TResponse;
}

export type ExportFormat = 'csv' | 'json' | 'txt';

export async function exportView(
  format: ExportFormat,
  payload: ComputeRequest,
  options: ComputeOptions = {}
): Promise<Response> {
  if (USE_COMPUTE_API) {
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

  const signal = options.signal ?? undefined;
  const path =
    format === 'csv'
      ? 'export_view.csv'
      : format === 'json'
        ? 'export_view.json'
        : 'references/export_view_refs.txt';

  return fetchArtifact(path, { signal, headers: options.headers });
}
