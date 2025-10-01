import { useCallback, useMemo, useState } from 'react';

import { ASSETS } from '../basePath';
import { useLayerCatalog, LayerAuditActivity } from '../lib/useLayerCatalog';
import { PRIMARY_LAYER_ID, useProfile } from '../state/profile';

interface StatusMeta {
  label: string;
  tone: string;
  badge: string;
}

type LayerStatus = 'rendered' | 'seeded_hidden' | 'missing_data';

type ViewTarget = 'stacked' | 'sankey';

const STATUS_META: Record<LayerStatus, StatusMeta> = {
  rendered: {
    label: 'Rendered',
    tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    badge: '✅'
  },
  seeded_hidden: {
    label: 'Seeded, hidden',
    tone: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    badge: '⚠️'
  },
  missing_data: {
    label: 'Missing data',
    tone: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    badge: '⛔'
  }
};

const SANKEY_KEYWORDS = ['logistics', 'freight', 'materials', 'energy', 'supply', 'processing', 'warehousing'];

function resolveStatus(
  layerId: string,
  options: {
    available: ReadonlySet<string>;
    activities: number;
    coverageRatio: number;
    seededHidden: boolean;
  }
): LayerStatus {
  if (options.available.has(layerId)) {
    return 'rendered';
  }
  if (options.activities <= 0) {
    return 'missing_data';
  }
  if (options.coverageRatio <= 0) {
    return 'missing_data';
  }
  if (options.seededHidden) {
    return 'seeded_hidden';
  }
  return 'seeded_hidden';
}

function resolveIconPath(icon: string | undefined): string | null {
  if (!icon) {
    return null;
  }
  return `${ASSETS()}/layers/${icon}`;
}

function resolveTargetView(activity: LayerAuditActivity | undefined): ViewTarget {
  const category = activity?.category?.toLowerCase() ?? '';
  if (SANKEY_KEYWORDS.some((keyword) => category.includes(keyword))) {
    return 'sankey';
  }
  return 'stacked';
}

function focusVisualization(target: ViewTarget): void {
  if (typeof window === 'undefined') {
    return;
  }
  const element = document.getElementById(target);
  if (!element) {
    return;
  }
  window.requestAnimationFrame(() => {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (element instanceof HTMLElement) {
      window.setTimeout(() => {
        element.focus({ preventScroll: true });
      }, 180);
    }
  });
}

export function LayerBrowser(): JSX.Element {
  const { layers, audit, loading, error } = useLayerCatalog();
  const { availableLayers, activeLayers, setActiveLayers } = useProfile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const availableSet = useMemo(() => new Set(availableLayers), [availableLayers]);
  const activeSet = useMemo(() => new Set(activeLayers), [activeLayers]);
  const activitiesByLayer = audit?.activities_by_layer ?? {};
  const coverageByLayer = audit?.ef_coverage ?? {};
  const opsByLayer = audit?.ops_by_layer ?? {};
  const seededHidden = useMemo(() => new Set(audit?.seeded_not_configured ?? []), [audit?.seeded_not_configured]);

  const orderLayers = useCallback(
    (input: Set<string>): string[] => {
      const remaining = new Set(input);
      const ordered: string[] = [];
      availableLayers.forEach((layer) => {
        if (remaining.has(layer)) {
          ordered.push(layer);
          remaining.delete(layer);
        }
      });
      remaining.forEach((layer) => ordered.push(layer));
      return ordered;
    },
    [availableLayers]
  );

  const handleToggleLayer = useCallback(
    (layerId: string) => {
      const next = new Set(activeSet);
      if (layerId !== PRIMARY_LAYER_ID && next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      setActiveLayers(orderLayers(next));
    },
    [activeSet, orderLayers, setActiveLayers]
  );

  const handleActivityClick = useCallback(
    (layerId: string, activity: LayerAuditActivity | undefined) => {
      const next = new Set(activeSet);
      next.add(layerId);
      setActiveLayers(orderLayers(next));
      focusVisualization(resolveTargetView(activity));
      setMobileOpen(false);
    },
    [activeSet, orderLayers, setActiveLayers]
  );

  if (loading) {
    return (
      <section className="acx-card bg-slate-950/60">
        <header className="flex items-center justify-between gap-[var(--gap-0)]">
          <h2 className="text-[13px] font-semibold">Layer Browser</h2>
          <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Loading…</span>
        </header>
        <div className="mt-[var(--gap-1)] space-y-[var(--gap-0)]">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className="h-16 animate-pulse rounded-xl border border-slate-800/60 bg-slate-900/40"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="acx-card bg-slate-950/60">
        <header className="flex items-center justify-between gap-[var(--gap-0)]">
          <h2 className="text-[13px] font-semibold">Layer Browser</h2>
        </header>
        <p className="mt-[var(--gap-1)] text-sm text-rose-300">
          Unable to load layer metadata. {error.message}
        </p>
      </section>
    );
  }

  const content = (
    <section
      aria-labelledby="layer-browser-heading"
      className="acx-card flex flex-col gap-[var(--gap-1)] bg-slate-950/60"
    >
      <header className="flex items-center justify-between gap-[var(--gap-0)]">
        <div>
          <h2 id="layer-browser-heading" className="text-[13px] font-semibold">
            Layer Browser
          </h2>
          <p className="mt-[2px] text-[11px] uppercase tracking-[0.3em] text-slate-400">
            Browse seeded layers & activity coverage
          </p>
        </div>
      </header>
      <div className="flex flex-col gap-[var(--gap-1)]">
        {layers.map((layer) => {
          const activityBucket = activitiesByLayer[layer.id] ?? { count: 0, activities: [] };
          const coverage = coverageByLayer[layer.id];
          const operations = opsByLayer[layer.id]?.count ?? 0;
          const coverageRatio = coverage?.coverage_ratio ?? 0;
          const isActive = activeSet.has(layer.id);
          const status = resolveStatus(layer.id, {
            available: availableSet,
            activities: activityBucket.count ?? 0,
            coverageRatio,
            seededHidden: seededHidden.has(layer.id)
          });
          const statusMeta = STATUS_META[status];
          const iconPath = resolveIconPath(layer.icon ?? undefined);
          const activities = activityBucket.activities ?? [];
          const coverageLabel =
            coverage && typeof coverage.with_emission_factors === 'number' && typeof coverage.activities === 'number'
              ? `${coverage.with_emission_factors}/${coverage.activities} EF`
              : null;
          return (
            <details key={layer.id} className="group rounded-xl border border-slate-800/70 bg-slate-950/40" open={isActive}>
              <summary className="flex cursor-pointer flex-col gap-[var(--gap-0)] px-[var(--gap-1)] py-[var(--gap-1)] text-left outline-none transition hover:bg-slate-900/50">
                <div className="flex items-start gap-[var(--gap-1)]">
                  {iconPath ? (
                    <img
                      src={iconPath}
                      alt=""
                      className="h-10 w-10 flex-shrink-0 rounded-lg border border-slate-800/70 bg-slate-950/80 object-contain"
                    />
                  ) : null}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-[var(--gap-0)]">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{layer.title}</p>
                        {layer.summary ? (
                          <p className="mt-[2px] text-xs text-slate-400">{layer.summary}</p>
                        ) : null}
                      </div>
                      <span
                        className={`inline-flex items-center gap-[4px] rounded-full border px-2 py-[2px] text-[11px] font-semibold ${statusMeta.tone}`}
                      >
                        <span aria-hidden="true">{statusMeta.badge}</span>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="mt-[var(--gap-0)] flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-slate-400">
                      <span>{activityBucket.count ?? 0} activities</span>
                      <span>{operations} ops</span>
                      {coverageLabel ? <span>{coverageLabel}</span> : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-[var(--gap-0)]">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleToggleLayer(layer.id);
                    }}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                      isActive
                        ? 'border-sky-400/60 bg-sky-500/10 text-sky-200 hover:border-sky-300'
                        : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    {isActive ? 'Active' : 'Include'}
                  </button>
                </div>
              </summary>
              <div className="border-t border-slate-800/60 bg-slate-950/70 px-[var(--gap-1)] py-[var(--gap-1)]">
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-400">No activities mapped to this layer in the dataset.</p>
                ) : (
                  <ul className="flex flex-col gap-[6px]">
                    {activities.map((activity) => {
                      const view = resolveTargetView(activity);
                      return (
                        <li key={`${layer.id}-${activity.id || activity.name}`}>
                          <button
                            type="button"
                            onClick={() => handleActivityClick(layer.id, activity)}
                            className="w-full rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                          >
                            <span className="flex flex-col gap-[2px]">
                              <span className="font-medium text-slate-100">{activity.name}</span>
                              <span className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                                Focus {view === 'stacked' ? 'leaderboard' : 'Sankey'}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col gap-[var(--gap-1)]">
      <div className="lg:hidden">
        <button
          type="button"
          className="inline-flex w-full items-center justify-between rounded-xl border border-slate-800/70 bg-slate-950/60 px-[var(--gap-1)] py-[var(--gap-1)] text-left text-sm font-semibold text-slate-100 shadow-sm"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span>Browse layers</span>
          <svg
            className={`h-4 w-4 transition-transform ${mobileOpen ? 'rotate-180 text-sky-300' : 'text-slate-400'}`}
            viewBox="0 0 12 12"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M6 8.5a1 1 0 0 1-.707-.293l-4-4A1 1 0 0 1 2.707 3.793L6 7.086l3.293-3.293a1 1 0 0 1 1.414 1.414l-4 4A1 1 0 0 1 6 8.5Z" />
          </svg>
        </button>
      </div>
      <div className={`${mobileOpen ? 'block' : 'hidden'} lg:block`}>{content}</div>
    </div>
  );
}
