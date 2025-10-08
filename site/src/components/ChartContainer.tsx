import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import {
  FigureDataStatus,
  FigureManifestEntry,
  LoadedFigureData,
  listFigures,
  loadFigure
} from '../lib/DataLoader';
import { formatEmission } from '../lib/format';
import type { BubbleDatum } from './Bubble';
import { Bubble } from './Bubble';
import type { SankeyData } from './Sankey';
import { Sankey } from './Sankey';
import type { StackedDatum } from './Stacked';
import { Stacked } from './Stacked';
import { useACXStore } from '../store/useACXStore';

export interface FigureDataUpdate {
  figureId: string | null;
  references: string[];
  citationKeys: string[];
  status: FigureDataStatus;
  error: string | null;
}

interface ChartContainerProps {
  onFigureDataChange?: (update: FigureDataUpdate) => void;
}

interface FigureOption {
  id: string;
  label: string;
  method?: string;
}

interface FigureLoadState {
  status: FigureDataStatus;
  error: string | null;
  data: LoadedFigureData | null;
}

const FIGURE_METHOD_LABEL: Record<string, string> = {
  'figures.stacked': 'Stacked emissions',
  'figures.bubble': 'Bubble chart',
  'figures.sankey': 'Sankey pathways',
  'figures.feedback': 'Feedback pathways'
};

const FIGURE_SUMMARY_LABEL: Record<string, string> = {
  'figures.stacked': 'Total emissions',
  'figures.bubble': 'Highest emission activity',
  'figures.sankey': 'Total pathway emissions',
  'figures.feedback': 'Feedback intensity'
};

function buildFigureOptions(entries: FigureManifestEntry[]): FigureOption[] {
  return entries
    .map((entry) => ({
      id: entry.figure_id,
      label: entry.figure_id,
      method: entry.figure_method
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function getSummaryValue(result: LoadedFigureData | null): string | null {
  if (!result) {
    return null;
  }
  const data = result.payload?.data as unknown;
  const method = result.manifest.figure_method ?? result.payload.figure_method ?? '';
  switch (method) {
    case 'figures.stacked': {
      const rows = Array.isArray(data) ? (data as StackedDatum[]) : [];
      const total = rows.reduce((sum, row) => {
        const mean = typeof row?.values?.mean === 'number' ? row.values.mean : 0;
        return sum + (Number.isFinite(mean) ? mean : 0);
      }, 0);
      return total > 0 ? formatEmission(total) : null;
    }
    case 'figures.bubble': {
      const points = Array.isArray(data) ? (data as BubbleDatum[]) : [];
      const top = points.reduce((max, point) => {
        const mean = typeof point?.values?.mean === 'number' ? point.values.mean : null;
        if (mean == null || !Number.isFinite(mean) || mean <= (max ?? 0)) {
          return max;
        }
        return mean;
      }, null as number | null);
      return top != null && top > 0 ? formatEmission(top) : null;
    }
    case 'figures.sankey':
    case 'figures.feedback': {
      const payload = (data as SankeyData) ?? { nodes: [], links: [] };
      const links = Array.isArray(payload?.links) ? payload.links ?? [] : [];
      const total = links.reduce((sum, link) => {
        const mean = typeof link?.values?.mean === 'number' ? link.values.mean : null;
        if (mean == null || !Number.isFinite(mean) || mean <= 0) {
          return sum;
        }
        return sum + mean;
      }, 0);
      return total > 0 ? formatEmission(total) : null;
    }
    default:
      return null;
  }
}

function getMethodLabel(method: string | undefined): string | undefined {
  if (!method) {
    return undefined;
  }
  return FIGURE_METHOD_LABEL[method] ?? method;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function ChartContainer({ onFigureDataChange }: ChartContainerProps): JSX.Element {
  const figureId = useACXStore((state) => state.figureId);
  const setFigureId = useACXStore((state) => state.setFigureId);

  const [manifestStatus, setManifestStatus] = useState<FigureDataStatus>('idle');
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [figureOptions, setFigureOptions] = useState<FigureOption[]>([]);

  const [loadState, setLoadState] = useState<FigureLoadState>({
    status: 'idle',
    error: null,
    data: null
  });

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    setManifestStatus('loading');
    setManifestError(null);
    listFigures(controller.signal)
      .then((entries) => {
        if (!mounted) {
          return;
        }
        const options = buildFigureOptions(entries);
        setFigureOptions(options);
        setManifestStatus('success');
        if ((!figureId || figureId.trim().length === 0) && options.length > 0) {
          setFigureId(options[0].id);
        }
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }
        if (isAbortError(error)) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Unable to load figure manifest';
        setManifestError(message);
        setManifestStatus('error');
      });
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [figureId, setFigureId]);

  useEffect(() => {
    if (!figureId) {
      setLoadState({ status: 'idle', error: null, data: null });
      return;
    }
    let mounted = true;
    const controller = new AbortController();
    setLoadState({ status: 'loading', error: null, data: null });
    loadFigure(figureId, controller.signal)
      .then((result) => {
        if (!mounted) {
          return;
        }
        setLoadState({ status: 'success', error: null, data: result });
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }
        if (isAbortError(error)) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Unable to load figure data';
        setLoadState({ status: 'error', error: message, data: null });
      });
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [figureId]);

  useEffect(() => {
    if (!onFigureDataChange) {
      return;
    }
    if (!figureId) {
      onFigureDataChange({
        figureId: null,
        references: [],
        citationKeys: [],
        status: 'idle',
        error: null
      });
      return;
    }
    onFigureDataChange({
      figureId,
      references: loadState.data?.references ?? [],
      citationKeys: loadState.data?.citationKeys ?? [],
      status: loadState.status,
      error: loadState.error
    });
  }, [figureId, loadState, onFigureDataChange]);

  useEffect(() => {
    return () => {
      if (onFigureDataChange) {
        onFigureDataChange({
          figureId: null,
          references: [],
          citationKeys: [],
          status: 'idle',
          error: null
        });
      }
    };
  }, [onFigureDataChange]);

  const handleSelectChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextId = event.target.value;
      setFigureId(nextId || null);
    },
    [setFigureId]
  );

  const figureMethod = loadState.data?.manifest.figure_method ?? loadState.data?.payload.figure_method;
  const methodLabel = getMethodLabel(figureMethod);
  const summaryLabel = figureMethod ? FIGURE_SUMMARY_LABEL[figureMethod] : undefined;
  const summaryValue = getSummaryValue(loadState.data);

  const chartContent = useMemo(() => {
    if (loadState.status === 'loading') {
      return <p className="text-sm text-muted-foreground">Loading figure data…</p>;
    }
    if (loadState.status === 'error') {
      return (
        <p className="text-sm text-destructive" role="alert">
          {loadState.error ?? 'Unable to load figure data.'}
        </p>
      );
    }
    if (!loadState.data) {
      if (manifestStatus === 'loading') {
        return <p className="text-sm text-muted-foreground">Loading manifest…</p>;
      }
      if (manifestStatus === 'error') {
        return (
          <p className="text-sm text-destructive" role="alert">
            {manifestError ?? 'Unable to load figure manifest.'}
          </p>
        );
      }
      return <p className="text-sm text-muted-foreground">Select a figure to view its data.</p>;
    }

    const payload = loadState.data.payload;
    const data = payload?.data;
    const referenceLookup = loadState.data.referenceLookup;

    switch (figureMethod) {
      case 'figures.stacked':
        return (
          <Stacked
            data={(data as StackedDatum[]) ?? []}
            referenceLookup={referenceLookup}
            variant="embedded"
          />
        );
      case 'figures.bubble':
        return (
          <Bubble data={(data as BubbleDatum[]) ?? []} referenceLookup={referenceLookup} variant="embedded" />
        );
      case 'figures.sankey':
      case 'figures.feedback':
        return (
          <Sankey data={(data as SankeyData) ?? { nodes: [], links: [] }} referenceLookup={referenceLookup} variant="embedded" />
        );
      default:
        return (
          <pre className="max-h-[320px] overflow-auto rounded-md bg-muted/40 p-4 text-xs text-muted-foreground">
            {JSON.stringify(payload ?? {}, null, 2)}
          </pre>
        );
    }
  }, [figureMethod, loadState, manifestError, manifestStatus]);

  return (
    <section className="acx-card flex flex-col gap-4 bg-card/70">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-2xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Manifest explorer
          </p>
          <h2 className="text-lg font-semibold text-foreground">Figure data</h2>
          {methodLabel ? (
            <p className="text-xs text-muted-foreground">{methodLabel}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="figure-select" className="text-xs font-medium text-muted-foreground">
            Figure
          </label>
          <select
            id="figure-select"
            className="rounded-md border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={figureId ?? ''}
            onChange={handleSelectChange}
            disabled={manifestStatus !== 'success' || figureOptions.length === 0}
          >
            {figureOptions.length === 0 ? <option value="">No figures available</option> : null}
            {figureOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>
      {summaryLabel && summaryValue ? (
        <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
          <p className="text-2xs uppercase tracking-[0.3em] text-muted-foreground">{summaryLabel}</p>
          <p className="text-base font-semibold text-foreground">{summaryValue}</p>
        </div>
      ) : null}
      <div className="min-h-[320px] flex-1">{chartContent}</div>
    </section>
  );
}
