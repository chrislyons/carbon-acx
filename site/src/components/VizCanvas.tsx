import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { StageId } from './Layout';

import { USE_COMPUTE_API } from '../lib/api';
import { useLayerCatalog } from '../lib/useLayerCatalog';
import { formatEmission } from '../lib/format';
import { buildReferenceLookup } from '../lib/references';
import { useProfile } from '../state/profile';

import { Bubble, BubbleDatum } from './Bubble';
import { ExportMenu } from './ExportMenu';
import { Sankey, SankeyData, SankeyLink, SankeyNode } from './Sankey';
import { Stacked, StackedDatum } from './Stacked';

interface ActivityRow {
  id: string;
  label: string;
  emissions: number;
}

function resolveActivities(rows: BubbleDatum[]): {
  topActivities: ActivityRow[];
  total: number | null;
  count: number;
} {
  const aggregated = rows
    .map((entry, index) => {
      const row = (entry as Record<string, unknown>) ?? {};
      const rawId = row.activity_id;
      const id = typeof rawId === 'string' && rawId.trim().length > 0 ? rawId : `activity-${index + 1}`;
      const nameCandidate = row.activity_name;
      const name =
        typeof nameCandidate === 'string' && nameCandidate.trim().length > 0
          ? nameCandidate
          : id;
      const legacy = row.annual_emissions_g;
      const values = (row.values as Record<string, unknown> | undefined) ?? undefined;
      const mean = values && typeof values.mean === 'number' ? values.mean : null;
      const emissions =
        typeof legacy === 'number' && Number.isFinite(legacy)
          ? legacy
          : typeof mean === 'number' && Number.isFinite(mean)
            ? mean
            : 0;
      return {
        id,
        label: name,
        emissions
      } satisfies ActivityRow;
    })
    .filter((row) => row.emissions > 0)
    .sort((a, b) => b.emissions - a.emissions);

  const topActivities = aggregated.slice(0, 5);
  const total = aggregated.reduce((sum, row) => sum + row.emissions, 0);
  return { topActivities, total: aggregated.length > 0 ? total : null, count: aggregated.length };
}

function toLayerId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return null;
}

function filterStackedByLayers(
  data: readonly StackedDatum[],
  activeLayers: ReadonlySet<string>
): StackedDatum[] {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  const aggregates = new Map<
    string,
    {
      category: string | null;
      mean: number;
      low: number;
      hasLow: boolean;
      high: number;
      hasHigh: boolean;
      units: Record<string, string | null> | null;
      citationKeys: Set<string>;
      hoverIndices: Set<number>;
    }
  >();

  const includeAll = activeLayers.size === 0;

  data.forEach((row) => {
    const layer = toLayerId(row?.layer_id);
    if (layer && !includeAll && !activeLayers.has(layer)) {
      return;
    }
    const category = row?.category ?? null;
    const key = category ?? '__null__';
    let bucket = aggregates.get(key);
    if (!bucket) {
      bucket = {
        category,
        mean: 0,
        low: 0,
        hasLow: false,
        high: 0,
        hasHigh: false,
        units: row?.units ?? null,
        citationKeys: new Set<string>(),
        hoverIndices: new Set<number>()
      };
      aggregates.set(key, bucket);
    }
    const values = row?.values ?? undefined;
    const mean = typeof values?.mean === 'number' && Number.isFinite(values.mean) ? values.mean : null;
    if (mean !== null) {
      bucket.mean += mean;
    }
    const low = typeof values?.low === 'number' && Number.isFinite(values.low) ? values.low : null;
    if (low !== null) {
      bucket.low += low;
      bucket.hasLow = true;
    }
    const high = typeof values?.high === 'number' && Number.isFinite(values.high) ? values.high : null;
    if (high !== null) {
      bucket.high += high;
      bucket.hasHigh = true;
    }
    const keys = Array.isArray(row?.citation_keys) ? row.citation_keys : [];
    keys.forEach((keyValue) => {
      if (typeof keyValue === 'string' && keyValue.trim()) {
        bucket?.citationKeys.add(keyValue);
      }
    });
    const indices = Array.isArray(row?.hover_reference_indices) ? row.hover_reference_indices : [];
    indices.forEach((index) => {
      if (typeof index === 'number' && Number.isFinite(index)) {
        bucket?.hoverIndices.add(Math.trunc(index));
      }
    });
    if (!bucket.units && row?.units) {
      bucket.units = row.units;
    }
  });

  return Array.from(aggregates.values()).map((bucket) => {
    const values: StackedDatum['values'] = { mean: bucket.mean };
    if (bucket.hasLow) {
      values.low = bucket.low;
    }
    if (bucket.hasHigh) {
      values.high = bucket.high;
    }
    return {
      category: bucket.category,
      values,
      units: bucket.units,
      citation_keys: Array.from(bucket.citationKeys),
      hover_reference_indices: Array.from(bucket.hoverIndices).sort((a, b) => a - b)
    } satisfies StackedDatum;
  });
}

function filterBubbleByLayers(
  data: readonly BubbleDatum[],
  activeLayers: ReadonlySet<string>
): BubbleDatum[] {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  const includeAll = activeLayers.size === 0;
  return data.filter((row) => {
    const layer = toLayerId(row?.layer_id);
    return !layer || includeAll || activeLayers.has(layer);
  });
}

function filterSankeyByLayers(data: SankeyData, activeLayers: ReadonlySet<string>): SankeyData {
  const rawLinks = Array.isArray(data?.links) ? (data.links as SankeyLink[]) : [];
  const includeAll = activeLayers.size === 0;
  const links = rawLinks
    .filter((link) => {
      const layer = toLayerId(link?.layer_id);
      return !layer || includeAll || activeLayers.has(layer);
    })
    .map((link) => ({ ...link }));
  const nodeIds = new Set<string>();
  links.forEach((link) => {
    if (typeof link.source === 'string') {
      nodeIds.add(link.source);
    }
    if (typeof link.target === 'string') {
      nodeIds.add(link.target);
    }
  });
  const nodes = Array.isArray(data?.nodes)
    ? data.nodes.filter((node) => typeof node?.id === 'string' && nodeIds.has(node.id))
    : [];
  return { nodes, links };
}

const UNASSIGNED_LAYER_KEY = '__unassigned__';
const UNASSIGNED_LAYER_LABEL = 'Cross-layer total';

function resolveLayerTitle(layerId: string | null, lookup: ReadonlyMap<string, string>): string {
  if (!layerId) {
    return UNASSIGNED_LAYER_LABEL;
  }
  const title = lookup.get(layerId);
  if (title && title.trim()) {
    return title;
  }
  return layerId;
}

function aggregateStackedByLayer(
  data: readonly StackedDatum[],
  activeLayers: ReadonlySet<string>,
  layerTitles: ReadonlyMap<string, string>
): StackedDatum[] {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  const includeAll = activeLayers.size === 0;
  const buckets = new Map<
    string,
    {
      layerId: string | null;
      label: string;
      mean: number;
      low: number;
      hasLow: boolean;
      high: number;
      hasHigh: boolean;
      units: Record<string, string | null> | null;
      citationKeys: Set<string>;
      hoverIndices: Set<number>;
    }
  >();
  data.forEach((row) => {
    const values = row?.values ?? undefined;
    const mean = typeof values?.mean === 'number' ? values.mean : null;
    if (mean == null || !Number.isFinite(mean) || mean <= 0) {
      return;
    }
    const layerId = toLayerId(row?.layer_id);
    if (!includeAll && layerId && !activeLayers.has(layerId)) {
      return;
    }
    const key = layerId ?? UNASSIGNED_LAYER_KEY;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        layerId,
        label: resolveLayerTitle(layerId, layerTitles),
        mean: 0,
        low: 0,
        hasLow: false,
        high: 0,
        hasHigh: false,
        units: row?.units ?? null,
        citationKeys: new Set<string>(),
        hoverIndices: new Set<number>()
      };
      buckets.set(key, bucket);
    }
    bucket.mean += mean;
    const low = typeof values?.low === 'number' ? values.low : null;
    if (low != null && Number.isFinite(low)) {
      bucket.low += low;
      bucket.hasLow = true;
    }
    const high = typeof values?.high === 'number' ? values.high : null;
    if (high != null && Number.isFinite(high)) {
      bucket.high += high;
      bucket.hasHigh = true;
    }
    if (!bucket.units && row?.units) {
      bucket.units = row.units;
    }
    const keys = Array.isArray(row?.citation_keys) ? row.citation_keys : [];
    keys.forEach((value) => {
      if (typeof value === 'string' && value.trim()) {
        bucket?.citationKeys.add(value);
      }
    });
    const indices = Array.isArray(row?.hover_reference_indices) ? row.hover_reference_indices : [];
    indices.forEach((value) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        bucket?.hoverIndices.add(Math.trunc(value));
      }
    });
  });
  const entries = Array.from(buckets.values()).filter((bucket) => bucket.mean > 0);
  entries.sort((a, b) => b.mean - a.mean);
  return entries.map((bucket) => {
    const values: StackedDatum['values'] = { mean: bucket.mean };
    if (bucket.hasLow) {
      values.low = bucket.low;
    }
    if (bucket.hasHigh) {
      values.high = bucket.high;
    }
    const citation_keys =
      bucket.citationKeys.size > 0 ? Array.from(bucket.citationKeys) : undefined;
    const hover_reference_indices =
      bucket.hoverIndices.size > 0
        ? Array.from(bucket.hoverIndices).sort((a, b) => a - b)
        : undefined;
    return {
      layer_id: bucket.layerId,
      category: bucket.label,
      values,
      units: bucket.units ?? undefined,
      citation_keys,
      hover_reference_indices
    } satisfies StackedDatum;
  });
}

function aggregateBubbleByCategory(data: readonly BubbleDatum[]): BubbleDatum[] {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  const buckets = new Map<
    string,
    {
      total: number;
      citationKeys: Set<string>;
      hoverIndices: Set<number>;
      units: Record<string, string | null> | null;
    }
  >();
  data.forEach((row) => {
    const mean = typeof row?.values?.mean === 'number' ? row.values.mean : null;
    if (mean == null || !Number.isFinite(mean) || mean <= 0) {
      return;
    }
    const category =
      typeof row?.category === 'string' && row.category ? row.category : 'Other';
    let bucket = buckets.get(category);
    if (!bucket) {
      bucket = {
        total: 0,
        citationKeys: new Set<string>(),
        hoverIndices: new Set<number>(),
        units: row?.units ?? null
      };
      buckets.set(category, bucket);
    }
    bucket.total += mean;
    if (!bucket.units && row?.units) {
      bucket.units = row.units;
    }
    const keys = Array.isArray(row?.citation_keys) ? row.citation_keys : [];
    keys.forEach((value) => {
      if (typeof value === 'string' && value.trim()) {
        bucket?.citationKeys.add(value);
      }
    });
    const indices = Array.isArray(row?.hover_reference_indices) ? row.hover_reference_indices : [];
    indices.forEach((value) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        bucket?.hoverIndices.add(Math.trunc(value));
      }
    });
  });
  const entries = Array.from(buckets.entries());
  entries.sort((a, b) => b[1].total - a[1].total);
  return entries.map(([category, bucket], index) => {
    const citation_keys =
      bucket.citationKeys.size > 0 ? Array.from(bucket.citationKeys) : undefined;
    const hover_reference_indices =
      bucket.hoverIndices.size > 0
        ? Array.from(bucket.hoverIndices).sort((a, b) => a - b)
        : undefined;
    return {
      layer_id: null,
      activity_id: `category:${category}:${index}`,
      activity_name: category,
      category,
      values: { mean: bucket.total },
      units: bucket.units ?? undefined,
      citation_keys,
      hover_reference_indices
    } satisfies BubbleDatum;
  });
}

function aggregateBubbleByLayer(
  data: readonly BubbleDatum[],
  activeLayers: ReadonlySet<string>,
  layerTitles: ReadonlyMap<string, string>
): BubbleDatum[] {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  const includeAll = activeLayers.size === 0;
  const buckets = new Map<
    string,
    {
      layerId: string | null;
      label: string;
      total: number;
      citationKeys: Set<string>;
      hoverIndices: Set<number>;
      units: Record<string, string | null> | null;
    }
  >();
  data.forEach((row) => {
    const mean = typeof row?.values?.mean === 'number' ? row.values.mean : null;
    if (mean == null || !Number.isFinite(mean) || mean <= 0) {
      return;
    }
    const layerId = toLayerId(row?.layer_id);
    if (!includeAll && layerId && !activeLayers.has(layerId)) {
      return;
    }
    const key = layerId ?? UNASSIGNED_LAYER_KEY;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        layerId,
        label: resolveLayerTitle(layerId, layerTitles),
        total: 0,
        citationKeys: new Set<string>(),
        hoverIndices: new Set<number>(),
        units: row?.units ?? null
      };
      buckets.set(key, bucket);
    }
    bucket.total += mean;
    if (!bucket.units && row?.units) {
      bucket.units = row.units;
    }
    const keys = Array.isArray(row?.citation_keys) ? row.citation_keys : [];
    keys.forEach((value) => {
      if (typeof value === 'string' && value.trim()) {
        bucket?.citationKeys.add(value);
      }
    });
    const indices = Array.isArray(row?.hover_reference_indices) ? row.hover_reference_indices : [];
    indices.forEach((value) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        bucket?.hoverIndices.add(Math.trunc(value));
      }
    });
  });
  const entries = Array.from(buckets.values()).filter((bucket) => bucket.total > 0);
  entries.sort((a, b) => b.total - a.total);
  return entries.map((bucket, index) => {
    const citation_keys =
      bucket.citationKeys.size > 0 ? Array.from(bucket.citationKeys) : undefined;
    const hover_reference_indices =
      bucket.hoverIndices.size > 0
        ? Array.from(bucket.hoverIndices).sort((a, b) => a - b)
        : undefined;
    return {
      layer_id: bucket.layerId,
      activity_id: bucket.layerId ?? `layer:${index}`,
      activity_name: bucket.label,
      category: bucket.label,
      values: { mean: bucket.total },
      units: bucket.units ?? undefined,
      citation_keys,
      hover_reference_indices
    } satisfies BubbleDatum;
  });
}

function buildLayerSankey(
  data: SankeyData,
  activeLayers: ReadonlySet<string>,
  layerTitles: ReadonlyMap<string, string>
): SankeyData {
  const links = Array.isArray(data?.links) ? (data.links as SankeyLink[]) : [];
  if (links.length === 0) {
    return { nodes: [], links: [] };
  }
  const includeAll = activeLayers.size === 0;
  const buckets = new Map<
    string,
    {
      layerId: string | null;
      label: string;
      total: number;
      citationKeys: Set<string>;
      hoverIndices: Set<number>;
    }
  >();
  links.forEach((link) => {
    const mean = typeof link?.values?.mean === 'number' ? link.values.mean : null;
    if (mean == null || !Number.isFinite(mean) || mean <= 0) {
      return;
    }
    const layerId = toLayerId(link?.layer_id);
    if (!includeAll && layerId && !activeLayers.has(layerId)) {
      return;
    }
    const key = layerId ?? UNASSIGNED_LAYER_KEY;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        layerId,
        label: resolveLayerTitle(layerId, layerTitles),
        total: 0,
        citationKeys: new Set<string>(),
        hoverIndices: new Set<number>()
      };
      buckets.set(key, bucket);
    }
    bucket.total += mean;
    const keys = Array.isArray(link?.citation_keys) ? link.citation_keys : [];
    keys.forEach((value) => {
      if (typeof value === 'string' && value.trim()) {
        bucket?.citationKeys.add(value);
      }
    });
    const indices = Array.isArray(link?.hover_reference_indices)
      ? link.hover_reference_indices
      : [];
    indices.forEach((value) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        bucket?.hoverIndices.add(Math.trunc(value));
      }
    });
  });
  const entries = Array.from(buckets.values()).filter((bucket) => bucket.total > 0);
  if (entries.length === 0) {
    return { nodes: [], links: [] };
  }
  entries.sort((a, b) => b.total - a.total);
  const sinkId = 'layer:total';
  const nodes: SankeyNode[] = entries.map((bucket, index) => ({
    id: bucket.layerId ? `layer:${bucket.layerId}` : `layer:unassigned:${index}`,
    label: bucket.label,
    type: 'category'
  }));
  nodes.push({ id: sinkId, label: 'Total footprint', type: 'activity' });
  const aggregatedLinks: SankeyLink[] = entries.map((bucket, index) => {
    const sourceId = bucket.layerId ? `layer:${bucket.layerId}` : `layer:unassigned:${index}`;
    const citation_keys =
      bucket.citationKeys.size > 0 ? Array.from(bucket.citationKeys) : undefined;
    const hover_reference_indices =
      bucket.hoverIndices.size > 0
        ? Array.from(bucket.hoverIndices).sort((a, b) => a - b)
        : undefined;
    return {
      source: sourceId,
      target: sinkId,
      layer_id: bucket.layerId,
      values: { mean: bucket.total },
      citation_keys,
      hover_reference_indices
    } satisfies SankeyLink;
  });
  return { nodes, links: aggregatedLinks };
}

function sumStackedEmissions(data: readonly StackedDatum[]): number | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  let total = 0;
  let hasValue = false;
  data.forEach((row) => {
    const mean = typeof row?.values?.mean === 'number' ? row.values.mean : null;
    if (mean != null && Number.isFinite(mean)) {
      total += mean;
      hasValue = true;
    }
  });
  return hasValue ? total : null;
}

function sumSankeyEmissions(data: SankeyData): number | null {
  const links = Array.isArray(data?.links) ? data.links : [];
  if (links.length === 0) {
    return null;
  }
  let total = 0;
  let hasValue = false;
  links.forEach((link) => {
    const mean = typeof link?.values?.mean === 'number' ? link.values.mean : null;
    if (mean != null && Number.isFinite(mean)) {
      total += mean;
      hasValue = true;
    }
  });
  return hasValue ? total : null;
}

interface TotalConsensus {
  total: number | null;
  consensus: boolean;
  breakdown: Record<string, number>;
}

function reconcileTotals({
  stacked,
  bubble,
  sankey
}: {
  stacked?: number | null;
  bubble?: number | null;
  sankey?: number | null;
}): TotalConsensus {
  const entries = (
    Object.entries({ stacked, bubble, sankey }) as Array<[
      string,
      number | null | undefined
    ]>
  ).filter(([, value]) => typeof value === 'number' && Number.isFinite(value));
  if (entries.length === 0) {
    return { total: null, consensus: true, breakdown: {} };
  }
  const [, primaryValue] = entries[0] as [string, number];
  const tolerance = Math.max(1, Math.abs(primaryValue) * 0.005);
  const consensus = entries.every(([, value]) => {
    const numeric = value as number;
    return Math.abs(numeric - primaryValue) <= tolerance;
  });
  const bestValue = consensus
    ? primaryValue
    : Math.max(...entries.map(([, value]) => value as number));
  const breakdown = entries.reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key] = value as number;
    return acc;
  }, {});
  return { total: bestValue, consensus, breakdown };
}

function resolveStatusTone(status: string): string {
  switch (status) {
    case 'loading':
      return 'text-amber-300';
    case 'success':
      return 'text-emerald-300';
    case 'error':
      return 'text-rose-300';
    default:
      return 'text-slate-300';
  }
}

function normaliseTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  loading: 'Recomputing…',
  success: 'Up to date',
  error: 'Error'
};

interface VizCanvasProps {
  stage: StageId;
}

export function VizCanvas({ stage }: VizCanvasProps): JSX.Element {
  const {
    status,
    result,
    error,
    refresh,
    primaryLayer,
    availableLayers,
    activeLayers,
    activeReferenceKeys,
    activeReferences
  } = useProfile();
  const { layers: layerCatalog } = useLayerCatalog();

  const layerTitleLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    layerCatalog.forEach((layer) => {
      if (layer?.id) {
        lookup.set(layer.id, layer.title ?? layer.id);
      }
    });
    return lookup;
  }, [layerCatalog]);

  const activeLayerSet = useMemo(() => new Set(activeLayers), [activeLayers]);
  const baseLayer = primaryLayer;

  const datasetVersion =
    typeof result?.datasetId === 'string' && result.datasetId.trim().length > 0
      ? result.datasetId
      : typeof result?.manifest?.dataset_version === 'string' && result.manifest.dataset_version
        ? result.manifest.dataset_version
        : 'unknown';
  const generatedAt = useMemo(() => {
    if (!result) {
      return null;
    }
    const manifest = result.manifest ?? {};
    const fromSnake = normaliseTimestamp((manifest as { generated_at?: unknown }).generated_at);
    if (fromSnake) {
      return fromSnake;
    }
    const fromCamel = normaliseTimestamp((manifest as { generatedAt?: unknown }).generatedAt);
    if (fromCamel) {
      return fromCamel;
    }
    return new Date().toISOString();
  }, [result]);
  const referenceCount = activeReferences.length;

  const rawStacked = (result?.figures?.stacked?.data as StackedDatum[]) ?? [];
  const rawBubble = (result?.figures?.bubble?.data as BubbleDatum[]) ?? [];
  const rawSankey = (result?.figures?.sankey?.data as SankeyData) ?? { nodes: [], links: [] };

  const stackedData = useMemo(
    () => filterStackedByLayers(rawStacked, activeLayerSet),
    [rawStacked, activeLayerSet]
  );
  const bubbleData = useMemo(
    () => filterBubbleByLayers(rawBubble, activeLayerSet),
    [rawBubble, activeLayerSet]
  );
  const sankeyData = useMemo(
    () => filterSankeyByLayers(rawSankey, activeLayerSet),
    [rawSankey, activeLayerSet]
  );

  const stageStackedData = useMemo(
    () =>
      stage === 'segment'
        ? aggregateStackedByLayer(rawStacked, activeLayerSet, layerTitleLookup)
        : stackedData,
    [stage, rawStacked, activeLayerSet, layerTitleLookup, stackedData]
  );

  const stageBubbleData = useMemo(
    () => {
      if (stage === 'activity') {
        return bubbleData;
      }
      if (stage === 'profile') {
        return aggregateBubbleByCategory(bubbleData);
      }
      return aggregateBubbleByLayer(rawBubble, activeLayerSet, layerTitleLookup);
    },
    [stage, bubbleData, rawBubble, activeLayerSet, layerTitleLookup]
  );

  const stageSankeyData = useMemo(
    () =>
      stage === 'segment'
        ? buildLayerSankey(rawSankey, activeLayerSet, layerTitleLookup)
        : sankeyData,
    [stage, rawSankey, activeLayerSet, layerTitleLookup, sankeyData]
  );

  const { total: bubbleTotal, count: focusCount, topActivities } = useMemo(
    () => resolveActivities(stageBubbleData),
    [stageBubbleData]
  );

  const stackedTotal = useMemo(() => sumStackedEmissions(stageStackedData), [stageStackedData]);
  const sankeyTotal = useMemo(() => sumSankeyEmissions(stageSankeyData), [stageSankeyData]);
  const totals = useMemo(
    () =>
      reconcileTotals({
        stacked: stackedTotal,
        bubble: bubbleTotal,
        sankey: sankeyTotal
      }),
    [stackedTotal, bubbleTotal, sankeyTotal]
  );

  useEffect(() => {
    if (!totals.consensus && Object.keys(totals.breakdown).length > 0) {
      console.warn('Visualizer totals out of sync', totals.breakdown);
    }
  }, [totals]);

  const resolvedTotal = totals.total ?? stackedTotal ?? bubbleTotal ?? sankeyTotal ?? null;

  const focusLabel =
    stage === 'segment' ? 'Segments tracked' : stage === 'profile' ? 'Categories tracked' : 'Activities tracked';
  const stackedShareLabel = stage === 'segment' ? 'segment portfolio' : 'tracked categories';
  const bubbleShareLabel =
    stage === 'segment' ? 'segment emissions' : stage === 'profile' ? 'category emissions' : 'activity emissions';
  const sankeyShareLabel = stage === 'segment' ? 'segment flow' : 'mapped flow';
  const stackedPanelTitle = stage === 'segment' ? 'Annual emissions by segment' : 'Annual emissions by category';
  const bubblePanelTitle =
    stage === 'segment'
      ? 'Segment emissions bubble chart'
      : stage === 'profile'
        ? 'Category emissions bubble chart'
        : 'Activity emissions bubble chart';
  const sankeyPanelTitle = stage === 'segment' ? 'Segment emission pathways' : 'Emission pathways';
  const stackedEmptyMessage = stage === 'segment' ? 'No segment data available.' : 'No category data available.';
  const bubbleEmptyMessage =
    stage === 'segment'
      ? 'No segment data available.'
      : stage === 'profile'
        ? 'No category data available.'
        : 'No activity data available.';
  const sankeyEmptyMessage = stage === 'segment' ? 'No segment flow data available.' : 'No sankey data available.';

  const stackedSummary = useMemo(() => {
    const rows = Array.isArray(stageStackedData)
      ? stageStackedData
          .map((row, index) => {
            const values = row?.values ?? undefined;
            const mean = typeof values?.mean === 'number' ? values.mean : null;
            if (mean == null || !Number.isFinite(mean) || mean <= 0) {
              return null;
            }
            const category = typeof row?.category === 'string' && row.category ? row.category : 'Uncategorized';
            return { id: `${category}-${index}`, label: category, value: mean };
          })
          .filter((entry): entry is { id: string; label: string; value: number } => entry !== null)
      : [];
    const computedTotal = rows.reduce((sum, row) => sum + row.value, 0);
    const aggregate =
      typeof resolvedTotal === 'number' && resolvedTotal > 0
        ? resolvedTotal
        : typeof stackedTotal === 'number'
          ? stackedTotal
          : computedTotal;
    const items = [...rows]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((row) => ({
        id: row.id,
        label: row.label,
        value: formatEmission(row.value),
        description:
          aggregate > 0
            ? `${Math.round((row.value / aggregate) * 100)}% of ${stackedShareLabel}`
            : undefined
      }));
    return { items, total: aggregate };
  }, [stageStackedData, resolvedTotal, stackedTotal, stackedShareLabel]);

  const bubbleSummary = useMemo(() => {
    const fallbackTotal =
      typeof bubbleTotal === 'number'
        ? bubbleTotal
        : topActivities.reduce((sum, activity) => sum + activity.emissions, 0);
    const aggregate =
      typeof resolvedTotal === 'number' && resolvedTotal > 0 ? resolvedTotal : fallbackTotal;
    const items = topActivities.slice(0, 3).map((activity) => ({
      id: activity.id,
      label: activity.label,
      value: formatEmission(activity.emissions),
      description:
        aggregate > 0
          ? `${Math.round((activity.emissions / aggregate) * 100)}% of ${bubbleShareLabel}`
          : undefined
    }));
    return { items, total: aggregate };
  }, [topActivities, bubbleTotal, resolvedTotal, bubbleShareLabel]);

  const sankeySummary = useMemo(() => {
    const nodes = Array.isArray(stageSankeyData?.nodes) ? stageSankeyData.nodes ?? [] : [];
    const nodeLabels = new Map<string, string>();
    nodes.forEach((node) => {
      if (typeof node?.id === 'string') {
        nodeLabels.set(node.id, typeof node?.label === 'string' && node.label ? node.label : node.id);
      }
    });
    const links = Array.isArray(stageSankeyData?.links) ? stageSankeyData.links ?? [] : [];
    const rows = links
      .map((link, index) => {
        const mean = typeof link?.values?.mean === 'number' ? link.values.mean : null;
        if (mean == null || !Number.isFinite(mean) || mean <= 0) {
          return null;
        }
        const sourceLabel = nodeLabels.get(link.source) ?? link.source;
        const targetLabel = nodeLabels.get(link.target) ?? link.target;
        return {
          id: `${link.source}-${link.target}-${index}`,
          label: `${sourceLabel} → ${targetLabel}`,
          value: mean
        };
      })
      .filter((entry): entry is { id: string; label: string; value: number } => entry !== null)
      .sort((a, b) => b.value - a.value);
    const computedTotal = rows.reduce((sum, row) => sum + row.value, 0);
    const aggregate =
      typeof resolvedTotal === 'number' && resolvedTotal > 0
        ? resolvedTotal
        : typeof sankeyTotal === 'number'
          ? sankeyTotal
          : computedTotal;
    const items = rows.slice(0, 3).map((row) => ({
      id: row.id,
      label: row.label,
      value: formatEmission(row.value),
      description:
        aggregate > 0
          ? `${Math.round((row.value / aggregate) * 100)}% of ${sankeyShareLabel}`
          : undefined
    }));
    return { items, total: aggregate };
  }, [stageSankeyData, resolvedTotal, sankeyTotal, sankeyShareLabel]);

  const referenceLookup = useMemo(
    () => buildReferenceLookup(activeReferenceKeys),
    [activeReferenceKeys]
  );

  const statusTone = resolveStatusTone(status);
  const statusLabel = STATUS_LABEL[status] ?? status;
  const canvasRef = useRef<HTMLElement | null>(null);
  const [expandedViz, setExpandedViz] = useState<Set<string>>(
    () => new Set(['stacked', 'bubble', 'sankey'])
  );

  const handleToggleVisualizer = useCallback((id: string) => {
    setExpandedViz((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <section
      ref={canvasRef}
      aria-labelledby="viz-canvas-heading"
      className="acx-card relative flex h-full flex-col gap-[var(--gap-1)] overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-900 to-slate-950 sm:px-[var(--gap-2)] sm:py-[var(--gap-2)]"
    >
      <div className="flex flex-col gap-[var(--gap-1)] sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="viz-canvas-heading" className="text-[13px] font-semibold">
            Visualization Canvas
          </h2>
          <p className="mt-[var(--gap-0)] text-compact text-slate-400">
            {USE_COMPUTE_API
              ? 'Connected to the live compute API. Figures refresh automatically when controls change.'
              : 'Static artifacts mode'}
          </p>
        </div>
        <div className="flex items-start justify-end gap-[var(--gap-0)] sm:items-start">
          <div className="hidden sm:flex sm:flex-col sm:items-end">
            <span className="text-[10px] uppercase tracking-[0.35em] text-slate-300">Status</span>
            <span className={`text-[13px] font-semibold ${statusTone}`} aria-live="polite">
              {statusLabel}
            </span>
            <span className="mt-[2px] text-[10px] uppercase tracking-[0.35em] text-slate-300">
              dataset {datasetVersion}
            </span>
          </div>
          <ExportMenu canvasRef={canvasRef} />
        </div>
      </div>
      <div className="mt-[var(--gap-1)] flex-1 overflow-hidden rounded-xl border border-slate-800/60 bg-slate-950/50">
        <div className="flex h-full flex-col overflow-y-auto p-[var(--gap-1)] sm:p-[var(--gap-2)]">
          {status === 'error' ? (
            <div
              role="alert"
              className="mb-[var(--gap-1)] space-y-[var(--gap-0)] rounded-xl border border-rose-500/40 bg-rose-500/10 p-[var(--gap-1)] text-compact text-rose-100 shadow-inner shadow-rose-900/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-rose-100">
                  Unable to refresh results
                </p>
                <button
                  type="button"
                  onClick={refresh}
                  className="inline-flex min-h-[32px] items-center justify-center rounded-md border border-rose-400/60 bg-rose-500/20 px-[var(--gap-1)] py-[var(--gap-0)] text-[11px] font-semibold uppercase tracking-[0.25em] text-rose-50 transition hover:bg-rose-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
                >
                  Retry
                </button>
              </div>
              <p className="text-[13px] text-rose-100/90">
                {error ?? 'We could not reach the compute service. Please try again.'}
              </p>
            </div>
          ) : null}
          {status !== 'error' && result === null ? (
            <div className="grid min-h-[200px] flex-1 place-items-center text-center text-compact text-slate-400">
              <div className="space-y-[var(--gap-0)]">
                <p className="text-[15px] font-medium text-slate-200">Ready for the first compute run</p>
                <p>Adjust the profile controls to trigger a request.</p>
              </div>
            </div>
          ) : null}
          {status !== 'error' && result !== null ? (
            <div className="space-y-[var(--gap-2)]">
              <div className="grid gap-[var(--gap-1)] sm:grid-cols-3">
                <div className="acx-card bg-slate-900/60">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-300">Total emissions</p>
                  <p className="mt-[var(--gap-0)] text-lg font-semibold text-slate-50">{formatEmission(resolvedTotal)}</p>
                  <p className="mt-[var(--gap-0)] text-[10px] uppercase tracking-[0.35em] text-slate-300">
                    {generatedAt ? `run ${new Date(generatedAt).toLocaleString()}` : 'timestamp pending'}
                  </p>
                </div>
                <div className="acx-card bg-slate-900/60">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-300">{focusLabel}</p>
                  <p className="mt-[var(--gap-0)] text-lg font-semibold text-slate-50">{focusCount}</p>
                  <p className="mt-[var(--gap-0)] text-[10px] uppercase tracking-[0.35em] text-slate-300">
                    showing top contributors
                  </p>
                </div>
                <div className="acx-card bg-slate-900/60">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-300">References</p>
                  <p className="mt-[var(--gap-0)] text-lg font-semibold text-slate-50">
                    {referenceCount ?? '—'}
                  </p>
                  <p className="mt-[var(--gap-0)] text-[10px] uppercase tracking-[0.35em] text-slate-300">source citations</p>
                </div>
              </div>
              {/* Optional layer toggles hidden temporarily to keep the canvas focused. */}
              <div className="flex flex-col gap-[var(--gap-1)]">
                <VisualizerPanel
                  id="stacked"
                  title={stackedPanelTitle}
                  summary={
                    <SummaryList items={stackedSummary.items} emptyMessage={stackedEmptyMessage} />
                  }
                  expanded={expandedViz.has('stacked')}
                  onToggle={handleToggleVisualizer}
                >
                  <Stacked
                    data={stageStackedData}
                    referenceLookup={referenceLookup}
                    variant="embedded"
                    totalOverride={resolvedTotal}
                  />
                </VisualizerPanel>
                <VisualizerPanel
                  id="bubble"
                  title={bubblePanelTitle}
                  summary={
                    <SummaryList items={bubbleSummary.items} emptyMessage={bubbleEmptyMessage} />
                  }
                  expanded={expandedViz.has('bubble')}
                  onToggle={handleToggleVisualizer}
                >
                  <Bubble data={stageBubbleData} referenceLookup={referenceLookup} variant="embedded" />
                </VisualizerPanel>
                <VisualizerPanel
                  id="sankey"
                  title={sankeyPanelTitle}
                  summary={
                    <SummaryList items={sankeySummary.items} emptyMessage={sankeyEmptyMessage} />
                  }
                  expanded={expandedViz.has('sankey')}
                  onToggle={handleToggleVisualizer}
                >
                  <Sankey data={stageSankeyData} referenceLookup={referenceLookup} variant="embedded" />
                </VisualizerPanel>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

interface SummaryItem {
  id: string;
  label: string;
  value: string;
  description?: string;
}

interface SummaryListProps {
  items: SummaryItem[];
  emptyMessage: string;
}

function SummaryList({ items, emptyMessage }: SummaryListProps) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-slate-400">{emptyMessage}</p>;
  }
  return (
    <ul
      className="overflow-hidden rounded-lg border border-slate-800/70 bg-slate-950/40 text-[13px] leading-tight text-slate-200"
      role="list"
    >
      {items.map((item, index) => (
        <li
          key={item.id}
          className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 px-3 py-2 ${
            index > 0 ? 'border-t border-slate-800/60' : ''
          }`}
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-100">{item.label}</p>
            {item.description ? (
              <p className="mt-1 text-[11px] leading-snug text-slate-400">{item.description}</p>
            ) : null}
          </div>
          <span className="text-right text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface VisualizerPanelProps {
  id: string;
  title: string;
  summary: ReactNode;
  children: ReactNode;
  expanded: boolean;
  onToggle: (id: string) => void;
}

function VisualizerPanel({ id, title, summary, children, expanded, onToggle }: VisualizerPanelProps) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-[var(--gap-1)] shadow-inner shadow-slate-900/40 sm:p-[var(--gap-2)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={`${id}-heading`} className="text-base font-semibold text-slate-100">
          {title}
        </h3>
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      <div className="mt-4 space-y-4">
        {summary}
        {expanded ? (
          <div id={`${id}-content`} className="border-t border-slate-800/70 pt-4">
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
