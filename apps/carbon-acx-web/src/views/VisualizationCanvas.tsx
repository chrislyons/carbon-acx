import type { ReactNode } from 'react';

import type { BubbleFigure as BubbleFigureShape, DatasetDetail } from '../lib/api';
import { BubbleFigure } from '../components/charts/BubbleFigure';
import { Skeleton } from '../components/ui/skeleton';

interface VisualizationCanvasProps {
  dataset?: DatasetDetail | null;
  isLoading?: boolean;
  error?: Error | null;
  action?: ReactNode;
}

export default function VisualizationCanvas({ dataset, isLoading, error, action }: VisualizationCanvasProps) {
  const bubbleFigure = dataset?.figures.find(
    (figure): figure is BubbleFigureShape => figure.figureType === 'bubble',
  );

  let content: ReactNode;
  if (error) {
    content = (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-text-secondary">
        <p className="font-medium text-danger">We couldn’t load this visualization.</p>
        <p className="max-w-sm text-text-muted">{error.message}</p>
      </div>
    );
  } else if (isLoading) {
    content = <CanvasSkeleton />;
  } else if (dataset && bubbleFigure) {
    content = <BubbleFigure figure={bubbleFigure} />;
  } else {
    content = (
      <div role="status" className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-text-muted">
        <p>No visualization ready yet.</p>
        <p>Select a dataset with a bubble figure to begin.</p>
      </div>
    );
  }

  const generatedLabel = dataset?.generatedAt
    ? new Date(dataset.generatedAt).toLocaleString()
    : 'Unknown generation time';

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border bg-surface/80 p-6 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Dataset</p>
          <h2 className="text-2xl font-semibold text-foreground">
            {dataset?.title ?? dataset?.datasetId ?? 'Visualization'}
          </h2>
          <p className="text-sm text-text-muted">Generated {generatedLabel}</p>
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </header>
      <div className="min-h-[20rem] flex-1" aria-live="polite">
        {content}
      </div>
    </section>
  );
}

export function CanvasSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-6 w-1/3" />
      <div className="flex-1 rounded-xl border border-dashed border-border/80 bg-muted/40">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    </div>
  );
}
