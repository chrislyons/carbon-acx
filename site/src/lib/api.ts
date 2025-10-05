import { artifactUrl } from './paths';
import { fetchJSON } from './fetchJSON';
import type { ComputeResult } from '../state/profile';

export type ComputeRequest = Record<string, unknown>;

export type ComputeOptions = Omit<RequestInit, 'method' | 'body'>;

const RAW_USE_COMPUTE_FLAG = import.meta.env.VITE_USE_COMPUTE_API;
export const USE_COMPUTE_API =
  RAW_USE_COMPUTE_FLAG === 'true' || (RAW_USE_COMPUTE_FLAG !== 'false' && import.meta.env.DEV);

function normalisePath(path: string): string {
  return path.replace(/^\/+/, '');
}

function resolveArtifactUrl(path: string): string {
  return artifactUrl(normalisePath(path));
}

const jsonArtifactCache = new Map<string, unknown>();
const textArtifactCache = new Map<string, string>();
const referenceListCache = new Map<string, string[]>();

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
  if (jsonArtifactCache.has(path)) {
    return jsonArtifactCache.get(path)!;
  }
  const data = await fetchJSON<unknown>(resolveArtifactUrl(path), {
    signal,
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  jsonArtifactCache.set(path, data);
  return data;
}

async function loadArtifactText(path: string, signal?: AbortSignal): Promise<string> {
  if (textArtifactCache.has(path)) {
    return textArtifactCache.get(path)!;
  }
  const response = await fetchArtifact(path, { signal, headers: { Accept: 'text/plain' } });
  const data = await response.text();
  textArtifactCache.set(path, data);
  return data;
}

async function loadComputeArtifacts(signal?: AbortSignal): Promise<ComputeResult> {
  const referencesPath = 'references/export_view_refs.txt';
  const [
    manifestJson,
    stackedJson,
    bubbleJson,
    sankeyJson,
    feedbackJson,
    referencesText
  ] = await Promise.all([
    loadArtifactJson('manifest.json', signal),
    loadArtifactJson('figures/stacked.json', signal),
    loadArtifactJson('figures/bubble.json', signal),
    loadArtifactJson('figures/sankey.json', signal),
    loadArtifactJson('figures/feedback.json', signal),
    loadArtifactText(referencesPath, signal)
  ]);

  const references = referenceListCache.get(referencesPath) ??
    referencesText
      .split('\n')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

  if (!referenceListCache.has(referencesPath)) {
    referenceListCache.set(referencesPath, references);
  }

  const result = {
    manifest: manifestJson,
    figures: {
      stacked: stackedJson,
      bubble: bubbleJson,
      sankey: sankeyJson,
      feedback: feedbackJson
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
