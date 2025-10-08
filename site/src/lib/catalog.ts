import { artifactUrl } from './paths';
import { fetchJSON } from './fetchJSON';

export interface CatalogActivity extends Record<string, unknown> {
  id?: string;
  activity_id?: string;
  title?: string;
  name?: string;
  label?: string;
  summary?: string;
  description?: string;
  schedule_id?: string;
  ef_id?: string;
  category?: string;
  layer_id?: string;
}

export interface CatalogProfile extends Record<string, unknown> {
  id?: string;
  profile_id?: string;
  title?: string;
  name?: string;
  label?: string;
  summary?: string;
  description?: string;
  region?: string;
}

export interface CatalogPayload {
  activities?: unknown;
  profiles?: unknown;
  [key: string]: unknown;
}

export interface Catalog {
  readonly activities: CatalogActivity[];
  readonly profiles: CatalogProfile[];
}

const catalogUrl = artifactUrl('catalog.json');

let catalogPromise: Promise<Catalog> | null = null;

function normaliseRecordArray<T extends Record<string, unknown>>(
  value: unknown,
  predicate?: (entry: T) => boolean,
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is T => entry !== null && typeof entry === 'object')
    .filter((entry) => (predicate ? predicate(entry) : true));
}

async function requestCatalog(signal?: AbortSignal): Promise<Catalog> {
  const payload = await fetchJSON<CatalogPayload>(catalogUrl, { signal });
  const activities = normaliseRecordArray<CatalogActivity>(payload.activities, (entry) =>
    'activity_id' in entry || 'id' in entry,
  );
  const profiles = normaliseRecordArray<CatalogProfile>(payload.profiles, (entry) =>
    'profile_id' in entry || 'id' in entry,
  );
  return { activities, profiles } satisfies Catalog;
}

export function loadCatalog(signal?: AbortSignal): Promise<Catalog> {
  if (!catalogPromise) {
    catalogPromise = requestCatalog(signal).catch((error) => {
      catalogPromise = null;
      throw error;
    });
  }

  return catalogPromise;
}

function resolveActivityId(activity: CatalogActivity | null | undefined): string | null {
  if (!activity) {
    return null;
  }
  const idCandidate = activity.activity_id ?? activity.id;
  if (typeof idCandidate === 'string' && idCandidate.trim().length > 0) {
    return idCandidate.trim();
  }
  return null;
}

function formatIdentifier(value: string | null | undefined, fallback: string): string {
  const resolved = typeof value === 'string' ? value.trim() : '';
  if (!resolved) {
    return fallback;
  }
  return resolved
    .split(/[_\-.\s]+/g)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getActivityById(catalog: Catalog, id: string | null | undefined): CatalogActivity | undefined {
  if (!id) {
    return undefined;
  }
  const needle = id.trim();
  if (!needle) {
    return undefined;
  }
  return catalog.activities.find((activity) => resolveActivityId(activity) === needle);
}

export function getCategoryLabel(catalog: Catalog, id: string | null | undefined): string {
  const fallback = 'Uncategorized';
  const resolved = typeof id === 'string' ? id.trim() : '';
  if (!resolved) {
    return fallback;
  }
  const canonical = resolved.toLowerCase();
  const match = catalog.activities.find((activity) => {
    const category = typeof activity?.category === 'string' ? activity.category.trim().toLowerCase() : '';
    return category === canonical;
  });
  if (match?.category && typeof match.category === 'string') {
    return formatIdentifier(match.category, fallback);
  }
  return formatIdentifier(resolved, fallback);
}

export function getLayerLabel(catalog: Catalog, id: string | null | undefined): string {
  const fallback = 'Unassigned';
  const resolved = typeof id === 'string' ? id.trim() : '';
  if (!resolved) {
    return fallback;
  }
  const canonical = resolved.toLowerCase();
  const match = catalog.activities.find((activity) => {
    const layer = typeof activity?.layer_id === 'string' ? activity.layer_id.trim().toLowerCase() : '';
    return layer === canonical;
  });
  if (match?.layer_id && typeof match.layer_id === 'string') {
    return formatIdentifier(match.layer_id, fallback);
  }
  return formatIdentifier(resolved, fallback);
}
