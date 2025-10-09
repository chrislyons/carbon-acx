import { Suspense } from 'react';
import { Await, Link, useLoaderData, useOutletContext } from 'react-router-dom';

import type { ActivitySummary, DatasetSummary, SectorSummary } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import type { LayoutOutletContext } from './Layout';

interface SectorLoaderData {
  sector: Promise<SectorSummary>;
  activities: Promise<ActivitySummary[]>;
}

export default function SectorView() {
  const data = useLoaderData() as SectorLoaderData;
  const { datasets } = useOutletContext<LayoutOutletContext>();

  return (
    <Suspense fallback={<SectorSkeleton />}>
      <Await resolve={Promise.all([data.sector, data.activities])}>
        {([sector, activities]) => (
          <div className="sector-view">
            <h3>{sector.name}</h3>
            <p>{sector.description ?? 'No description provided.'}</p>
            <p>
              <strong>{activities.length}</strong> profiles available for scenario scoping.
            </p>
            <SectorDatasetCta datasets={datasets} sector={sector} />
          </div>
        )}
      </Await>
    </Suspense>
  );
}

function SectorDatasetCta({
  datasets,
  sector,
}: {
  datasets: DatasetSummary[];
  sector: SectorSummary;
}) {
  const primaryDataset = datasets[0];
  if (!primaryDataset) {
    return null;
  }
  const href = `/sectors/${encodeURIComponent(sector.id)}/datasets/${encodeURIComponent(primaryDataset.datasetId)}`;
  return (
    <div className="sector-view__dataset">
      <h4>Dataset</h4>
      <p>Open the latest dataset to review visualization figures and references.</p>
      <Link className="sector-view__cta" to={href}>
        View dataset
      </Link>
    </div>
  );
}

function SectorSkeleton() {
  return (
    <div className="sector-view">
      <Skeleton style={{ height: '1.75rem', width: '12rem' }} />
      <Skeleton style={{ height: '1rem', width: '100%' }} />
      <Skeleton style={{ height: '1rem', width: '60%' }} />
    </div>
  );
}
