import { Suspense } from 'react';
import { Await, useLoaderData, useParams } from 'react-router-dom';

import type { DatasetSummary, ReferenceSummary } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';

interface DatasetLoaderData {
  dataset: Promise<DatasetSummary>;
  references: Promise<ReferenceSummary[]>;
}

export default function DatasetView() {
  const data = useLoaderData() as DatasetLoaderData;
  const params = useParams();

  return (
    <Suspense fallback={<DatasetSkeleton />}>
      <Await resolve={Promise.all([data.dataset, data.references])}>
        {([dataset, references]) => (
          <div className="dataset-view">
            <h3>{dataset.datasetId}</h3>
            <p>
              Loaded for sector <strong>{params.sectorId}</strong>. Generated at{' '}
              {dataset.generatedAt ?? 'unknown time'} with {dataset.figureCount ?? 0} figures.
            </p>
            {dataset.manifestPath && (
              <p>
                Manifest available at <code>{dataset.manifestPath}</code>
                {dataset.manifestSha256 && (
                  <>
                    {' '}
                    (sha256: <code>{dataset.manifestSha256}</code>)
                  </>
                )}
              </p>
            )}
            <p>
              {references.length > 0
                ? 'References are available in the inspector panel.'
                : 'No references provided for this dataset.'}
            </p>
          </div>
        )}
      </Await>
    </Suspense>
  );
}

function DatasetSkeleton() {
  return (
    <div className="dataset-view">
      <Skeleton style={{ height: '1.75rem', width: '14rem' }} />
      <Skeleton style={{ height: '1rem', width: '100%' }} />
      <Skeleton style={{ height: '1rem', width: '70%' }} />
    </div>
  );
}
