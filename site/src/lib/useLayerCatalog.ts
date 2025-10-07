import { useEffect, useState } from 'react';

import { artifactUrl } from './paths';
import { fetchJSON, FetchJSONError } from './fetchJSON';

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
  layer_type?: string | null;
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
  hidden_in_ui?: string[];
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

async function fetchCatalog(): Promise<LayerCatalogState> {
  const layersUrl = artifactUrl('layers.json');
  const rawLayers = await fetchJSON<unknown>(layersUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  if (!Array.isArray(rawLayers)) {
    throw new Error('layers.json must contain an array');
  }
  const layers = rawLayers
    .map(normaliseLayerDescriptor)
    .filter((entry): entry is LayerDescriptor => entry !== null);

  let audit: LayerAuditReport | null = null;
  try {
    const auditUrl = artifactUrl('audit_report.json');
    const payload = await fetchJSON<unknown>(auditUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (payload && typeof payload === 'object') {
      audit = payload as LayerAuditReport;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof FetchJSONError) {
      console.warn('Layer audit report unavailable', message, error.diag);
    } else {
      console.warn('Layer audit report unavailable', message);
    }
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
