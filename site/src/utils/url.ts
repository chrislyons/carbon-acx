import { PRIMARY_LAYER_ID } from '../state/constants';
import type { EmissionPeriod, EmissionScale } from '../store/useACXStore';

export interface ParsedACXUrlState {
  figureId: string | null;
  layers: string[];
  scale: EmissionScale;
  period: EmissionPeriod;
}

export interface SerializableACXUrlState {
  figureId?: string | null;
  layers?: Iterable<string> | null;
  scale?: EmissionScale;
  period?: EmissionPeriod;
}

const DEFAULT_SCALE: EmissionScale = 'total';
const DEFAULT_PERIOD: EmissionPeriod = 'annual';

function normaliseSearch(search: string): URLSearchParams {
  if (typeof search !== 'string' || search.length === 0) {
    return new URLSearchParams();
  }
  const input = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(input);
}

function sanitiseId(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseScale(value: string | null): EmissionScale {
  if (!value) {
    return DEFAULT_SCALE;
  }
  const normalised = value.trim().toLowerCase();
  return normalised === 'per_capita' ? 'per_capita' : DEFAULT_SCALE;
}

function parsePeriod(value: string | null): EmissionPeriod {
  if (!value) {
    return DEFAULT_PERIOD;
  }
  const normalised = value.trim().toLowerCase();
  return normalised === 'monthly' ? 'monthly' : DEFAULT_PERIOD;
}

function parseLayers(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  values.forEach((value) => {
    value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .forEach((layer) => {
        if (seen.has(layer)) {
          return;
        }
        seen.add(layer);
        ordered.push(layer);
      });
  });
  return ordered;
}

export function parseACXStateFromSearch(search: string): ParsedACXUrlState {
  const params = normaliseSearch(search);
  const figure = sanitiseId(params.get('figure')) ?? sanitiseId(params.get('id'));
  const layerValues: string[] = [];
  const legacyLayers = params.get('layers');
  if (legacyLayers) {
    layerValues.push(legacyLayers);
  }
  params.getAll('layer').forEach((value) => {
    layerValues.push(value);
  });
  const layers = parseLayers(layerValues);
  const scale = parseScale(params.get('scale'));
  const period = parsePeriod(params.get('period'));
  return { figureId: figure, layers, scale, period };
}

function applyLayers(params: URLSearchParams, layers: Iterable<string> | null | undefined): void {
  params.delete('layer');
  params.delete('layers');
  if (!layers) {
    return;
  }
  const unique = new Set<string>();
  for (const value of layers) {
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed === PRIMARY_LAYER_ID) {
      continue;
    }
    if (unique.has(trimmed)) {
      continue;
    }
    unique.add(trimmed);
  }
  if (unique.size === 0) {
    return;
  }
  params.set('layer', Array.from(unique).join(','));
}

export function buildSearchFromState(
  state: SerializableACXUrlState,
  existingSearch: string = ''
): string {
  const params = normaliseSearch(existingSearch);
  params.delete('figure');
  params.delete('id');
  params.delete('scale');
  params.delete('period');
  applyLayers(params, state.layers ?? null);

  const figure = sanitiseId(state.figureId ?? null);
  if (figure) {
    params.set('figure', figure);
  }

  const scale = state.scale ?? DEFAULT_SCALE;
  if (scale !== DEFAULT_SCALE) {
    params.set('scale', scale);
  } else {
    params.delete('scale');
  }

  const period = state.period ?? DEFAULT_PERIOD;
  if (period !== DEFAULT_PERIOD) {
    params.set('period', period);
  } else {
    params.delete('period');
  }

  const search = params.toString();
  return search.length > 0 ? `?${search}` : '';
}
