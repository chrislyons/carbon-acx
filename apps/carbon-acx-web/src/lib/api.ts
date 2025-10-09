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
}

export interface DatasetSummary {
  datasetId: string;
  generatedAt: string | null;
  figureCount: number | null;
  manifestPath: string | null;
  manifestSha256: string | null;
}

export interface ReferenceSummary {
  referenceId: string;
  text: string;
  citation?: string | null;
  url?: string | null;
  year?: number | null;
  layer?: string;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export function loadSectors(): Promise<SectorSummary[]> {
  return fetchJson<{ sectors: SectorSummary[] }>('/api/sectors').then((data) => data.sectors);
}

export function loadSector(sectorId: string): Promise<{
  sector: SectorSummary;
  activities: ActivitySummary[];
}> {
  return fetchJson<{ sector: SectorSummary; activities: ActivitySummary[] }>(
    `/api/sectors/${encodeURIComponent(sectorId)}`,
  );
}

export function loadDataset(datasetId: string): Promise<{
  dataset: DatasetSummary;
  references: ReferenceSummary[];
}> {
  return fetchJson<{ dataset: DatasetSummary; references: ReferenceSummary[] }>(
    `/api/datasets/${encodeURIComponent(datasetId)}`,
  );
}
