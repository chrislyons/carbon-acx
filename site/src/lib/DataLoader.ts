import { FetchJSONError, fetchJSON } from './fetchJSON';
import { artifactUrl } from './paths';
import { parseReferenceList } from './api';
import { buildReferenceLookup } from './references';

export type FigureDataStatus = 'idle' | 'loading' | 'success' | 'error';

interface ManifestReferenceOrderEntry {
  index?: number;
  source_id?: string;
}

interface ManifestReferences {
  path?: string;
  legacy_path?: string;
  order?: ManifestReferenceOrderEntry[];
  line_count?: number;
}

export interface FigureManifestEntry {
  figure_id: string;
  figure_method?: string;
  figure_path: string;
  legacy_figure_path?: string;
  citation_keys?: string[];
  references?: ManifestReferences;
  numeric_invariance?: {
    passed?: boolean;
    tolerance_percent?: number;
  };
  [key: string]: unknown;
}

export interface FigureJsonPayload {
  figure_id?: string;
  figure_method?: string;
  citation_keys?: string[];
  data?: unknown;
  [key: string]: unknown;
}

export interface LoadedFigureData {
  manifest: FigureManifestEntry;
  payload: FigureJsonPayload;
  references: string[];
  citationKeys: string[];
  referenceLookup: Map<string, number>;
}

interface ManifestIndexArtifactEntry {
  path?: string;
  preferred?: boolean;
}

interface ManifestIndexFigureEntry {
  figure_id?: string;
  manifests?: ManifestIndexArtifactEntry[];
}

interface ManifestIndexPayload {
  figures?: ManifestIndexFigureEntry[];
}

interface AggregateManifestPayload {
  figures?: unknown;
  [key: string]: unknown;
}

const manifestCache: {
  data: Map<string, FigureManifestEntry> | null;
  promise: Promise<Map<string, FigureManifestEntry>> | null;
} = {
  data: null,
  promise: null
};

const figureCache = new Map<string, LoadedFigureData>();
const pendingFigures = new Map<string, Promise<LoadedFigureData>>();

function normalisePath(path: string): string {
  return path.replace(/^\/+/, '');
}

function resolveArtifactUrl(path: string): string {
  return artifactUrl(normalisePath(path));
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function normaliseManifestEntry(entry: unknown): FigureManifestEntry | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const figureId = typeof record.figure_id === 'string' ? record.figure_id : null;
  const figurePath = typeof record.figure_path === 'string' ? record.figure_path : null;
  if (!figureId || !figurePath) {
    return null;
  }
  const manifestEntry: FigureManifestEntry = {
    figure_id: figureId,
    figure_path: figurePath
  };
  if (typeof record.figure_method === 'string') {
    manifestEntry.figure_method = record.figure_method;
  }
  if (typeof record.legacy_figure_path === 'string') {
    manifestEntry.legacy_figure_path = record.legacy_figure_path;
  }
  if (Array.isArray(record.citation_keys)) {
    manifestEntry.citation_keys = (record.citation_keys as unknown[]).filter(
      (value): value is string => typeof value === 'string'
    );
  }
  if (record.references && typeof record.references === 'object') {
    const referencesRecord = record.references as Record<string, unknown>;
    const references: ManifestReferences = {};
    if (typeof referencesRecord.path === 'string') {
      references.path = referencesRecord.path;
    }
    if (typeof referencesRecord.legacy_path === 'string') {
      references.legacy_path = referencesRecord.legacy_path;
    }
    if (typeof referencesRecord.line_count === 'number') {
      references.line_count = referencesRecord.line_count;
    }
    if (Array.isArray(referencesRecord.order)) {
      references.order = (referencesRecord.order as unknown[])
        .map((item): ManifestReferenceOrderEntry | null => {
          if (!item || typeof item !== 'object') {
            return null;
          }
          const row = item as Record<string, unknown>;
          if (typeof row.source_id !== 'string') {
            return null;
          }
          const entry: ManifestReferenceOrderEntry = { source_id: row.source_id };
          if (typeof row.index === 'number') {
            entry.index = row.index;
          }
          return entry;
        })
        .filter((value): value is ManifestReferenceOrderEntry => value !== null);
    }
    manifestEntry.references = references;
  }
  if (record.numeric_invariance && typeof record.numeric_invariance === 'object') {
    const invarianceRecord = record.numeric_invariance as Record<string, unknown>;
    manifestEntry.numeric_invariance = {
      passed: typeof invarianceRecord.passed === 'boolean' ? invarianceRecord.passed : undefined,
      tolerance_percent:
        typeof invarianceRecord.tolerance_percent === 'number'
          ? invarianceRecord.tolerance_percent
          : undefined
    };
  }
  Object.keys(record).forEach((key) => {
    if (!(key in manifestEntry)) {
      (manifestEntry as Record<string, unknown>)[key] = record[key];
    }
  });
  return manifestEntry;
}

function extractAggregateManifestEntries(payload: AggregateManifestPayload): FigureManifestEntry[] {
  const { figures } = payload;
  if (!figures) {
    return [];
  }
  if (Array.isArray(figures)) {
    return figures
      .map((entry) => normaliseManifestEntry(entry))
      .filter((entry): entry is FigureManifestEntry => entry !== null);
  }
  if (typeof figures === 'object') {
    return Object.values(figures as Record<string, unknown>)
      .map((entry) => normaliseManifestEntry(entry))
      .filter((entry): entry is FigureManifestEntry => entry !== null);
  }
  return [];
}

function selectPreferredArtifact(entries: ManifestIndexArtifactEntry[] | undefined): string | null {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }
  const preferred = entries.find((entry) => entry && entry.preferred && typeof entry.path === 'string');
  if (preferred?.path) {
    return preferred.path;
  }
  const first = entries.find((entry) => entry && typeof entry.path === 'string');
  return first?.path ?? null;
}

async function fetchAggregateManifest(signal?: AbortSignal): Promise<FigureManifestEntry[] | null> {
  try {
    const payload = await fetchJSON<AggregateManifestPayload>(resolveArtifactUrl('figure_manifest.json'), {
      signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    const entries = extractAggregateManifestEntries(payload);
    if (entries.length === 0) {
      return null;
    }
    return entries;
  } catch (error) {
    if (error instanceof FetchJSONError) {
      return null;
    }
    if (error instanceof Error && /Unable to parse JSON/.test(error.message)) {
      return null;
    }
    if (isAbortError(error)) {
      throw error;
    }
    return null;
  }
}

async function fetchManifestFromIndex(signal?: AbortSignal): Promise<FigureManifestEntry[]> {
  const payload = await fetchJSON<ManifestIndexPayload>(resolveArtifactUrl('manifest.json'), {
    signal,
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  const figures = Array.isArray(payload.figures) ? payload.figures : [];
  const entries: FigureManifestEntry[] = [];
  for (const entry of figures) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const figureId = typeof entry.figure_id === 'string' ? entry.figure_id : null;
    if (!figureId) {
      continue;
    }
    const manifestPath = selectPreferredArtifact(entry.manifests);
    if (!manifestPath) {
      continue;
    }
    try {
      const manifest = await fetchJSON<AggregateManifestPayload>(resolveArtifactUrl(manifestPath), {
        signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const normalised = normaliseManifestEntry(manifest as unknown);
      if (normalised) {
        entries.push(normalised);
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      if (error instanceof Error) {
        console.warn(`Failed to load figure manifest for ${figureId}`, error);
      }
    }
  }
  return entries;
}

async function loadManifest(signal?: AbortSignal): Promise<Map<string, FigureManifestEntry>> {
  if (manifestCache.data) {
    return manifestCache.data;
  }
  if (manifestCache.promise) {
    return manifestCache.promise;
  }
  const promise = (async () => {
    const aggregate = await fetchAggregateManifest(signal);
    const entries = aggregate ?? (await fetchManifestFromIndex(signal));
    const map = new Map<string, FigureManifestEntry>();
    entries.forEach((entry) => {
      if (!map.has(entry.figure_id)) {
        map.set(entry.figure_id, entry);
      }
    });
    manifestCache.data = map;
    manifestCache.promise = null;
    return map;
  })()
    .catch((error) => {
      manifestCache.promise = null;
      throw error;
    });
  manifestCache.promise = promise;
  return promise;
}

export async function listFigures(signal?: AbortSignal): Promise<FigureManifestEntry[]> {
  const manifest = await loadManifest(signal);
  return Array.from(manifest.values()).sort((a, b) => a.figure_id.localeCompare(b.figure_id));
}

function buildLookupFromOrder(
  entry: FigureManifestEntry,
  citationKeys: readonly string[]
): Map<string, number> {
  const orderEntries = entry.references?.order;
  const lookup = buildReferenceLookup(citationKeys);
  if (!Array.isArray(orderEntries) || orderEntries.length === 0) {
    return lookup;
  }
  orderEntries.forEach((item) => {
    if (!item) {
      return;
    }
    const sourceId = typeof item.source_id === 'string' ? item.source_id : null;
    const index = typeof item.index === 'number' ? item.index : null;
    if (!sourceId || !index || index <= 0 || !Number.isFinite(index)) {
      return;
    }
    lookup.set(sourceId, index);
  });
  return lookup;
}

function reorderReferences(entry: FigureManifestEntry, references: string[]): string[] {
  const orderEntries = entry.references?.order;
  if (!Array.isArray(orderEntries) || orderEntries.length === 0) {
    return references;
  }
  const ordered = [...references];
  orderEntries.forEach((item, index) => {
    if (!item) {
      return;
    }
    const targetIndex = typeof item.index === 'number' ? item.index - 1 : index;
    if (targetIndex < 0) {
      return;
    }
    const value = references[index] ?? references[targetIndex] ?? '';
    ordered[targetIndex] = value;
  });
  return ordered;
}

async function fetchFigurePayload(entry: FigureManifestEntry, signal?: AbortSignal): Promise<FigureJsonPayload> {
  const payload = await fetchJSON<FigureJsonPayload>(resolveArtifactUrl(entry.figure_path), {
    signal,
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  return payload;
}

async function fetchReferences(entry: FigureManifestEntry, signal?: AbortSignal): Promise<string[]> {
  const path = entry.references?.path;
  if (!path) {
    return [];
  }
  const response = await fetch(resolveArtifactUrl(path), {
    signal,
    headers: { Accept: 'text/plain' },
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Reference fetch failed with status ${response.status}`);
  }
  const text = await response.text();
  const parsed = parseReferenceList(text);
  return reorderReferences(entry, parsed);
}

export async function loadFigure(figureId: string, signal?: AbortSignal): Promise<LoadedFigureData> {
  const trimmed = figureId.trim();
  if (!trimmed) {
    throw new Error('Figure ID is required');
  }
  if (figureCache.has(trimmed)) {
    return figureCache.get(trimmed)!;
  }
  if (pendingFigures.has(trimmed)) {
    return pendingFigures.get(trimmed)!;
  }
  const promise = (async () => {
    const manifest = await loadManifest(signal);
    const entry = manifest.get(trimmed);
    if (!entry) {
      throw new Error(`Figure not found: ${trimmed}`);
    }
    const [payload, references] = await Promise.all([
      fetchFigurePayload(entry, signal),
      fetchReferences(entry, signal).catch((error) => {
        if (isAbortError(error)) {
          throw error;
        }
        console.warn(`Failed to load references for ${entry.figure_id}`, error);
        return [] as string[];
      })
    ]);
    const citationKeys = Array.isArray(payload.citation_keys)
      ? payload.citation_keys.filter((key): key is string => typeof key === 'string')
      : Array.isArray(entry.citation_keys)
        ? entry.citation_keys
        : [];
    const referenceLookup = buildLookupFromOrder(entry, citationKeys);
    const result: LoadedFigureData = {
      manifest: entry,
      payload,
      references,
      citationKeys,
      referenceLookup
    };
    figureCache.set(trimmed, result);
    pendingFigures.delete(trimmed);
    return result;
  })()
    .catch((error) => {
      pendingFigures.delete(trimmed);
      throw error;
    });
  pendingFigures.set(trimmed, promise);
  return promise;
}

export function clearFigureCache(): void {
  manifestCache.data = null;
  manifestCache.promise = null;
  figureCache.clear();
  pendingFigures.clear();
}
