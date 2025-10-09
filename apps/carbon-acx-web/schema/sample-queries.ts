import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const dataDir = path.join(repoRoot, 'data');
const artifactsDir = path.join(repoRoot, 'dist', 'artifacts');

interface CsvRecord {
  [key: string]: string | null;
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function parseCsv(content: string): CsvRecord[] {
  const rows: string[][] = [];
  const cleaned = stripBom(content);
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];

    if (char === '"') {
      const nextChar = cleaned[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && cleaned[i + 1] === '\n') {
        i += 1;
      }
      row.push(current);
      current = '';
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.trim().length > 0)) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const [header, ...dataRows] = rows;
  const headers = header.map((cell) => cell.trim());
  return dataRows.map((cells) => {
    const record: CsvRecord = {};
    headers.forEach((key, index) => {
      const value = index < cells.length ? cells[index] : '';
      const trimmed = value.trim();
      record[key] = trimmed.length > 0 ? trimmed : null;
    });
    return record;
  });
}

async function loadCsvRecords(fileName: string): Promise<CsvRecord[]> {
  const filePath = path.join(dataDir, fileName);
  const content = await readFile(filePath, 'utf-8');
  return parseCsv(content);
}

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

async function loadManifestIndex(): Promise<Record<string, unknown> | null> {
  try {
    const filePath = path.join(artifactsDir, 'manifest.json');
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    return null;
  }
}

async function loadDatasetManifest(): Promise<Record<string, unknown> | null> {
  const manifestIndex = await loadManifestIndex();
  if (!manifestIndex) {
    return null;
  }
  const datasetManifest = manifestIndex['dataset_manifest'];
  if (!datasetManifest || typeof datasetManifest !== 'object') {
    return null;
  }
  const manifestObj = datasetManifest as Record<string, unknown>;
  const manifestPath = manifestObj['path'];
  if (typeof manifestPath !== 'string') {
    return null;
  }
  try {
    const filePath = path.join(artifactsDir, manifestPath);
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    return null;
  }
}

export async function listSectors(): Promise<SectorSummary[]> {
  const records = await loadCsvRecords('sectors.csv');
  return records.map((record) => ({
    id: record['sector_id'] ?? '',
    name: record['name'] ?? '',
    description: record['description'],
  }));
}

export async function getSector(id: string): Promise<SectorSummary | null> {
  const sectors = await listSectors();
  return sectors.find((sector) => sector.id === id) ?? null;
}

export async function listActivities(sectorId: string): Promise<ActivitySummary[]> {
  const records = await loadCsvRecords('activities.csv');
  return records
    .filter((record) => (record['sector_id'] ?? '').toLowerCase() === sectorId.toLowerCase())
    .map((record) => ({
      id: record['activity_id'] ?? '',
      sectorId: record['sector_id'] ?? '',
      layerId: record['layer_id'] ?? null,
      category: record['category'] ?? null,
      name: record['name'] ?? null,
      defaultUnit: record['default_unit'] ?? null,
      description: record['description'] ?? null,
    }));
}

export async function getDataset(id: string): Promise<DatasetSummary | null> {
  const manifest = await loadDatasetManifest();
  if (!manifest) {
    return null;
  }
  const datasetId = typeof manifest['dataset_id'] === 'string' ? manifest['dataset_id'] : null;
  if (!datasetId || datasetId !== id) {
    return null;
  }
  const generatedAt = typeof manifest['generated_at'] === 'string' ? manifest['generated_at'] : null;
  const figureCount = typeof manifest['figure_count'] === 'number' ? manifest['figure_count'] : null;

  const manifestIndex = await loadManifestIndex();
  let manifestPath: string | null = null;
  let manifestSha256: string | null = null;
  if (manifestIndex && manifestIndex['dataset_manifest'] && typeof manifestIndex['dataset_manifest'] === 'object') {
    const datasetManifest = manifestIndex['dataset_manifest'] as Record<string, unknown>;
    if (typeof datasetManifest['path'] === 'string') {
      manifestPath = datasetManifest['path'];
    }
    if (typeof datasetManifest['sha256'] === 'string') {
      manifestSha256 = datasetManifest['sha256'];
    }
  }

  return {
    datasetId,
    generatedAt,
    figureCount,
    manifestPath,
    manifestSha256,
  };
}

async function loadSourcesById(): Promise<Map<string, CsvRecord>> {
  const sources = await loadCsvRecords('sources.csv');
  const map = new Map<string, CsvRecord>();
  for (const source of sources) {
    const sourceId = source['source_id'];
    if (sourceId) {
      map.set(sourceId, source);
    }
  }
  return map;
}

function normaliseKey(value: string): string {
  return value.trim().toLowerCase();
}

export async function listReferences(datasetId: string): Promise<ReferenceSummary[]> {
  const dataset = await getDataset(datasetId);
  if (!dataset) {
    return [];
  }

  const manifestIndex = await loadManifestIndex();
  const manifest = await loadDatasetManifest();
  const sourcesById = await loadSourcesById();

  const targetKeys = new Set<string>();
  if (manifest) {
    const layerKeys = manifest['layer_citation_keys'];
    if (layerKeys && typeof layerKeys === 'object') {
      for (const value of Object.values(layerKeys as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          for (const entry of value) {
            if (typeof entry === 'string') {
              targetKeys.add(normaliseKey(entry));
            }
          }
        }
      }
    }
  }

  const results: ReferenceSummary[] = [];
  const seen = new Set<string>();

  if (manifestIndex && Array.isArray(manifestIndex['figures'])) {
    for (const figure of manifestIndex['figures'] as Array<Record<string, unknown>>) {
      const references = figure['references'];
      if (!Array.isArray(references)) {
        continue;
      }
      for (const entry of references) {
        if (!entry || typeof entry !== 'object') {
          continue;
        }
        const refObj = entry as Record<string, unknown>;
        const refPath = typeof refObj['path'] === 'string' ? refObj['path'] : null;
        if (!refPath || !refPath.startsWith('references/')) {
          continue;
        }
        const referenceId = refPath.replace(/^references\//, '').replace(/\.txt$/i, '');
        if (seen.has(referenceId)) {
          continue;
        }
        seen.add(referenceId);
        try {
          const content = await readFile(path.join(artifactsDir, refPath), 'utf-8');
          const baseSummary: ReferenceSummary = {
            referenceId,
            text: content.trim(),
          };
          const sourceRecord = sourcesById.get(referenceId);
          if (sourceRecord) {
            baseSummary.citation = sourceRecord['ieee_citation'];
            baseSummary.url = sourceRecord['url'];
            const yearValue = sourceRecord['year'];
            baseSummary.year = yearValue ? Number.parseInt(yearValue, 10) || null : null;
          }
          results.push(baseSummary);
        } catch (error) {
          // Ignore missing reference files.
        }
      }
    }
  }

  if (results.length === 0 && targetKeys.size > 0) {
    for (const [sourceId, record] of sourcesById.entries()) {
      if (!targetKeys.has(normaliseKey(sourceId))) {
        continue;
      }
      if (seen.has(sourceId)) {
        continue;
      }
      seen.add(sourceId);
      results.push({
        referenceId: sourceId,
        text: record['ieee_citation'] ?? sourceId,
        citation: record['ieee_citation'],
        url: record['url'],
        year: record['year'] ? Number.parseInt(record['year'], 10) || null : null,
      });
    }
  }

  if (results.length === 0) {
    let count = 0;
    for (const [sourceId, record] of sourcesById.entries()) {
      if (count >= 10) {
        break;
      }
      if (seen.has(sourceId)) {
        continue;
      }
      seen.add(sourceId);
      results.push({
        referenceId: sourceId,
        text: record['ieee_citation'] ?? sourceId,
        citation: record['ieee_citation'],
        url: record['url'],
        year: record['year'] ? Number.parseInt(record['year'], 10) || null : null,
      });
      count += 1;
    }
  }

  if (manifest) {
    const layerReferences = manifest['layer_references'];
    if (layerReferences && typeof layerReferences === 'object') {
      for (const [layer, values] of Object.entries(layerReferences as Record<string, unknown>)) {
        if (!Array.isArray(values)) {
          continue;
        }
        for (const value of values) {
          if (typeof value !== 'string') {
            continue;
          }
          results.push({
            referenceId: `${layer}:${value.slice(0, 20).replace(/\s+/g, ' ')}`,
            text: value,
            layer,
          });
        }
      }
    }
  }

  return results;
}
