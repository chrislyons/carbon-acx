import { useCallback, useEffect, useMemo, useState, useId } from 'react';

import { useLayerCatalog, LayerAuditActivity } from '../lib/useLayerCatalog';
import { FetchJSONDiagnostics, FetchJSONError } from '../lib/fetchJSON';
import { useProfile } from '../state/profile';
import { PRIMARY_LAYER_ID } from '../state/constants';
import { Icon } from './Icon';

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

export function SectorBrowser(): JSX.Element {
  const { layers, audit, loading, error } = useLayerCatalog();
  const { availableLayers, activeLayers, setActiveLayers } = useProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const mobileContentId = useId();

  const availableSet = useMemo(() => new Set(availableLayers), [availableLayers]);
  const activeSet = useMemo(() => new Set(activeLayers), [activeLayers]);
  const activitiesByLayer = audit?.activities_by_layer ?? {};
  const coverageByLayer = audit?.ef_coverage ?? {};
  const opsByLayer = audit?.ops_by_layer ?? {};
  const seededHidden = useMemo(() => new Set(audit?.hidden_in_ui ?? []), [audit?.hidden_in_ui]);

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

  const errorDiag: FetchJSONDiagnostics | null = error instanceof FetchJSONError ? error.diag : null;
  const diagnosticPayload = useMemo(
    () => (errorDiag ? JSON.stringify(errorDiag, null, 2) : null),
    [errorDiag]
  );

  useEffect(() => {
    setShowDiagnostics(false);
    setCopyStatus('idle');
  }, [error]);

  const handleCopyDiagnostics = useCallback(async () => {
    if (!diagnosticPayload) {
      return;
    }
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(diagnosticPayload);
      } else if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
        const textarea = document.createElement('textarea');
        textarea.value = diagnosticPayload;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setCopyStatus('copied');
      if (typeof window !== 'undefined') {
        window.setTimeout(() => setCopyStatus('idle'), 2000);
      }
    } catch (copyError) {
      console.warn('Unable to copy diagnostics', copyError);
      setCopyStatus('error');
      if (typeof window !== 'undefined') {
        window.setTimeout(() => setCopyStatus('idle'), 3000);
      }
    }
  }, [diagnosticPayload]);

  const renderCopyStatus = (variant: 'desktop' | 'mobile') => {
    if (copyStatus === 'idle') {
      return null;
    }
    const tone = copyStatus === 'copied' ? 'text-emerald-300' : 'text-rose-300';
    const label = copyStatus === 'copied' ? 'Diagnostics copied' : 'Copy failed';
    const spacing = variant === 'desktop' ? 'mt-1 text-xs' : 'mt-2 text-xs';
    return <p className={`${spacing} ${tone}`}>{label}</p>;
  };

  if (loading) {
    return (
      <section className="acx-card bg-slate-950/60">
        <header className="flex items-center justify-between gap-[var(--gap-0)]">
          <h2 className="text-[13px] font-semibold">Sector Browser</h2>
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
    const isNotFound = errorDiag?.status === 404;
    const message = isNotFound
      ? 'Sector catalog not found. Confirm site/public/artifacts/layers.json is present.'
      : 'Unable to load sector metadata.';
    return (
      <section className="acx-card bg-slate-950/60">
        <header className="flex items-center justify-between gap-[var(--gap-0)]">
          <h2 className="text-[13px] font-semibold">Sector Browser</h2>
        </header>
        <div className="mt-[var(--gap-1)] space-y-[var(--gap-1)]">
          <p className="text-sm text-rose-300">
            {message} {error.message}
          </p>
          {errorDiag && diagnosticPayload ? (
            <div className="space-y-[var(--gap-0)]">
              <details className="hidden overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/80 md:block">
                <summary className="cursor-pointer select-none bg-slate-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
                  Error diagnostics
                </summary>
                <div className="space-y-[var(--gap-0)] px-4 pb-4 pt-3">
                  <button
                    type="button"
                    className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-700/60"
                    onClick={handleCopyDiagnostics}
                  >
                    Copy diagnostics
                  </button>
                  {renderCopyStatus('desktop')}
                  <pre className="max-h-64 overflow-auto rounded-lg border border-slate-800/80 bg-slate-950/80 px-3 py-2 text-xs leading-5 text-slate-200">
                    {diagnosticPayload}
                  </pre>
                </div>
              </details>
              <div className="space-y-[var(--gap-0)] md:hidden">
                <button
                  type="button"
                  className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/60"
                  onClick={() => setShowDiagnostics((value) => !value)}
                >
                  {showDiagnostics ? 'Hide error details' : 'Show error details'}
                </button>
                {showDiagnostics ? (
                  <div className="space-y-[var(--gap-0)] rounded-xl border border-slate-800/80 bg-slate-950/80 p-3">
                    <button
                      type="button"
                      className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/60"
                      onClick={handleCopyDiagnostics}
                    >
                      Copy diagnostics
                    </button>
                    {renderCopyStatus('mobile')}
                    <pre className="max-h-64 overflow-auto rounded-lg border border-slate-800/80 bg-slate-950/80 px-3 py-2 text-xs leading-5 text-slate-200">
                      {diagnosticPayload}
                    </pre>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (layers.length === 0) {
    return (
      <section className="acx-card bg-slate-950/60">
        <header className="flex items-center justify-between gap-[var(--gap-0)]">
          <h2 className="text-[13px] font-semibold">Sector Browser</h2>
        </header>
        <div className="mt-[var(--gap-1)] space-y-[var(--gap-0)] text-sm text-slate-300">
          <p>No sectors are currently configured.</p>
          <p>
            Update <code className="rounded bg-slate-900/80 px-1 py-0.5 text-xs">data/layers.csv</code> and run
            {' '}<code className="rounded bg-slate-900/80 px-1 py-0.5 text-xs">python scripts/audit_layers.py</code> to refresh
            {' '}<code className="rounded bg-slate-900/80 px-1 py-0.5 text-xs">site/public/artifacts/layers.json</code>.
          </p>
        </div>
      </section>
    );
  }

  const content = (
    <section
      aria-labelledby="sector-browser-heading"
      className="acx-card flex flex-col gap-[var(--gap-1)] bg-slate-950/60"
    >
      <header className="flex items-center justify-between gap-[var(--gap-0)]">
        <div>
          <h2 id="sector-browser-heading" className="text-[13px] font-semibold">
            Sector Browser
          </h2>
          <p className="mt-[2px] text-[11px] uppercase tracking-[0.3em] text-slate-400">
            Browse seeded sectors & activity coverage
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
          const activities = activityBucket.activities ?? [];
          const coverageLabel =
            coverage && typeof coverage.with_emission_factors === 'number' && typeof coverage.activities === 'number'
              ? `${coverage.with_emission_factors}/${coverage.activities} EF`
              : null;
          const detailPanelId = `${layer.id}-panel`;
          return (
            <details
              key={layer.id}
              className="group rounded-xl border border-slate-800/70 bg-slate-950/40"
              open={isActive}
            >
              <summary
                className="flex cursor-pointer flex-col gap-[calc(var(--gap-0)*0.75)] px-[var(--gap-1)] py-[6px] text-left outline-none transition hover:bg-slate-900/50"
                aria-controls={detailPanelId}
                aria-expanded={isActive}
                title={layer.summary ?? undefined}
              >
                <div className="flex items-start gap-[calc(var(--gap-0)*0.8)]">
                  <Icon
                    id={layer.icon ?? undefined}
                    layerId={layer.id}
                    alt=""
                    className="h-9 w-9 flex-shrink-0 rounded-lg border border-slate-800/70 bg-slate-950/80 object-contain"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start gap-[calc(var(--gap-0)*0.6)]">
                      <div className="min-w-0 flex-1 space-y-[calc(var(--gap-0)*0.4)]">
                        <p className="text-sm font-semibold text-slate-100">{layer.title}</p>
                        <div className="flex flex-wrap items-center gap-[8px] text-[10px] uppercase tracking-[0.25em] text-slate-400">
                          <span
                            className={`inline-flex items-center gap-[4px] rounded-full border px-2 py-[2px] text-[10px] font-semibold tracking-[0.18em] ${statusMeta.tone}`}
                          >
                            <span aria-hidden="true">{statusMeta.badge}</span>
                            {statusMeta.label}
                          </span>
                          <span>{activityBucket.count ?? 0} activities</span>
                          <span>{operations} ops</span>
                          {coverageLabel ? <span>{coverageLabel}</span> : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleToggleLayer(layer.id);
                        }}
                        aria-label={
                          isActive
                            ? `Remove ${layer.title ?? layer.id} from the active comparison`
                            : `Add ${layer.title ?? layer.id} to the active comparison`
                        }
                        aria-pressed={isActive}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-[6px] text-[10px] font-semibold uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                          isActive
                            ? 'border-sky-400/60 bg-sky-500/10 text-sky-200 hover:border-sky-300'
                            : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500'
                        }`}
                      >
                        {isActive ? 'Active' : 'Include'}
                      </button>
                    </div>
                  </div>
                </div>
              </summary>
              <div
                id={detailPanelId}
                className="border-t border-slate-800/60 bg-slate-950/70 px-[var(--gap-1)] py-[var(--gap-1)]"
              >
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
          aria-controls={`${mobileContentId}-container`}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span>Browse sectors</span>
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
      <div id={`${mobileContentId}-container`} className={`${mobileOpen ? 'block' : 'hidden'} lg:block`}>
        {content}
      </div>
    </div>
  );
}

export const LayerBrowser = SectorBrowser;
export const SegmentBrowser = SectorBrowser;
