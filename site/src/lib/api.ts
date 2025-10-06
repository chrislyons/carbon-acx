import { artifactUrl } from './paths';
import { FetchJSONError, fetchJSON } from './fetchJSON';
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

interface ArtifactIndexEntry {
  path?: string;
}

interface ArtifactIndexPayload {
  files?: ArtifactIndexEntry[];
}

interface LatestBuildPointer {
  build_hash?: string;
  artifact_dir?: string;
}

type ArtifactOverrideMap = Map<string, string>;

let artifactOverrides: ArtifactOverrideMap | null = null;
let artifactOverridesPromise: Promise<ArtifactOverrideMap> | null = null;

function canonicalKeyFromPath(path: string): string | null {
  const normalised = normalisePath(path);
  const marker = '/calc/outputs/';
  const markerIndex = normalised.indexOf(marker);
  if (markerIndex >= 0) {
    return normalised.slice(markerIndex + marker.length);
  }
  if (!normalised.includes('/')) {
    return normalised;
  }
  return null;
}

function extractRootHash(path: string): string | null {
  const segments = normalisePath(path)
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return null;
  }
  return segments[0];
}

function scoreArtifactPath(path: string, preferredHash: string | null): number {
  let score = 0;
  const normalised = normalisePath(path);
  if (preferredHash && extractRootHash(normalised) === preferredHash) {
    score += 100;
  }
  if (normalised.includes('/calc/outputs/')) {
    score += 10;
  }
  if (!normalised.includes('/')) {
    score -= 5;
  }
  return score;
}

function extractHashFromPointer(pointer: LatestBuildPointer | null): string | null {
  if (!pointer) {
    return null;
  }
  if (typeof pointer.build_hash === 'string' && pointer.build_hash.trim().length > 0) {
    return pointer.build_hash.trim();
  }
  if (typeof pointer.artifact_dir === 'string' && pointer.artifact_dir.trim().length > 0) {
    const fromDir = extractRootHash(pointer.artifact_dir);
    if (fromDir) {
      return fromDir;
    }
  }
  return null;
}

async function loadArtifactOverrides(signal?: AbortSignal): Promise<ArtifactOverrideMap> {
  if (artifactOverrides) {
    return artifactOverrides;
  }

  if (!artifactOverridesPromise) {
    artifactOverridesPromise = (async (): Promise<ArtifactOverrideMap> => {
      const candidates = new Map<string, { path: string; score: number }>();
      try {
        const [indexPayload, pointerPayload] = await Promise.all([
          fetchJSON<ArtifactIndexPayload>(resolveArtifactUrl('index.json'), {
            signal,
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          }).catch((error: unknown) => {
            if (error instanceof FetchJSONError) {
              return null;
            }
            throw error;
          }),
          fetchJSON<LatestBuildPointer>(resolveArtifactUrl('latest-build.json'), {
            signal,
            headers: { Accept: 'application/json' },
            cache: 'no-store',
          }).catch((error: unknown) => {
            if (error instanceof FetchJSONError) {
              return null;
            }
            throw error;
          }),
        ]);

        const preferredHash = extractHashFromPointer(pointerPayload ?? null);
        if (indexPayload && Array.isArray(indexPayload.files)) {
          for (const entry of indexPayload.files) {
            if (!entry || typeof entry.path !== 'string') {
              continue;
            }
            const canonicalKey = canonicalKeyFromPath(entry.path);
            if (!canonicalKey) {
              continue;
            }
            const score = scoreArtifactPath(entry.path, preferredHash);
            const existing = candidates.get(canonicalKey);
            if (!existing || score > existing.score) {
              candidates.set(canonicalKey, {
                path: normalisePath(entry.path),
                score,
              });
            }
          }
        }
      } catch {
        // ignore failures and fall back to direct paths
      }

      artifactOverrides = new Map<string, string>();
      for (const [key, value] of candidates.entries()) {
        artifactOverrides.set(key, value.path);
      }
      return artifactOverrides;
    })();
  }

  try {
    return await artifactOverridesPromise;
  } finally {
    artifactOverridesPromise = null;
    if (!artifactOverrides) {
      artifactOverrides = new Map<string, string>();
    }
  }
}

async function resolveOverridePath(path: string, signal?: AbortSignal): Promise<string | null> {
  const overrides = await loadArtifactOverrides(signal);
  const normalised = normalisePath(path);
  const override = overrides.get(normalised);
  if (override && override !== normalised) {
    return override;
  }
  return null;
}

async function fetchArtifact(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const normalised = normalisePath(path);
  const requestInit: RequestInit = {
    method: 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    ...init
  };

  const performFetch = async (targetPath: string): Promise<Response> => {
    return fetch(resolveArtifactUrl(targetPath), requestInit);
  };

  let response = await performFetch(normalised);
  if (response.ok) {
    return response;
  }

  const fallbackPath = await resolveOverridePath(normalised, requestInit.signal);
  if (fallbackPath && fallbackPath !== normalised) {
    response = await performFetch(fallbackPath);
    if (response.ok) {
      return response;
    }
  }

  let message = '';
  try {
    message = await response.text();
  } catch {
    // ignore read failures and fall back to status text
  }
  throw new Error(message || `Artifact request failed with status ${response.status}`);
}

async function loadArtifactJson(path: string, signal?: AbortSignal): Promise<unknown> {
  if (jsonArtifactCache.has(path)) {
    return jsonArtifactCache.get(path)!;
  }

  const normalised = normalisePath(path);
  try {
    const data = await fetchJSON<unknown>(resolveArtifactUrl(normalised), {
      signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    jsonArtifactCache.set(path, data);
    return data;
  } catch (error) {
    const shouldRetry =
      error instanceof FetchJSONError ||
      (error instanceof Error && /Unable to parse JSON/.test(error.message));
    if (!shouldRetry) {
      throw error;
    }
    const fallbackPath = await resolveOverridePath(normalised, signal);
    if (!fallbackPath || fallbackPath === normalised) {
      throw error;
    }
    const data = await fetchJSON<unknown>(resolveArtifactUrl(fallbackPath), {
      signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    jsonArtifactCache.set(path, data);
    return data;
  }
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
