import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import type { DatasetDetail, ReferenceSummary, DatasetSummary } from '../lib/api';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';
import { useDataset, useReferences, useDatasets } from '../hooks/useDataset';

interface ReferencePanelProps {
  datasetId?: string;
  fallbackDataset?: DatasetDetail;
  fallbackReferences?: ReferenceSummary[];
  onClose?: () => void;
  onToggle?: () => void;
}

export default function ReferencePanel({
  datasetId,
  fallbackDataset,
  fallbackReferences,
  onClose,
  onToggle,
}: ReferencePanelProps) {
  const navigate = useNavigate();
  const { sectorId } = useParams<{ sectorId: string }>();

  const payload =
    datasetId && fallbackDataset && fallbackReferences
      ? { dataset: fallbackDataset, references: fallbackReferences }
      : undefined;
  const datasetState = useDataset(datasetId, payload ? { fallbackData: payload } : undefined);
  const referencesState = useReferences(datasetId, payload ? { fallbackData: payload } : undefined);
  const { data: availableDatasets } = useDatasets();

  const dataset = datasetState.data ?? fallbackDataset ?? null;
  const references = referencesState.data ?? fallbackReferences ?? [];
  const hasReferences = references && references.length > 0;
  const shouldVirtualize = references.length > 30;

  const handleDatasetChange = (selectedDatasetId: string) => {
    if (sectorId) {
      navigate(`/sectors/${encodeURIComponent(sectorId)}/datasets/${encodeURIComponent(selectedDatasetId)}`);
    }
  };

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: references.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 168,
    overscan: 8,
    enabled: shouldVirtualize,
  });

  const virtualizedItems = shouldVirtualize ? virtualizer.getVirtualItems() : [];

  const title = dataset ? `References · ${dataset.datasetId}` : 'References';

  return (
    <aside className="reference-panel" aria-label="References">
      <header className="reference-panel__header">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
          {dataset?.title && <p className="text-sm text-text-muted truncate">{dataset.title}</p>}

          {/* Dataset selector when available */}
          {!dataset && availableDatasets && availableDatasets.length > 0 && sectorId && (
            <select
              className="mt-2 w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent-500"
              onChange={(e) => handleDatasetChange(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Select a dataset...</option>
              {availableDatasets.map((ds: DatasetSummary) => (
                <option key={ds.datasetId} value={ds.datasetId}>
                  {ds.title || ds.datasetId}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onToggle && (
            <button
              type="button"
              className="hidden lg:block p-1 rounded hover:bg-surface-hover transition-colors"
              onClick={onToggle}
              aria-label="Collapse references"
              title="Collapse references"
            >
              <ChevronRight className="h-5 w-5 text-text-muted" />
            </button>
          )}
          {onClose && (
            <button type="button" className="text-sm text-text-muted lg:hidden" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </header>
      <ScrollArea className="h-full" viewportRef={viewportRef} viewportClassName="reference-panel__viewport">
        <ol
          className={shouldVirtualize ? 'reference-panel__list reference-panel__list--virtualized' : 'reference-panel__list'}
          aria-live="polite"
          style={shouldVirtualize ? { height: `${virtualizer.getTotalSize()}px` } : undefined}
        >
          {referencesState.isLoading && !hasReferences && (
            <li className="reference-panel__empty">Loading references…</li>
          )}
          {hasReferences && shouldVirtualize
            ? virtualizedItems.map((item) => {
                const reference = references[item.index];
                if (!reference) {
                  return null;
                }
                return (
                  <li
                    key={reference.referenceId}
                    ref={virtualizer.measureElement}
                    className="reference-panel__item"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${item.start}px)`,
                    }}
                    aria-setsize={references.length}
                    aria-posinset={item.index + 1}
                  >
                    <ReferenceItem reference={reference} index={item.index} />
                  </li>
                );
              })
            : null}
          {hasReferences && !shouldVirtualize &&
            references.map((reference, index) => (
              <li
                key={reference.referenceId}
                className="reference-panel__item"
                aria-setsize={references.length}
                aria-posinset={index + 1}
              >
                <ReferenceItem reference={reference} index={index} />
              </li>
            ))}
          {!hasReferences && !referencesState.isLoading && (
            <li className="reference-panel__empty">
              {dataset
                ? 'No references provided for this dataset.'
                : availableDatasets && availableDatasets.length > 0
                  ? 'Use the dropdown above to select a dataset.'
                  : 'Navigate to a sector to view dataset references.'}
            </li>
          )}
        </ol>
      </ScrollArea>
    </aside>
  );
}

function ReferenceItem({ reference, index }: { reference: ReferenceSummary; index: number }) {
  return (
    <div className="reference-panel__item-content">
      <span className="reference-panel__index" aria-hidden="true">
        {index + 1}
      </span>
      <div className="reference-panel__body">
        <p className="text-sm text-foreground">{reference.text}</p>
        <ReferenceMeta reference={reference} />
      </div>
    </div>
  );
}

function ReferenceMeta({ reference }: { reference: ReferenceSummary }) {
  if (!reference.citation && !reference.url && !reference.year && !reference.layer) {
    return null;
  }
  return (
    <dl className="reference-panel__meta">
      {reference.citation && (
        <div>
          <dt>Citation</dt>
          <dd>{reference.citation}</dd>
        </div>
      )}
      {reference.url && (
        <div>
          <dt>URL</dt>
          <dd>
            <a href={reference.url} target="_blank" rel="noreferrer">
              {reference.url}
            </a>
          </dd>
        </div>
      )}
      {reference.year && (
        <div>
          <dt>Year</dt>
          <dd>{reference.year}</dd>
        </div>
      )}
      {reference.layer && (
        <div>
          <dt>Layer</dt>
          <dd>{reference.layer}</dd>
        </div>
      )}
    </dl>
  );
}

export function ReferencePanelSkeleton() {
  return (
    <aside className="reference-panel">
      <header className="reference-panel__header">
        <Skeleton className="h-5 w-28" />
      </header>
      <ol className="reference-panel__list">
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index} className="reference-panel__item">
            <div className="reference-panel__item-content">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="reference-panel__body">
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
