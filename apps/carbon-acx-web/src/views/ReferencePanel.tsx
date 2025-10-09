import type { DatasetSummary, ReferenceSummary } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';

interface ReferencePanelProps {
  dataset?: DatasetSummary | null;
  references?: ReferenceSummary[];
  isSheetOpen?: boolean;
  onToggleSheet?: () => void;
}

export default function ReferencePanel({
  dataset,
  references,
  isSheetOpen,
  onToggleSheet,
}: ReferencePanelProps) {
  const title = dataset ? `References · ${dataset.datasetId}` : 'References';

  const hasReferences = Boolean(references && references.length > 0);

  return (
    <aside className="reference-panel" aria-label="References">
      <header className="reference-panel__header">
        <h2>{title}</h2>
        {onToggleSheet && (
          <button
            type="button"
            className="reference-panel__toggle"
            onClick={onToggleSheet}
            aria-expanded={isSheetOpen}
          >
            {isSheetOpen ? 'Hide' : 'Show'}
          </button>
        )}
      </header>
      <ol className="reference-panel__list">
        {hasReferences ? (
          references.map((reference) => (
            <li key={reference.referenceId} className="reference-panel__item">
              <p>{reference.text}</p>
              <ReferenceMeta reference={reference} />
            </li>
          ))
        ) : (
          <li className="reference-panel__empty">
            {dataset
              ? 'No references provided for this dataset.'
              : 'Select a dataset to review its references.'}
          </li>
        )}
      </ol>
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
        <Skeleton style={{ height: '1.5rem', width: '10rem' }} />
      </header>
      <ol className="reference-panel__list">
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index} className="reference-panel__item">
            <Skeleton style={{ height: '1rem', width: '100%', marginBottom: '0.5rem' }} />
            <Skeleton style={{ height: '1rem', width: '70%' }} />
          </li>
        ))}
      </ol>
    </aside>
  );
}
