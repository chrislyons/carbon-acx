import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useProfile } from '@/state/profile';
import { useLayerCatalog } from '@/lib/useLayerCatalog';
import { listFigures, type FigureManifestEntry } from '@/lib/DataLoader';
import { useACXStore } from '@/store/useACXStore';

import { OmniRegistry, resetRegistryOrder } from './registry';
import type { OmniNavigationState, OmniNodeDescriptor, OmniNodeType } from './types';

interface ReferenceMeta {
  id: string;
  label: string;
  description?: string | null;
}

interface ScenarioMeta {
  id: string;
  label: string;
  description?: string | null;
}

export type OmniScope = 'entities' | 'layers' | 'activities' | 'figures' | 'scenarios' | 'references';

export interface UseOmniNavigationResult {
  state: OmniNavigationState;
  loading: boolean;
  error: Error | null;
  ensureChildrenLoaded: (id: string) => Promise<void>;
  resolveNode: (id: string) => OmniNodeDescriptor | undefined;
  scopes: OmniScope[];
  getScopeForType: (type: OmniNodeType) => OmniScope;
  openNode: (id: string) => void;
  focusNode: (id: string) => void;
}

const ROOT_ID = 'omni:root';
const GROUP_IDS: Record<Exclude<OmniScope, 'entities'>, string> = {
  layers: 'omni:group:layers',
  activities: 'omni:group:activities',
  figures: 'omni:group:figures',
  scenarios: 'omni:group:scenarios',
  references: 'omni:group:references',
};

function normaliseLabel(label: string | null | undefined, fallback: string): string {
  if (!label) {
    return fallback;
  }
  const trimmed = label.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed;
}

function buildLayerChildren(
  registry: OmniRegistry,
  layerIds: string[],
  options: {
    layerLookup: Map<string, string>;
    activityLookup: Map<string, string[]>;
    referenceCounts: Map<string, number>;
  }
): void {
  layerIds.forEach((layerId) => {
    const label = options.layerLookup.get(layerId) ?? layerId;
    const refCount = options.referenceCounts.get(layerId);
    const nodeId = `layer:${layerId}`;
    const activities = options.activityLookup.get(layerId) ?? [];
    const description = activities.length > 0 ? `${activities.length} activities` : null;
    registry.registerNode(nodeId, GROUP_IDS.layers, 'layer', label, {
      searchableText: `${label} ${layerId}`.toLowerCase(),
      description,
      refCount,
      hasChildren: activities.length > 0,
      isLoaded: activities.length > 0,
      metadata: { layerId },
    });
    if (activities.length > 0) {
      const children = activities.map((activityId) => {
        const activityLabel = normaliseLabel(activityId.split('.').join(' › '), activityId);
        const activityNodeId = `activity:${activityId}`;
        registry.registerNode(activityNodeId, nodeId, 'activity', activityLabel, {
          searchableText: `${activityLabel} ${activityId}`.toLowerCase(),
          metadata: { activityId, layerId },
        });
        return activityNodeId;
      });
      registry.setChildren(nodeId, children);
    }
  });
}

function buildActivityLookup(audit: ReturnType<typeof useLayerCatalog>['audit']): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const entries = audit?.activities_by_layer ?? {};
  Object.entries(entries).forEach(([layerId, payload]) => {
    const activities = payload?.activities ?? [];
    const ids = activities
      ?.map((activity) => activity?.id ?? activity?.activity_id)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
    if (ids && ids.length > 0) {
      map.set(layerId, ids);
    }
  });
  return map;
}

function buildReferenceCounts(manifest: ReturnType<typeof useProfile>['result']): Map<string, number> {
  const counts = new Map<string, number>();
  const references = manifest?.manifest?.layer_references;
  if (references && typeof references === 'object') {
    Object.entries(references).forEach(([layerId, value]) => {
      if (!layerId) {
        return;
      }
      if (Array.isArray(value)) {
        counts.set(layerId, value.length);
        return;
      }
      if (value && typeof value === 'object') {
        const arrayValue = (value as { references?: unknown }).references;
        if (Array.isArray(arrayValue)) {
          counts.set(layerId, arrayValue.length);
        }
      }
    });
  }
  const citationKeys = manifest?.manifest?.layer_citation_keys;
  if (citationKeys && typeof citationKeys === 'object') {
    Object.entries(citationKeys).forEach(([layerId, value]) => {
      if (!Array.isArray(value)) {
        return;
      }
      const existing = counts.get(layerId) ?? 0;
      counts.set(layerId, Math.max(existing, value.length));
    });
  }
  return counts;
}

function buildScenarioMeta(manifest: ReturnType<typeof useProfile>['result']): ScenarioMeta[] {
  const overrides = manifest?.manifest?.overrides ?? {};
  return Object.keys(overrides)
    .filter((id) => typeof id === 'string' && id.trim().length > 0)
    .map((id) => ({ id, label: id.split('.').join(' › ') }));
}

function buildReferenceMeta(manifest: ReturnType<typeof useProfile>['result']): ReferenceMeta[] {
  const references = manifest?.references ?? [];
  return references
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => ({ id, label: id }));
}

function getScopeForType(type: OmniNodeType): OmniScope {
  switch (type) {
    case 'layer':
      return 'layers';
    case 'activity':
      return 'activities';
    case 'figure':
      return 'figures';
    case 'scenario':
      return 'scenarios';
    case 'reference':
      return 'references';
    default:
      return 'entities';
  }
}

interface BuildStateOptions {
  layerLookup: Map<string, string>;
  activityLookup: Map<string, string[]>;
  referenceCounts: Map<string, number>;
  scenarioMeta: ScenarioMeta[];
  referenceMeta: ReferenceMeta[];
  figures: FigureManifestEntry[] | null;
}

function createNavigationState(options: BuildStateOptions): OmniNavigationState {
  resetRegistryOrder();
  const registry = new OmniRegistry();
  registry.ensureRoot(ROOT_ID, 'Navigation');

  (Object.keys(GROUP_IDS) as (keyof typeof GROUP_IDS)[]).forEach((key) => {
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    registry.registerNode(GROUP_IDS[key], ROOT_ID, 'group', label, {
      hasChildren: true,
      isLoaded: key !== 'figures' && key !== 'references' ? true : (key === 'figures' ? Boolean(options.figures) : options.referenceMeta.length > 0),
    });
  });

  buildLayerChildren(registry, Array.from(options.layerLookup.keys()), {
    layerLookup: options.layerLookup,
    activityLookup: options.activityLookup,
    referenceCounts: options.referenceCounts,
  });

  const allActivities = Array.from(options.activityLookup.values()).flat();
  allActivities.forEach((activityId) => {
    const activityLabel = normaliseLabel(activityId.split('.').join(' › '), activityId);
    registry.registerNode(`activity:${activityId}`, GROUP_IDS.activities, 'activity', activityLabel, {
      searchableText: `${activityLabel} ${activityId}`.toLowerCase(),
      metadata: { activityId },
    });
  });
  if (allActivities.length > 0) {
    registry.setChildren(
      GROUP_IDS.activities,
      allActivities.map((activityId) => `activity:${activityId}`)
    );
  }

  options.scenarioMeta.forEach((entry) => {
    registry.registerNode(`scenario:${entry.id}`, GROUP_IDS.scenarios, 'scenario', entry.label, {
      searchableText: `${entry.label} ${entry.id}`.toLowerCase(),
      metadata: { scenarioId: entry.id },
    });
  });
  if (options.scenarioMeta.length > 0) {
    registry.setChildren(
      GROUP_IDS.scenarios,
      options.scenarioMeta.map((entry) => `scenario:${entry.id}`)
    );
  }

  options.referenceMeta.forEach((entry) => {
    registry.registerNode(`reference:${entry.id}`, GROUP_IDS.references, 'reference', entry.label, {
      searchableText: `${entry.label}`.toLowerCase(),
      metadata: { referenceId: entry.id },
    });
  });
  if (options.referenceMeta.length > 0) {
    registry.setChildren(
      GROUP_IDS.references,
      options.referenceMeta.map((entry) => `reference:${entry.id}`)
    );
  }

  if (options.figures) {
    options.figures.forEach((entry) => {
      const id = typeof entry.figure_id === 'string' ? entry.figure_id : '';
      if (!id) {
        return;
      }
      const label = normaliseLabel((entry as { title?: string }).title ?? id, id);
      registry.registerNode(`figure:${id}`, GROUP_IDS.figures, 'figure', label, {
        searchableText: `${label} ${id}`.toLowerCase(),
        metadata: { figureId: id },
      });
    });
    if (options.figures.length > 0) {
      registry.setChildren(
        GROUP_IDS.figures,
        options.figures
          .map((entry) => entry.figure_id)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          .map((id) => `figure:${id}`)
      );
    }
  }

  return registry.finalise();
}

export function useOmniNavigation(): UseOmniNavigationResult {
  const { layers, audit } = useLayerCatalog();
  const profile = useProfile();
  const setFigureId = useACXStore((state) => state.setFigureId);
  const setSelectedLayers = useACXStore((state) => state.setSelectedLayers);
  const setFocusMode = useACXStore((state) => state.setFocusMode);

  const activityLookup = useMemo(() => buildActivityLookup(audit), [audit]);
  const layerLabelLookup = useMemo(() => {
    const map = new Map<string, string>();
    layers.forEach((layer) => {
      if (layer?.id) {
        map.set(layer.id, normaliseLabel(layer.title, layer.id));
      }
    });
    return map;
  }, [layers]);
  const referenceCounts = useMemo(() => buildReferenceCounts(profile.result), [profile.result]);
  const scenarioMeta = useMemo(() => buildScenarioMeta(profile.result), [profile.result]);
  const referenceMeta = useMemo(() => buildReferenceMeta(profile.result), [profile.result]);

  const [figures, setFigures] = useState<FigureManifestEntry[] | null>(null);
  const [figureError, setFigureError] = useState<Error | null>(null);
  const [figureLoading, setFigureLoading] = useState(false);

  const [state, setState] = useState<OmniNavigationState>(() =>
    createNavigationState({
      layerLookup: layerLabelLookup,
      activityLookup,
      referenceCounts,
      scenarioMeta,
      referenceMeta,
      figures: null,
    })
  );

  useEffect(() => {
    setState(
      createNavigationState({
        layerLookup: layerLabelLookup,
        activityLookup,
        referenceCounts,
        scenarioMeta,
        referenceMeta,
        figures,
      })
    );
  }, [activityLookup, layerLabelLookup, referenceCounts, scenarioMeta, referenceMeta, figures]);

  const pendingLoads = useRef(new Map<string, Promise<void>>());

  const ensureChildrenLoaded = useCallback(
    async (id: string) => {
      const node = state.nodes.get(id);
      if (!node || node.isLoaded) {
        return;
      }
      if (pendingLoads.current.has(id)) {
        await pendingLoads.current.get(id);
        return;
      }
      if (id === GROUP_IDS.figures) {
        const promise = (async () => {
          try {
            setFigureLoading(true);
            const payload = await listFigures();
            setFigures(payload);
            setFigureError(null);
          } catch (error) {
            const resolved = error instanceof Error ? error : new Error(String(error));
            setFigureError(resolved);
          } finally {
            setFigureLoading(false);
          }
        })();
        pendingLoads.current.set(id, promise);
        await promise;
        pendingLoads.current.delete(id);
      }
    },
    [state.nodes]
  );

  const openNode = useCallback(
    (id: string) => {
      if (id.startsWith('layer:')) {
        const layerId = id.slice('layer:'.length);
        const next = new Set(profile.activeLayers);
        next.add(layerId);
        setSelectedLayers(next);
      } else if (id.startsWith('activity:')) {
        const activityId = id.slice('activity:'.length);
        console.debug('Activity selected', activityId);
      } else if (id.startsWith('figure:')) {
        const figureId = id.slice('figure:'.length);
        setFigureId(figureId);
      } else if (id.startsWith('scenario:')) {
        setFocusMode(true);
      }
    },
    [profile.activeLayers, setFigureId, setFocusMode, setSelectedLayers]
  );

  const focusNode = useCallback(
    (id: string) => {
      if (typeof window === 'undefined') {
        return;
      }
      const target = document.getElementById('main');
      if (target instanceof HTMLElement) {
        target.focus({ preventScroll: true });
      }
      openNode(id);
    },
    [openNode]
  );

  return {
    state,
    loading: figureLoading,
    error: figureError,
    ensureChildrenLoaded,
    resolveNode: (id) => state.nodes.get(id),
    scopes: ['entities', 'layers', 'activities', 'figures', 'scenarios', 'references'],
    getScopeForType,
    openNode,
    focusNode,
  };
}
