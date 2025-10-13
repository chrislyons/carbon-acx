export interface SectorSummary {
  id: string;
  name: string;
  description: string | null;
}

export interface ActivitySummary {
  id: string;
  sectorId: string;
  layerId: string | null;
  category: string | null;
  name: string | null;
  defaultUnit: string | null;
  description: string | null;
  /** Icon URL (SVG preferred) for visual badge representation */
  iconUrl?: string | null;
  /** Icon type identifier for predefined icons (e.g., 'netflix', 'amazon', 'car') */
  iconType?: string | null;
  /** Background color for badge (hex format) */
  badgeColor?: string | null;
}

export interface ProfileSummary {
  id: string;
  sectorId: string;
  layerId: string | null;
  name: string;
  regionCode: string | null;
  gridStrategy: string | null;
  officeDaysPerWeek: number | null;
  notes: string | null;
}

export interface DatasetSummary {
  datasetId: string;
  title?: string | null;
  generatedAt: string | null;
  figureCount: number | null;
  manifestPath: string | null;
  manifestSha256: string | null;
}

export interface BubbleDatum {
  id: string;
  label: string;
  x: number;
  y: number;
  value: number;
  color?: string | null;
  description?: string | null;
}

export interface BubbleFigureData {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  xAxis: { label: string; unit?: string | null };
  yAxis: { label: string; unit?: string | null };
  valueAxis: { label: string; unit?: string | null };
  points: BubbleDatum[];
}

interface DatasetFigureBase {
  figureId: string;
  title: string;
  description?: string | null;
  figureType: string;
  data: unknown;
}

export interface BubbleFigure extends DatasetFigureBase {
  figureType: 'bubble';
  data: BubbleFigureData;
}

export type DatasetFigure = DatasetFigureBase | BubbleFigure;

export interface DatasetDetail extends DatasetSummary {
  title: string | null;
  description: string | null;
  figures: DatasetFigure[];
}

export interface ReferenceSummary {
  referenceId: string;
  text: string;
  citation?: string | null;
  url?: string | null;
  year?: number | null;
  layer?: string;
}

export interface ProfileActivitySchedule {
  profileId: string;
  sectorId: string;
  activityId: string;
  layerId: string | null;
  freqPerDay: number | null;
  freqPerWeek: number | null;
  officeDaysOnly: boolean;
  regionOverride: string | null;
  scheduleNotes: string | null;
  distanceKm: number | null;
  passengers: number | null;
  hours: number | null;
  viewers: number | null;
  servings: number | null;
}

const rawConfiguredApiBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const fallbackApiBase = (() => {
  const baseUrl = import.meta.env.BASE_URL ?? '/';
  const formatted = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
  const resolved = new URL('./api/', `http://localhost${formatted}`);
  const pathname = resolved.pathname.replace(/\/?$/, '');
  return pathname.length > 0 ? pathname : '/';
})();
const apiBase = rawConfiguredApiBase.length > 0 ? rawConfiguredApiBase : fallbackApiBase;

function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.replace(/^\/+/, '');
  if (/^https?:\/\//i.test(apiBase)) {
    const baseUrl = apiBase.endsWith('/') ? apiBase : `${apiBase}/`;
    return new URL(normalizedPath, baseUrl).toString();
  }
  const basePath = apiBase.length > 0 ? apiBase : '/';
  const formattedBase = basePath.startsWith('/') ? basePath : `/${basePath}`;
  const directoryBase = formattedBase.endsWith('/') ? formattedBase : `${formattedBase}/`;
  const baseUrl = new URL(directoryBase, 'http://localhost');
  const resolved = new URL(normalizedPath, baseUrl);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveApiUrl(path);
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const contentType = response.headers.get('content-type');
  const text = await response.text();
  if (contentType && contentType.toLowerCase().includes('application/json')) {
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON from ${url}: ${(error as Error).message}`);
    }
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    const preview = text.trim().slice(0, 120);
    const suffix = text.length > 120 ? '…' : '';
    throw new Error(
      `Failed to parse JSON from ${url}: ${(error as Error).message}. Received: ${preview}${suffix}`,
    );
  }
}

export function loadSectors(): Promise<SectorSummary[]> {
  return fetchJson<{ sectors: SectorSummary[] }>('sectors.json').then((data) => data.sectors);
}

export function loadDatasets(): Promise<DatasetSummary[]> {
  return fetchJson<{ datasets: DatasetSummary[] }>('datasets.json').then((data) => data.datasets);
}

export function loadActivities(sectorId: string): Promise<ActivitySummary[]> {
  return loadSector(sectorId).then((data) => data.activities);
}

export function loadSector(sectorId: string): Promise<{
  sector: SectorSummary;
  activities: ActivitySummary[];
  profiles: ProfileSummary[];
}> {
  return fetchJson<{ sector: SectorSummary; activities: ActivitySummary[]; profiles?: ProfileSummary[] }>(
    `sectors/${encodeURIComponent(sectorId)}.json`,
  ).then((data) => ({
    sector: data.sector,
    activities: data.activities,
    profiles: data.profiles ?? [],
  }));
}

function normaliseString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function normaliseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function normaliseBubbleDatum(raw: unknown, fallbackId: number): BubbleDatum | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = normaliseString(record['id']) ?? `${fallbackId}`;
  const label = normaliseString(record['label']) ?? id;
  const x = normaliseNumber(record['x']);
  const y = normaliseNumber(record['y']);
  const value = normaliseNumber(record['value']);
  if (x == null || y == null || value == null) {
    return null;
  }
  return {
    id,
    label,
    x,
    y,
    value,
    color: normaliseString(record['color']),
    description: normaliseString(record['description']),
  };
}

function normaliseBubbleFigure(raw: unknown, base: DatasetFigureBase): BubbleFigure | DatasetFigureBase {
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const record = raw as Record<string, unknown>;
  const pointsValue = record['points'] ?? record['data'];
  if (!Array.isArray(pointsValue)) {
    return base;
  }
  const points = pointsValue
    .map((entry, index) => normaliseBubbleDatum(entry, index))
    .filter((value): value is BubbleDatum => Boolean(value));

  if (points.length === 0) {
    return base;
  }

  const axis = (value: unknown, fallback: string) => {
    if (!value || typeof value !== 'object') {
      return { label: fallback, unit: null };
    }
    const data = value as Record<string, unknown>;
    return {
      label: normaliseString(data['label']) ?? fallback,
      unit: normaliseString(data['unit']),
    };
  };

  const xAxis = axis(record['xAxis'] ?? record['x_axis'], 'X value');
  const yAxis = axis(record['yAxis'] ?? record['y_axis'], 'Y value');
  const valueAxis = axis(record['valueAxis'] ?? record['value_axis'], 'Bubble size');

  return {
    ...base,
    figureType: 'bubble',
    data: {
      id: base.figureId,
      title: base.title,
      subtitle: normaliseString(record['subtitle']),
      description: base.description ?? normaliseString(record['description']),
      xAxis,
      yAxis,
      valueAxis,
      points,
    },
  };
}

function normaliseFigures(raw: unknown): DatasetFigure[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const value = entry as Record<string, unknown>;
      const figureId = normaliseString(value['id']) ?? normaliseString(value['figure_id']);
      const title = normaliseString(value['title']) ?? 'Untitled figure';
      if (!figureId) {
        return null;
      }
      const base: DatasetFigureBase = {
        figureId,
        title,
        description: normaliseString(value['description']),
        figureType: (normaliseString(value['type']) ?? normaliseString(value['figure_type']) ?? 'unknown').toLowerCase(),
        data: value['data'] ?? null,
      };
      if (base.figureType.includes('bubble')) {
        return normaliseBubbleFigure(value['data'], base);
      }
      return base;
    })
    .filter((value): value is DatasetFigure => Boolean(value));
}

function normaliseDatasetDetail(raw: unknown): DatasetDetail {
  const record = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) ?? {};
  const datasetId =
    normaliseString(record['datasetId']) ??
    normaliseString(record['dataset_id']) ??
    normaliseString(record['id']) ??
    '';
  const generatedAt = normaliseString(record['generatedAt']) ?? normaliseString(record['generated_at']);
  const figureCount = normaliseNumber(record['figureCount']) ?? normaliseNumber(record['figure_count']);
  const manifestPath = normaliseString(record['manifestPath']) ?? normaliseString(record['manifest_path']);
  const manifestSha256 =
    normaliseString(record['manifestSha256']) ?? normaliseString(record['manifest_sha256']);

  const detail: DatasetDetail = {
    datasetId,
    generatedAt,
    figureCount,
    manifestPath,
    manifestSha256,
    title: normaliseString(record['title']) ?? normaliseString(record['name']),
    description: normaliseString(record['description']),
    figures: normaliseFigures(record['figures']),
  };

  return detail;
}

function normaliseReference(raw: unknown): ReferenceSummary {
  if (!raw || typeof raw !== 'object') {
    return {
      referenceId: 'unknown',
      text: 'Unknown reference',
    };
  }
  const value = raw as Record<string, unknown>;
  const referenceId = normaliseString(value['referenceId']) ?? normaliseString(value['id']) ?? 'unknown';
  return {
    referenceId,
    text: normaliseString(value['text']) ?? referenceId,
    citation: normaliseString(value['citation']),
    url: normaliseString(value['url']),
    year: normaliseNumber(value['year']),
    layer: normaliseString(value['layer']) ?? undefined,
  };
}

export function loadDataset(datasetId: string): Promise<{
  dataset: DatasetDetail;
  references: ReferenceSummary[];
}> {
  return fetchJson<{ dataset: unknown; references: ReferenceSummary[] }>(
    `datasets/${encodeURIComponent(datasetId)}.json`,
  ).then((payload) => ({
    dataset: normaliseDatasetDetail(payload.dataset),
    references: Array.isArray(payload.references)
      ? payload.references.map(normaliseReference)
      : [],
  }));
}

export function loadProfileActivities(profileId: string): Promise<{
  profile: ProfileSummary;
  activities: ProfileActivitySchedule[];
}> {
  return fetchJson<{ profile: ProfileSummary; activities: ProfileActivitySchedule[] }>(
    `profiles/${encodeURIComponent(profileId)}.json`,
  );
}
