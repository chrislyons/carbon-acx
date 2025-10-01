import { useEffect, useState } from 'react';

import { ARTIFACTS } from '../basePath';

export interface LayerDescriptor {
  id: string;
  title: string;
  summary?: string;
  icon?: string | null;
  optional?: boolean;
  examples?: string[];
}

export interface LayerAuditActivity {
  id: string;
  name: string;
  category?: string;
}

export interface LayerAuditActivities {
  count?: number;
  activities?: LayerAuditActivity[];
}

export interface LayerAuditOperations {
  count?: number;
  examples?: string[];
  missing_activity_ids?: string[];
}

export interface LayerAuditCoverage {
  activities?: number;
  with_emission_factors?: number;
  coverage_ratio?: number;
  missing_activity_ids?: string[];
}

export interface LayerAuditSummary {
  id: string;
  title?: string;
  summary?: string;
  optional?: boolean;
  icon?: string | null;
  ui_configured?: boolean;
  activities?: number;
  operations?: number;
  emission_factor_coverage?: LayerAuditCoverage;
  has_references?: boolean;
}

export interface LayerAuditReport {
  generated_at?: string;
  layers_present?: LayerAuditSummary[];
  activities_by_layer?: Record<string, LayerAuditActivities>;
  ops_by_layer?: Record<string, LayerAuditOperations>;
  ef_coverage?: Record<string, LayerAuditCoverage>;
  missing_icons?: { layer: string; expected_path: string }[];
  missing_refs?: string[];
  seeded_not_configured?: string[];
}

interface LayerCatalogState {
  layers: LayerDescriptor[];
  audit: LayerAuditReport | null;
}

const INITIAL_STATE: LayerCatalogState = { layers: [], audit: null };

let cachedData: LayerCatalogState | null = null;
let cachedError: Error | null = null;
let cachedPromise: Promise<LayerCatalogState> | null = null;

function normaliseLayerDescriptor(entry: unknown): LayerDescriptor | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const rawId = record.id;
  if (typeof rawId !== 'string' || !rawId.trim()) {
    return null;
  }
  const layer: LayerDescriptor = {
    id: rawId.trim(),
    title: typeof record.title === 'string' && record.title.trim() ? record.title.trim() : rawId.trim(),
    summary: typeof record.summary === 'string' ? record.summary.trim() : undefined,
    icon: typeof record.icon === 'string' && record.icon.trim() ? record.icon.trim() : undefined,
    optional: typeof record.optional === 'boolean' ? record.optional : undefined,
    examples: Array.isArray(record.examples)
      ? record.examples
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter((value) => value.length > 0)
      : undefined
  };
  return layer;
}

function normaliseSnippet(value: string, maxLength = 120) {
  const snippet = value.replace(/\s+/g, ' ').trim();
  return snippet.length > maxLength ? `${snippet.slice(0, maxLength)}…` : snippet;
}

async function parseJsonResponse(response: Response, resource: string) {
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch (error) {
    const contentType = response.headers.get('content-type') ?? 'unknown content-type';
    const snippet = normaliseSnippet(body);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to parse ${resource} as JSON (${message}). Content-Type: ${contentType}. Body: ${snippet}`
    );
  }
}

async function fetchCatalog(): Promise<LayerCatalogState> {
  const basePath = ARTIFACTS();
  const layersResponse = await fetch(`${basePath}/layers.json`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  if (!layersResponse.ok) {
    throw new Error(`Unable to load layers.json (status ${layersResponse.status})`);
  }
  const rawLayers = await parseJsonResponse(layersResponse, 'layers.json');
  if (!Array.isArray(rawLayers)) {
    throw new Error('layers.json must contain an array');
  }
  const layers = rawLayers
    .map(normaliseLayerDescriptor)
    .filter((entry): entry is LayerDescriptor => entry !== null);

  let audit: LayerAuditReport | null = null;
  try {
    const auditResponse = await fetch(`${basePath}/audit_report.json`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (auditResponse.ok) {
      const payload = await parseJsonResponse(auditResponse, 'audit_report.json');
      if (payload && typeof payload === 'object') {
        audit = payload as LayerAuditReport;
      }
    }
  } catch (error) {
    console.warn('Layer audit report unavailable', error);
  }

  return { layers, audit };
}

export interface UseLayerCatalogResult {
  layers: LayerDescriptor[];
  audit: LayerAuditReport | null;
  loading: boolean;
  error: Error | null;
}

export function useLayerCatalog(): UseLayerCatalogResult {
  const [state, setState] = useState<UseLayerCatalogResult>(() => {
    if (cachedData) {
      return { layers: cachedData.layers, audit: cachedData.audit, loading: false, error: null };
    }
    if (cachedError) {
      return { layers: INITIAL_STATE.layers, audit: INITIAL_STATE.audit, loading: false, error: cachedError };
    }
    return { layers: INITIAL_STATE.layers, audit: INITIAL_STATE.audit, loading: true, error: null };
  });

  useEffect(() => {
    if (cachedData) {
      setState({ layers: cachedData.layers, audit: cachedData.audit, loading: false, error: null });
      return;
    }
    if (cachedError) {
      setState({ layers: INITIAL_STATE.layers, audit: INITIAL_STATE.audit, loading: false, error: cachedError });
      return;
    }
    let cancelled = false;
    const promise = cachedPromise ?? fetchCatalog();
    cachedPromise = promise;
    promise
      .then((data) => {
        cachedData = data;
        cachedError = null;
        if (!cancelled) {
          setState({ layers: data.layers, audit: data.audit, loading: false, error: null });
        }
      })
      .catch((error) => {
        const resolvedError = error instanceof Error ? error : new Error(String(error));
        cachedError = resolvedError;
        cachedData = null;
        cachedPromise = null;
        if (!cancelled) {
          setState({ layers: INITIAL_STATE.layers, audit: INITIAL_STATE.audit, loading: false, error: resolvedError });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
