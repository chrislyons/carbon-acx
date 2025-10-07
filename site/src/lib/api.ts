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

function normaliseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function parseReferenceList(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const fallback = trimmed
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const htmlIndicator = /<(!doctype|html|head|body|ol|ul|li)\b/i;
  const htmlDocumentIndicator = /^\s*<!doctype html\b/i;
  const htmlRootIndicator = /^\s*<html\b/i;
  const looksLikeHtmlDocument = htmlDocumentIndicator.test(trimmed) || htmlRootIndicator.test(trimmed);

  if (!htmlIndicator.test(trimmed)) {
    return fallback.map(normaliseWhitespace);
  }

  if (typeof DOMParser === 'undefined') {
    return looksLikeHtmlDocument ? [] : fallback.map(normaliseWhitespace);
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');
    const listItems = Array.from(doc.querySelectorAll('ol li, ul li'));
    const references = listItems
      .map((item) => item.textContent ?? '')
      .map(normaliseWhitespace)
      .filter((entry) => entry.length > 0);

    if (references.length > 0) {
      return references;
    }

    if (looksLikeHtmlDocument) {
      return [];
    }

    const bodyText = doc.body?.textContent ?? '';
    if (bodyText.trim().length === 0) {
      return fallback.map(normaliseWhitespace);
    }

    return bodyText
      .split('\n')
      .map(normaliseWhitespace)
      .filter((entry) => entry.length > 0);
  } catch {
    return looksLikeHtmlDocument ? [] : fallback.map(normaliseWhitespace);
  }
}

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

interface FigureManifestReferenceOrderEntry {
  index?: number;
  source_id?: string;
}

interface FigureManifestReferences {
  path?: string;
  legacy_path?: string;
  order?: FigureManifestReferenceOrderEntry[];
  line_count?: number;
}

interface FigureManifestPayload {
  schema_version?: string;
  figure_id?: string;
  figure_method?: string;
  generated_at?: string;
  hash_prefix?: string;
  figure_path?: string;
  legacy_figure_path?: string;
  figure_sha256?: string;
  citation_keys?: string[];
  references?: FigureManifestReferences;
  numeric_invariance?: {
    passed?: boolean;
    tolerance_percent?: number;
  };
  [key: string]: unknown;
}

interface ManifestArtifactEntry {
  path?: string;
  sha256?: string;
  preferred?: boolean;
}

interface ManifestIndexFigureEntry {
  figure_id?: string;
  figure_method?: string;
  hash_prefix?: string;
  manifests?: ManifestArtifactEntry[];
  figures?: ManifestArtifactEntry[];
  references?: ManifestArtifactEntry[];
}

interface ManifestIndexPayload {
  schema_version?: string;
  generated_at?: string;
  build_hash?: string;
  dataset_version?: string;
  hashed_preferred?: boolean;
  dataset_manifest?: {
    path?: string;
    sha256?: string;
  };
  figures?: ManifestIndexFigureEntry[];
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

function selectPreferredArtifactPath(
  entries: ManifestArtifactEntry[] | null | undefined
): string | null {
  if (!Array.isArray(entries)) {
    return null;
  }
  let fallback: string | null = null;
  for (const entry of entries) {
    if (!entry || typeof entry.path !== 'string') {
      continue;
    }
    const candidate = normalisePath(entry.path);
    if (fallback === null) {
      fallback = candidate;
    }
    if (entry.preferred) {
      return candidate;
    }
  }
  return fallback;
}

function findFigureIndexEntry(
  indexPayload: ManifestIndexPayload | null,
  figureId: string
): ManifestIndexFigureEntry | null {
  if (!indexPayload || !Array.isArray(indexPayload.figures)) {
    return null;
  }
  for (const entry of indexPayload.figures) {
    if (!entry || typeof entry.figure_id !== 'string') {
      continue;
    }
    if (entry.figure_id === figureId) {
      return entry;
    }
  }
  return null;
}

function rebuildReferencesWithManifest(
  references: string[],
  manifest: FigureManifestPayload | null | undefined
): string[] {
  if (!manifest || typeof manifest !== 'object' || !manifest.references) {
    return references;
  }
  const order = manifest.references.order;
  if (!Array.isArray(order) || order.length !== references.length) {
    return references;
  }
  return references.map((entry, index) => {
    const orderEntry = order[index];
    const indexValue =
      orderEntry && typeof orderEntry.index === 'number' && Number.isFinite(orderEntry.index)
        ? Math.trunc(orderEntry.index)
        : index + 1;
    const stripped = entry.replace(/^\s*\[[0-9]+\]\s*/, '').trim();
    return `[${indexValue}] ${stripped}`;
  });
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

async function fetchManifestIndex(signal?: AbortSignal): Promise<ManifestIndexPayload | null> {
  try {
    return await fetchJSON<ManifestIndexPayload>(resolveArtifactUrl('manifest.json'), {
      signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
  } catch (error) {
    if (error instanceof FetchJSONError) {
      return null;
    }
    if (error instanceof Error && /Unable to parse JSON/.test(error.message)) {
      return null;
    }
    throw error;
  }
}

async function loadComputeArtifacts(signal?: AbortSignal): Promise<ComputeResult> {
  const fallbackReferencesPath = 'references/export_view_refs.txt';
  const figureOrder = ['stacked', 'bubble', 'sankey', 'feedback'] as const;
  const manifestIndex = await fetchManifestIndex(signal);

  const figurePaths = new Map<string, string>();
  const manifestPaths = new Map<string, string>();
  const referencePaths = new Map<string, string>();

  const datasetManifestCandidates: string[] = [];
  if (manifestIndex?.dataset_manifest?.path) {
    datasetManifestCandidates.push(normalisePath(manifestIndex.dataset_manifest.path));
  }
  datasetManifestCandidates.push('calc/outputs/manifest.json');
  datasetManifestCandidates.push('manifest.json');

  for (const name of figureOrder) {
    const entry = findFigureIndexEntry(manifestIndex, name);
    const preferredFigurePath = selectPreferredArtifactPath(entry?.figures);
    if (preferredFigurePath) {
      figurePaths.set(name, preferredFigurePath);
    }
    const preferredManifestPath = selectPreferredArtifactPath(entry?.manifests);
    if (preferredManifestPath) {
      manifestPaths.set(name, preferredManifestPath);
    }
    const preferredReferencePath = selectPreferredArtifactPath(entry?.references);
    if (preferredReferencePath) {
      referencePaths.set(name, preferredReferencePath);
    }
  }

  for (const name of figureOrder) {
    if (!figurePaths.has(name)) {
      figurePaths.set(name, `figures/${name}.json`);
    }
  }

  const selectedReferenceFigure = figureOrder.find((name) => referencePaths.has(name)) ?? null;
  const initialReferencePath = selectedReferenceFigure
    ? referencePaths.get(selectedReferenceFigure)!
    : fallbackReferencesPath;

  let datasetManifest: unknown = null;
  let datasetManifestPathUsed: string | null = null;
  for (const candidate of datasetManifestCandidates) {
    const normalised = normalisePath(candidate);
    try {
      datasetManifest = await loadArtifactJson(normalised, signal);
      datasetManifestPathUsed = normalised;
      break;
    } catch (error) {
      const shouldContinue =
        error instanceof FetchJSONError ||
        (error instanceof Error && /Unable to parse JSON/.test(error.message));
      if (!shouldContinue) {
        throw error;
      }
    }
  }
  if (!datasetManifest) {
    datasetManifest = {};
  }
  if (datasetManifestPathUsed) {
    jsonArtifactCache.set(datasetManifestPathUsed, datasetManifest);
  }

  const figureManifests = new Map<string, FigureManifestPayload>();
  const figuresPayload: Record<string, unknown> = {};

  for (const name of figureOrder) {
    const figurePath = figurePaths.get(name)!;
    const figureJson = await loadArtifactJson(figurePath, signal);
    figuresPayload[name] = figureJson;
    const manifestPath = manifestPaths.get(name);
    if (manifestPath) {
      try {
        const manifestJson = await loadArtifactJson(manifestPath, signal);
        if (manifestJson && typeof manifestJson === 'object') {
          figureManifests.set(name, manifestJson as FigureManifestPayload);
        }
      } catch (error) {
        const shouldIgnore =
          error instanceof FetchJSONError ||
          (error instanceof Error && /Unable to parse JSON/.test(error.message));
        if (!shouldIgnore) {
          throw error;
        }
      }
    }
  }

  let referencesPathUsed = initialReferencePath;
  let referencesText: string;
  try {
    referencesText = await loadArtifactText(referencesPathUsed, signal);
  } catch (error) {
    if (referencesPathUsed !== fallbackReferencesPath) {
      referencesPathUsed = fallbackReferencesPath;
      referencesText = await loadArtifactText(referencesPathUsed, signal);
    } else {
      throw error;
    }
  }

  let references = referenceListCache.get(referencesPathUsed) ?? parseReferenceList(referencesText);
  if (!referenceListCache.has(referencesPathUsed)) {
    referenceListCache.set(referencesPathUsed, references);
  }

  const manifestForReferences =
    (selectedReferenceFigure && figureManifests.get(selectedReferenceFigure)) ||
    Array.from(figureManifests.values())[0];
  references = rebuildReferencesWithManifest(references, manifestForReferences);

  const result = {
    manifest: datasetManifest,
    figures: figuresPayload,
    references
  } as ComputeResult;

  const manifestRecord = datasetManifest as { [key: string]: unknown };
  if (manifestRecord && typeof manifestRecord.dataset_version === 'string') {
    result.datasetId = manifestRecord.dataset_version;
  } else if (manifestRecord && typeof manifestRecord.build_hash === 'string') {
    result.datasetId = manifestRecord.build_hash;
  } else if (manifestIndex && typeof manifestIndex.dataset_version === 'string') {
    result.datasetId = manifestIndex.dataset_version;
  } else if (manifestIndex && typeof manifestIndex.build_hash === 'string') {
    result.datasetId = manifestIndex.build_hash;
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
