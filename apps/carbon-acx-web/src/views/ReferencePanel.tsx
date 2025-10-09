import type { DatasetDetail, ReferenceSummary } from '../lib/api';
import { ScrollArea } from '../components/ui/scroll-area';
import { Skeleton } from '../components/ui/skeleton';
import { useDataset, useReferences } from '../hooks/useDataset';

interface ReferencePanelProps {
  datasetId?: string;
  fallbackDataset?: DatasetDetail;
  fallbackReferences?: ReferenceSummary[];
  onClose?: () => void;
}

export default function ReferencePanel({
  datasetId,
  fallbackDataset,
  fallbackReferences,
  onClose,
}: ReferencePanelProps) {
  const payload =
    datasetId && fallbackDataset && fallbackReferences
      ? { dataset: fallbackDataset, references: fallbackReferences }
      : undefined;
  const datasetState = useDataset(datasetId, payload ? { fallbackData: payload } : undefined);
  const referencesState = useReferences(datasetId, payload ? { fallbackData: payload } : undefined);

  const dataset = datasetState.data ?? fallbackDataset ?? null;
  const references = referencesState.data ?? fallbackReferences ?? [];
  const hasReferences = references && references.length > 0;

  const title = dataset ? `References · ${dataset.datasetId}` : 'References';

  return (
    <aside className="reference-panel" aria-label="References">
      <header className="reference-panel__header">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {dataset?.title && <p className="text-sm text-text-muted">{dataset.title}</p>}
        </div>
        {onClose && (
          <button type="button" className="text-sm text-text-muted lg:hidden" onClick={onClose}>
            Close
          </button>
        )}
      </header>
      <ScrollArea className="h-full">
        <ol className="reference-panel__list" aria-live="polite">
          {referencesState.isLoading && !hasReferences && (
            <li className="reference-panel__empty">Loading references…</li>
          )}
          {hasReferences ? (
            references.map((reference) => (
              <li key={reference.referenceId} className="reference-panel__item">
                <p className="text-sm text-foreground">{reference.text}</p>
                <ReferenceMeta reference={reference} />
              </li>
            ))
          ) : (
            !referencesState.isLoading && (
              <li className="reference-panel__empty">
                {dataset ? 'No references provided for this dataset.' : 'Select a dataset to review its references.'}
              </li>
            )
          )}
        </ol>
      </ScrollArea>
    </aside>
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
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </li>
        ))}
      </ol>
    </aside>
  );
}
