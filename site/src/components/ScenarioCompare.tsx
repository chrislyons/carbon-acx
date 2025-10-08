import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Catalog } from '../lib/catalog';
import {
  aggregateByCategory,
  listActivityDeltas,
  type ActivityDelta,
  type CategoryDelta,
  type ScenarioDiff
} from '../lib/scenarioCompare';
import {
  buildSignedDiff,
  safeWriteExport,
  stableStringify,
  type ScenarioManifest
} from '../lib/exportDiff';
import { compareDenseSpacing } from '../styles/dense';

export interface ScenarioCompareProps {
  diff: ScenarioDiff;
  catalog: Catalog;
  baseHash?: string;
  compareHash?: string;
  baseManifest: ScenarioManifest;
  compareManifest: ScenarioManifest;
}

type CompareView = 'category' | 'activity';

function round4(value: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  return Math.round(value * 10_000) / 10_000;
}

function formatDelta(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    maximumFractionDigits: 4,
    minimumFractionDigits: abs < 1 ? 1 : 0
  });
  if (value > 0) {
    return `+${formatted}`;
  }
  if (value < 0) {
    return `−${formatted}`;
  }
  return '0';
}

function formatAbsolute(value: number | null | undefined): string {
  if (value == null) {
    return '—';
  }
  if (!Number.isFinite(value)) {
    return '—';
  }
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 4,
    minimumFractionDigits: value < 1 && value > 0 ? 1 : 0
  });
}

function formatPercent(value: number): string {
  if (value === Number.POSITIVE_INFINITY) {
    return '∞%';
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return '−∞%';
  }
  if (!Number.isFinite(value)) {
    return '—';
  }
  const percent = value * 100;
  return `${percent.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: percent !== 0 ? 2 : 0
  })}%`;
}

function SummaryCard({
  title,
  primary,
  secondary,
  testId
}: {
  title: string;
  primary: string;
  secondary?: string;
  testId: string;
}) {
  return (
    <div
      className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4"
      data-testid={testId}
      role="group"
      aria-label={title}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{title}</p>
      <p className="mt-2 text-lg font-semibold text-slate-100">{primary}</p>
      {secondary ? <p className="mt-1 text-sm text-slate-300">{secondary}</p> : null}
    </div>
  );
}

function CategoryDeltaChart({ data }: { data: CategoryDelta[] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-sm text-slate-400">No category deltas available.</p>;
  }
  const maxAbs = data.reduce((max, row) => Math.max(max, Math.abs(row.delta)), 0);
  const widthScale = maxAbs > 0 ? 50 / maxAbs : 0;
  return (
    <div className="space-y-3" data-testid="scenario-compare-chart">
      {data.map((row) => {
        const width = Math.min(Math.abs(row.delta) * widthScale, 50);
        const isPositive = row.delta >= 0;
        return (
          <div key={row.key} className="space-y-1">
            <div className="flex items-center justify-between text-sm leading-tight text-slate-200">
              <span className="font-medium text-slate-100">{row.label}</span>
              <span>{formatDelta(row.delta)} kg CO₂e</span>
            </div>
            <div className="relative h-4 overflow-hidden rounded-full bg-slate-900/70">
              <div className="absolute left-1/2 top-0 h-full w-px bg-slate-700/60" aria-hidden />
              {isPositive ? (
                <div
                  className="absolute left-1/2 top-0 h-full rounded-r-full bg-emerald-500/80"
                  style={{ width: `${width}%` }}
                />
              ) : (
                <div
                  className="absolute right-1/2 top-0 h-full rounded-l-full bg-rose-500/80"
                  style={{ width: `${width}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityDeltaList({ data }: { data: ActivityDelta[] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-sm text-slate-400">No activity deltas available.</p>;
  }
  return (
    <ol className="space-y-3" data-testid="scenario-compare-activity">
      {data.map((row) => (
        <li key={row.id} className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4">
          <p className="text-sm font-semibold text-slate-100">{row.label}</p>
          <p className="mt-1 text-sm text-slate-300">
            {formatDelta(row.delta)} kg CO₂e · Base {formatAbsolute(row.total_base)} kg → Compare{' '}
            {formatAbsolute(row.total_compare)} kg
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.22em] text-slate-500">
            Change {formatPercent(row.delta_pct)}
          </p>
        </li>
      ))}
    </ol>
  );
}

function useCompareView(): [CompareView, (view: CompareView) => void] {
  const [view, setView] = useState<CompareView>(() => {
    if (typeof window === 'undefined') {
      return 'category';
    }
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('view');
    return raw === 'activity' ? 'activity' : 'category';
  });
  return [view, setView];
}

function updateSearchParams(baseHash: string | undefined, compareHash: string | undefined, view: CompareView) {
  if (typeof window === 'undefined') {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  if (baseHash && baseHash.trim()) {
    params.set('base', baseHash.trim());
  } else {
    params.delete('base');
  }
  if (compareHash && compareHash.trim()) {
    params.set('compare', compareHash.trim());
  } else {
    params.delete('compare');
  }
  params.set('view', view);
  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', next);
}

export function ScenarioCompare({
  diff,
  catalog,
  baseHash,
  compareHash,
  baseManifest,
  compareManifest
}: ScenarioCompareProps) {
  const [view, setView] = useCompareView();
  const categoryDeltas = useMemo(() => aggregateByCategory(diff, 'activity.category', catalog), [diff, catalog]);
  const activityDeltas = useMemo(() => listActivityDeltas(diff, catalog), [diff, catalog]);

  const mergedBaseManifest = useMemo<ScenarioManifest>(() => {
    if (typeof baseHash === 'string' && baseHash.trim().length > 0) {
      return { ...baseManifest, scenario_hash: baseHash };
    }
    return baseManifest;
  }, [baseManifest, baseHash]);

  const mergedCompareManifest = useMemo<ScenarioManifest>(() => {
    if (typeof compareHash === 'string' && compareHash.trim().length > 0) {
      return { ...compareManifest, scenario_hash: compareHash };
    }
    return compareManifest;
  }, [compareManifest, compareHash]);

  const [exportState, setExportState] = useState<'idle' | 'saved' | 'downloaded' | 'error'>('idle');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (exportState === 'idle') {
      return;
    }
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setExportState('idle');
      resetTimerRef.current = null;
    }, 2500);
    return () => {
      if (typeof window === 'undefined') {
        return;
      }
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, [exportState]);

  useEffect(() => {
    updateSearchParams(baseHash, compareHash, view);
  }, [baseHash, compareHash, view]);

  const summary = useMemo(() => {
    if (!Array.isArray(categoryDeltas) || categoryDeltas.length === 0) {
      return {
        netDelta: 0,
        baseTotal: 0,
        compareTotal: 0,
        netPct: 0,
        increase: null as CategoryDelta | null,
        decrease: null as CategoryDelta | null
      };
    }
    const netDelta = round4(categoryDeltas.reduce((sum, row) => sum + row.delta, 0));
    const baseTotal = round4(categoryDeltas.reduce((sum, row) => sum + (row.total_base ?? 0), 0));
    const compareTotal = round4(categoryDeltas.reduce((sum, row) => sum + (row.total_compare ?? 0), 0));
    let netPct = 0;
    if (baseTotal === 0) {
      if (compareTotal !== 0) {
        netPct = Number.POSITIVE_INFINITY;
      }
    } else {
      netPct = round4(netDelta / baseTotal);
    }
    const increase = categoryDeltas
      .filter((row) => row.delta > 0)
      .sort((a, b) => b.delta - a.delta)[0] ?? null;
    const decrease = categoryDeltas
      .filter((row) => row.delta < 0)
      .sort((a, b) => a.delta - b.delta)[0] ?? null;
    return { netDelta, baseTotal, compareTotal, netPct, increase, decrease };
  }, [categoryDeltas]);

  const handleExport = useCallback(async () => {
    try {
      const payload = buildSignedDiff(diff, {
        baseManifest: mergedBaseManifest,
        compareManifest: mergedCompareManifest
      });
      const json = stableStringify(payload);
      const safeSegment = (value: string | undefined, fallback: string) => {
        if (!value) {
          return fallback;
        }
        const slug = value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
        return slug.length > 0 ? slug : fallback;
      };
      const fileName = `scenario_diff_${safeSegment(payload.base_hash, 'base')}_vs_${safeSegment(payload.compare_hash, 'compare')}.json`;

      const shouldAttemptFsWrite = import.meta.env.MODE === 'development';
      if (shouldAttemptFsWrite) {
        try {
          await safeWriteExport(fileName, json);
          setExportState('saved');
          return;
        } catch (error) {
          console.warn('Unable to write diff export to disk; falling back to download.', error);
        }
      }

      if (typeof window !== 'undefined' && typeof URL !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setExportState('downloaded');
        return;
      }

      throw new Error('Export environment unavailable');
    } catch (error) {
      console.error('Failed to export scenario diff', error);
      setExportState('error');
    }
  }, [diff, mergedBaseManifest, mergedCompareManifest]);

  const exportLabel =
    exportState === 'saved'
      ? 'Saved to exports'
      : exportState === 'downloaded'
        ? 'Download ready'
        : exportState === 'error'
          ? 'Export failed'
          : 'Export diff JSON';

  return (
    <section
      className="rounded-2xl border border-slate-800/70 bg-slate-950/70 text-slate-100 shadow-inner shadow-slate-900/40"
      style={{ padding: compareDenseSpacing.sectionPadding }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Scenario comparison</h2>
          <p className="text-xs text-slate-400">Contrast baseline and alternative scenarios.</p>
        </div>
        <div className="flex items-center gap-2" role="group" aria-label="Comparison actions">
          <button
            type="button"
            className="rounded-full border border-sky-500/50 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-sky-100 transition hover:bg-sky-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            onClick={handleExport}
            data-testid="scenario-compare-export"
          >
            {exportLabel}
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              view === 'category'
                ? 'bg-sky-500 text-slate-900 shadow-sm shadow-sky-900/40'
                : 'bg-slate-900/50 text-slate-300 hover:bg-slate-900/70'
            }`}
            onClick={() => setView('category')}
            data-testid="scenario-compare-toggle-category"
          >
            By category
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              view === 'activity'
                ? 'bg-sky-500 text-slate-900 shadow-sm shadow-sky-900/40'
                : 'bg-slate-900/50 text-slate-300 hover:bg-slate-900/70'
            }`}
            onClick={() => setView('activity')}
            data-testid="scenario-compare-toggle-activity"
          >
            By activity
          </button>
        </div>
      </header>
      <div
        className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
        style={{ rowGap: compareDenseSpacing.cardGap, columnGap: compareDenseSpacing.cardGap }}
      >
        <div>
          <CategoryDeltaChart data={categoryDeltas} />
        </div>
        <div className="grid gap-3" style={{ rowGap: compareDenseSpacing.cardGap }}>
          <SummaryCard
            title="Net change"
            primary={`${formatDelta(summary.netDelta)} kg CO₂e`}
            secondary={`Baseline ${formatAbsolute(summary.baseTotal)} kg → Compare ${formatAbsolute(
              summary.compareTotal
            )} kg (${formatPercent(summary.netPct)})`}
            testId="scenario-compare-summary-net"
          />
          <SummaryCard
            title="Top ↑ category"
            primary={summary.increase ? summary.increase.label : 'No increase'}
            secondary={summary.increase ? `${formatDelta(summary.increase.delta)} kg CO₂e` : undefined}
            testId="scenario-compare-summary-up"
          />
          <SummaryCard
            title="Top ↓ category"
            primary={summary.decrease ? summary.decrease.label : 'No decrease'}
            secondary={summary.decrease ? `${formatDelta(summary.decrease.delta)} kg CO₂e` : undefined}
            testId="scenario-compare-summary-down"
          />
        </div>
      </div>
      <div className="mt-6" data-testid="scenario-compare-detail">
        {view === 'category' ? <CategoryDeltaList data={categoryDeltas} /> : <ActivityDeltaList data={activityDeltas} />}
      </div>
    </section>
  );
}

function CategoryDeltaList({ data }: { data: CategoryDelta[] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-sm text-slate-400">No category deltas available.</p>;
  }
  return (
    <ol className="space-y-2" data-testid="scenario-compare-category">
      {data.map((row) => (
        <li key={row.key} className="flex items-baseline justify-between rounded-xl bg-slate-900/30 px-4 py-3">
          <span className="text-sm font-medium text-slate-100">{row.label}</span>
          <span className="text-sm text-slate-300">{formatDelta(row.delta)} kg CO₂e</span>
        </li>
      ))}
    </ol>
  );
}
