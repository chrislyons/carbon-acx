import { artifactUrl } from './paths';
import { fetchJSON } from './fetchJSON';

export interface CatalogActivity extends Record<string, unknown> {
  id?: string;
  activity_id?: string;
  title?: string;
  name?: string;
  summary?: string;
  description?: string;
  schedule_id?: string;
  ef_id?: string;
}

export interface CatalogProfile extends Record<string, unknown> {
  id?: string;
  profile_id?: string;
  title?: string;
  name?: string;
  summary?: string;
  description?: string;
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

function normaliseRecordArray<T extends Record<string, unknown>>(value: unknown): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is T => entry !== null && typeof entry === 'object');
}

async function requestCatalog(signal?: AbortSignal): Promise<Catalog> {
  const payload = await fetchJSON<CatalogPayload>(catalogUrl, { signal });
  const activities = normaliseRecordArray<CatalogActivity>(payload.activities);
  const profiles = normaliseRecordArray<CatalogProfile>(payload.profiles);
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
