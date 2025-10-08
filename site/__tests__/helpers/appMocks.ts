import { act } from 'react';
import { vi } from 'vitest';

import type { LayerAuditReport, LayerDescriptor } from '../../src/lib/useLayerCatalog';
import type { LoadedFigureData, FigureManifestEntry } from '../../src/lib/DataLoader';

export const mockLayers: LayerDescriptor[] = [
  {
    id: 'professional',
    title: 'Professional Services',
    summary: 'Knowledge workers with hybrid schedules.',
    icon: null
  },
  {
    id: 'transport',
    title: 'Transport Services',
    summary: 'Fleet and logistics activities.',
    icon: null
  }
];

const mockAudit: LayerAuditReport = {
  activities_by_layer: {
    professional: {
      count: 2,
      activities: [
        { id: 'act-1', name: 'Client delivery', category: 'logistics' },
        { id: 'act-2', name: 'Knowledge tooling', category: 'software' }
      ]
    },
    transport: {
      count: 1,
      activities: [{ id: 'act-3', name: 'Freight routing', category: 'freight' }]
    }
  },
  ef_coverage: {
    professional: { activities: 3, with_emission_factors: 3, coverage_ratio: 1 },
    transport: { activities: 2, with_emission_factors: 2, coverage_ratio: 1 }
  },
  ops_by_layer: {
    professional: { count: 3 },
    transport: { count: 2 }
  },
  hidden_in_ui: []
};

export const computeMock = vi.fn(async () => ({
  manifest: {
    layers: mockLayers.map((layer) => layer.id),
    dataset_version: 'test-dataset',
    sources: ['Mock Source']
  },
  figures: {
    stacked: { data: [], layers: mockLayers.map((layer) => layer.id), citation_keys: [] },
    bubble: { data: [], layers: mockLayers.map((layer) => layer.id), citation_keys: [] },
    sankey: {
      data: { nodes: [], links: [] },
      layers: mockLayers.map((layer) => layer.id),
      citation_keys: []
    },
    feedback: {
      data: { nodes: [], links: [] },
      layers: mockLayers.map((layer) => layer.id),
      citation_keys: []
    }
  },
  references: ['Mock Reference']
}));

const manifestEntry: FigureManifestEntry = {
  figure_id: 'mock.stacked',
  figure_path: 'mock/stacked.json',
  figure_method: 'figures.stacked'
};

const loadedFigure: LoadedFigureData = {
  manifest: manifestEntry,
  payload: {
    figure_id: 'mock.stacked',
    figure_method: 'figures.stacked',
    data: []
  },
  references: ['Mock Reference'],
  citationKeys: ['ref-1'],
  referenceLookup: new Map([
    ['ref-1', 0]
  ])
};

export const listFiguresMock = vi.fn(async () => [manifestEntry]);
export const loadFigureMock = vi.fn(async () => loadedFigure);

vi.mock('../../src/lib/useLayerCatalog', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/useLayerCatalog')>(
    '../../src/lib/useLayerCatalog'
  );
  return {
    ...actual,
    useLayerCatalog: () => ({
      layers: mockLayers,
      audit: mockAudit,
      loading: false,
      error: null
    })
  };
});

vi.mock('../../src/lib/api', () => ({
  USE_COMPUTE_API: false,
  compute: computeMock
}));

vi.mock('../../src/lib/DataLoader', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/DataLoader')>(
    '../../src/lib/DataLoader'
  );
  return {
    ...actual,
    listFigures: listFiguresMock,
    loadFigure: loadFigureMock
  };
});

export async function flushProfileEffects(): Promise<void> {
  try {
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
  } catch {
    // ignore when real timers are in use
  }
  await act(async () => {
    await Promise.resolve();
  });
}
