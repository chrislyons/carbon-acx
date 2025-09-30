import { useMemo } from 'react';

import { formatEmission } from '../lib/format';
import {
  formatReferenceHint,
  ReferenceCarrier,
  ReferenceLookup,
  resolveReferenceIndices
} from '../lib/references';

export interface StackedDatum extends ReferenceCarrier {
  layer_id?: string | null;
  category?: string | null;
  values?: {
    mean?: number | null;
    low?: number | null;
    high?: number | null;
  } | null;
  units?: Record<string, string | null> | null;
}

export interface StackedProps {
  title?: string;
  data?: StackedDatum[] | null;
  referenceLookup: ReferenceLookup;
}

interface PreparedDatum {
  key: string;
  label: string;
  value: number;
  hint: string;
}

function normaliseCategory(value: string | null | undefined): string {
  if (!value) {
    return 'Uncategorized';
  }
  return value;
}

export function Stacked({ title = 'Annual emissions by category', data, referenceLookup }: StackedProps) {
  const prepared = useMemo<PreparedDatum[]>(() => {
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .map((row, index) => {
        const values = row?.values ?? undefined;
        const mean = typeof values?.mean === 'number' ? values.mean : null;
        if (mean == null || !Number.isFinite(mean) || mean <= 0) {
          return null;
        }
        const label = normaliseCategory(row?.category ?? null);
        const indices = resolveReferenceIndices(row, referenceLookup);
        return {
          key: `${label}-${index}`,
          label,
          value: mean,
          hint: `${formatEmission(mean)} ${formatReferenceHint(indices)}`
        } satisfies PreparedDatum;
      })
      .filter((row): row is PreparedDatum => row !== null)
      .sort((a, b) => b.value - a.value);
  }, [data, referenceLookup]);

  const total = useMemo(() => prepared.reduce((sum, row) => sum + row.value, 0), [prepared]);

  if (prepared.length === 0) {
    return (
      <section
        aria-labelledby="stacked-heading"
        className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 shadow-inner shadow-slate-900/40"
        id="stacked"
      >
        <h3 id="stacked-heading" className="text-base font-semibold text-slate-100">
          {title}
        </h3>
        <p className="mt-4 text-sm text-slate-400">No category data available.</p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="stacked-heading"
      className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 shadow-inner shadow-slate-900/40"
      id="stacked"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="stacked-heading" className="text-base font-semibold text-slate-100">
          {title}
        </h3>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Total {formatEmission(total)}</p>
      </div>
      <ol role="list" className="mt-5 space-y-3">
        {prepared.map((row, index) => {
          const width = total > 0 ? Math.max((row.value / total) * 100, 2) : 0;
          return (
            <li key={row.key} className="space-y-1" data-testid={`stacked-item-${index}`}>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span className="font-medium text-slate-100">{row.label}</span>
                <span>{formatEmission(row.value)}</span>
              </div>
              <div
                className="group relative h-3 overflow-hidden rounded-full bg-slate-800/80"
                style={{
                  transition: 'all 0.5s ease',
                  width: '100%'
                }}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500/80 via-sky-400/70 to-cyan-300/80 transition-all duration-500 ease-out group-hover:from-sky-400 group-hover:to-cyan-200"
                  style={{
                    width: `${Math.min(width, 100)}%`
                  }}
                  title={row.hint}
                  data-testid={`stacked-bar-${index}`}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-slate-300">Annual emissions (adaptive units)</p>
    </section>
  );
}
