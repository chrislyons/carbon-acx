import type { PropsWithChildren, ReactNode } from 'react';

import { Skeleton } from '../components/ui/skeleton';

interface VisualizationCanvasProps extends PropsWithChildren {
  title?: string;
  action?: ReactNode;
}

export default function VisualizationCanvas({ title, action, children }: VisualizationCanvasProps) {
  const isEmpty = !children;
  return (
    <section className="visualization-canvas">
      <header className="visualization-canvas__header">
        <div>
          <h2>{title ?? 'Visualization'}</h2>
          <p>Preview datasets and scenario outputs.</p>
        </div>
        {action && <div className="visualization-canvas__action">{action}</div>}
      </header>
      <div className="visualization-canvas__content" role="presentation">
        {isEmpty ? <EmptyState /> : children}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="visualization-canvas__empty" role="status">
      <p>No visualization loaded. Select a dataset to view its figures.</p>
    </div>
  );
}

export function VisualizationSkeleton() {
  return (
    <section className="visualization-canvas">
      <div className="visualization-canvas__header">
        <div>
          <Skeleton style={{ height: '1.5rem', width: '12rem', marginBottom: '0.5rem' }} />
          <Skeleton style={{ height: '1rem', width: '16rem' }} />
        </div>
      </div>
      <div className="visualization-canvas__content">
        <Skeleton style={{ height: '16rem', width: '100%' }} />
      </div>
    </section>
  );
}
