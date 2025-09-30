import { useMemo, useRef } from 'react';

import { Bubble, BubbleDatum } from './Bubble';
import { ExportMenu } from './ExportMenu';
import { Sankey, SankeyData } from './Sankey';
import { Stacked, StackedDatum } from './Stacked';
import { formatEmission } from '../lib/format';
import { buildReferenceLookup } from '../lib/references';
import { ComputeResult, useProfile } from '../state/profile';

interface ActivityRow {
  id: string;
  label: string;
  emissions: number;
}

function resolveActivities(result: ComputeResult | null): {
  topActivities: ActivityRow[];
  total: number | null;
  count: number;
} {
  const bubble = result?.figures?.bubble;
  const rows = Array.isArray(bubble?.data) ? (bubble?.data as unknown[]) : [];
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
  const { status, result, error } = useProfile();

  const { total, count } = useMemo(() => resolveActivities(result), [result]);

  const datasetVersion =
    typeof result?.manifest?.dataset_version === 'string'
      ? result?.manifest?.dataset_version
      : 'unknown';
  const generatedAt =
    typeof result?.manifest?.generated_at === 'string' ? result?.manifest?.generated_at : null;
  const referenceCount = Array.isArray(result?.references) ? result?.references.length : null;

  const sources = useMemo(() => {
    const manifestSources = Array.isArray(result?.manifest?.sources)
      ? (result?.manifest?.sources as string[])
      : [];
    if (manifestSources.length > 0) {
      return manifestSources;
    }
    const collected: string[] = [];
    const pushUnique = (values: unknown) => {
      if (!Array.isArray(values)) {
        return;
      }
      values.forEach((value) => {
        if (typeof value === 'string' && !collected.includes(value)) {
          collected.push(value);
        }
      });
    };
    pushUnique(result?.figures?.stacked?.citation_keys);
    pushUnique(result?.figures?.bubble?.citation_keys);
    pushUnique(result?.figures?.sankey?.citation_keys);
    return collected;
  }, [result]);

  const referenceLookup = useMemo(() => buildReferenceLookup(sources), [sources]);

  const stackedData = (result?.figures?.stacked?.data as StackedDatum[]) ?? [];
  const bubbleData = (result?.figures?.bubble?.data as BubbleDatum[]) ?? [];
  const sankeyData = (result?.figures?.sankey?.data as SankeyData) ?? { nodes: [], links: [] };

  const statusTone = resolveStatusTone(status);
  const statusLabel = STATUS_LABEL[status] ?? status;
  const canvasRef = useRef<HTMLElement | null>(null);

  return (
    <section
      ref={canvasRef}
      aria-labelledby="viz-canvas-heading"
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900 to-slate-950 p-6 shadow-lg shadow-slate-900/50"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="viz-canvas-heading" className="text-lg font-semibold">
            Visualization Canvas
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Connected to the live compute API. Figures refresh automatically when controls change.
          </p>
        </div>
        <div className="flex items-start justify-end gap-3 sm:items-start">
          <div className="hidden sm:flex sm:flex-col sm:items-end sm:text-xs sm:text-slate-500">
            <span>Status</span>
            <span className={`font-semibold ${statusTone}`} aria-live="polite">
              {statusLabel}
            </span>
            <span className="mt-1 text-[11px] uppercase tracking-[0.3em] text-slate-600">
              dataset {datasetVersion}
            </span>
          </div>
          <ExportMenu canvasRef={canvasRef} />
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-slate-800/80 bg-slate-950/60 p-5">
        {status === 'error' ? (
          <div className="space-y-3 text-sm text-rose-200">
            <p className="font-semibold">Unable to refresh results</p>
            <p>{error ?? 'An unexpected error occurred while requesting /api/compute.'}</p>
          </div>
        ) : null}
        {status !== 'error' && result === null ? (
          <div className="grid min-h-[260px] place-items-center text-center text-sm text-slate-400">
            <div className="space-y-2">
              <p className="text-base font-medium text-slate-200">Ready for the first compute run</p>
              <p>Adjust the profile controls to trigger a request.</p>
            </div>
          </div>
        ) : null}
        {status !== 'error' && result !== null ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Total emissions</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">{formatEmission(total)}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                  {generatedAt ? `run ${new Date(generatedAt).toLocaleString()}` : 'timestamp pending'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Activities tracked</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">{count}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                  showing top contributors
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">References</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  {referenceCount ?? '—'}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">source citations</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Stacked data={stackedData} referenceLookup={referenceLookup} />
              <Bubble data={bubbleData} referenceLookup={referenceLookup} />
              <Sankey data={sankeyData} referenceLookup={referenceLookup} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
