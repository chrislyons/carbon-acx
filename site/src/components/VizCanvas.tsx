import { useMemo, useRef } from 'react';

import { Bubble, BubbleDatum } from './Bubble';
import { ExportMenu } from './ExportMenu';
import { LayerToggles } from './LayerToggles';
import { Sankey, SankeyData, SankeyLink } from './Sankey';
import { Stacked, StackedDatum } from './Stacked';
import { formatEmission } from '../lib/format';
import { buildReferenceLookup } from '../lib/references';
import { useProfile } from '../state/profile';

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

const STATUS_LABEL: Record<string, string> = {
  idle: 'Idle',
  loading: 'Recomputing…',
  success: 'Up to date',
  error: 'Error'
};

export function VizCanvas(): JSX.Element {
  const {
    status,
    result,
    error,
    refresh,
    primaryLayer,
    availableLayers,
    activeLayers,
    activeReferenceKeys,
    activeReferences,
    setActiveLayers
  } = useProfile();

  const activeLayerSet = useMemo(() => new Set(activeLayers), [activeLayers]);
  const baseLayer = primaryLayer;

  const datasetVersion =
    typeof result?.datasetId === 'string' && result.datasetId.trim().length > 0
      ? result.datasetId
      : typeof result?.manifest?.dataset_version === 'string' && result.manifest.dataset_version
        ? result.manifest.dataset_version
        : 'unknown';
  const generatedAt =
    typeof result?.manifest?.generated_at === 'string' ? result?.manifest?.generated_at : null;
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

  const { total, count } = useMemo(() => resolveActivities(bubbleData), [bubbleData]);

  const referenceLookup = useMemo(
    () => buildReferenceLookup(activeReferenceKeys),
    [activeReferenceKeys]
  );

  const statusTone = resolveStatusTone(status);
  const statusLabel = STATUS_LABEL[status] ?? status;
  const canvasRef = useRef<HTMLElement | null>(null);

  const hasLayerToggles = useMemo(
    () => availableLayers.some((layer) => layer !== baseLayer),
    [availableLayers, baseLayer]
  );

  return (
    <section
      ref={canvasRef}
      aria-labelledby="viz-canvas-heading"
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900/80 via-slate-900 to-slate-950 p-3 shadow-lg shadow-slate-900/50 sm:p-4"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="viz-canvas-heading" className="text-[13px] font-semibold">
            Visualization Canvas
          </h2>
          <p className="mt-1 text-compact text-slate-400">
            Connected to the live compute API. Figures refresh automatically when controls change.
          </p>
        </div>
        <div className="flex items-start justify-end gap-1.5 sm:items-start">
          <div className="hidden sm:flex sm:flex-col sm:items-end">
            <span className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Status</span>
            <span className={`text-[13px] font-semibold ${statusTone}`} aria-live="polite">
              {statusLabel}
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.35em] text-slate-600">
              dataset {datasetVersion}
            </span>
          </div>
          <ExportMenu canvasRef={canvasRef} />
        </div>
      </div>
      <div className="mt-2.5 flex-1 overflow-hidden rounded-xl border border-slate-800/60 bg-slate-950/50">
        <div className="flex h-full flex-col overflow-y-auto p-3">
          {status === 'error' ? (
            <div
              role="alert"
              className="mb-3 space-y-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-compact text-rose-100 shadow-inner shadow-rose-900/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-rose-100">
                  Unable to refresh results
                </p>
                <button
                  type="button"
                  onClick={refresh}
                  className="inline-flex items-center rounded-md border border-rose-400/40 bg-rose-500/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-rose-50 transition hover:bg-rose-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
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
              <div className="space-y-2">
                <p className="text-[15px] font-medium text-slate-200">Ready for the first compute run</p>
                <p>Adjust the profile controls to trigger a request.</p>
              </div>
            </div>
          ) : null}
          {status !== 'error' && result !== null ? (
            <div className="space-y-4">
              <div className="grid gap-2.5 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 pad-compact">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Total emissions</p>
                  <p className="mt-1.5 text-lg font-semibold text-slate-50">{formatEmission(total)}</p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-[0.35em] text-slate-500">
                    {generatedAt ? `run ${new Date(generatedAt).toLocaleString()}` : 'timestamp pending'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 pad-compact">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Activities tracked</p>
                  <p className="mt-1.5 text-lg font-semibold text-slate-50">{count}</p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-[0.35em] text-slate-500">
                    showing top contributors
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800/70 bg-slate-900/60 pad-compact">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">References</p>
                  <p className="mt-1.5 text-lg font-semibold text-slate-50">
                    {referenceCount ?? '—'}
                  </p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-[0.35em] text-slate-500">source citations</p>
                </div>
              </div>
              {hasLayerToggles ? (
                <LayerToggles
                  baseLayer={baseLayer}
                  availableLayers={availableLayers}
                  activeLayers={activeLayers}
                  onChange={setActiveLayers}
                />
              ) : null}
              <div className="grid gap-2.5 lg:grid-cols-3">
                <Stacked data={stackedData} referenceLookup={referenceLookup} />
                <Bubble data={bubbleData} referenceLookup={referenceLookup} />
                <Sankey data={sankeyData} referenceLookup={referenceLookup} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
