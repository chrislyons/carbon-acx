import { useMemo } from 'react';

import { ComputeResult, useProfile } from '../state/profile';

interface ActivityRow {
  id: string;
  label: string;
  emissions: number;
}

function formatEmission(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  const tonnes = value / 1_000_000;
  if (Math.abs(tonnes) >= 1) {
    return `${tonnes.toFixed(2)} t CO₂e`;
  }
  const kilograms = value / 1_000;
  if (Math.abs(kilograms) >= 1) {
    return `${kilograms.toFixed(1)} kg CO₂e`;
  }
  return `${value.toFixed(0)} g CO₂e`;
}

function resolveActivities(result: ComputeResult | null): {
  topActivities: ActivityRow[];
  total: number | null;
  count: number;
} {
  const bubble = result?.figures?.bubble;
  const rows = Array.isArray(bubble?.data) ? bubble?.data : [];
  const aggregated = rows
    .map((row) => {
      const id = row.activity_id ?? 'unknown-activity';
      const name = row.activity_name || row.activity_id || 'Activity';
      const emissions = typeof row.annual_emissions_g === 'number' ? row.annual_emissions_g : 0;
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

  const { topActivities, total, count } = useMemo(() => resolveActivities(result), [result]);

  const datasetVersion =
    typeof result?.manifest?.dataset_version === 'string'
      ? result?.manifest?.dataset_version
      : 'unknown';
  const generatedAt =
    typeof result?.manifest?.generated_at === 'string' ? result?.manifest?.generated_at : null;
  const referenceCount = Array.isArray(result?.references) ? result?.references.length : null;

  const statusTone = resolveStatusTone(status);
  const statusLabel = STATUS_LABEL[status] ?? status;

  return (
    <section
      aria-labelledby="viz-canvas-heading"
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900 to-slate-950 p-6 shadow-lg shadow-slate-900/50"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 id="viz-canvas-heading" className="text-lg font-semibold">
            Visualization Canvas
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Connected to the live compute API. Figures refresh automatically when controls change.
          </p>
        </div>
        <div className="hidden sm:flex sm:flex-col sm:items-end sm:text-xs sm:text-slate-500">
          <span>Status</span>
          <span className={`font-semibold ${statusTone}`} aria-live="polite">
            {statusLabel}
          </span>
          <span className="mt-1 text-[11px] uppercase tracking-[0.3em] text-slate-600">
            dataset {datasetVersion}
          </span>
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Top emitting activities
                </h3>
                {status === 'loading' ? (
                  <span className="text-xs font-medium text-amber-300">Recomputing…</span>
                ) : null}
              </div>
              {topActivities.length === 0 ? (
                <p className="text-sm text-slate-500">No emitting activities returned for this profile yet.</p>
              ) : (
                <ul className="space-y-3">
                  {topActivities.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{row.label}</p>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{row.id}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-100">{formatEmission(row.emissions)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
