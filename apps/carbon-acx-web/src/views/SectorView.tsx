import { Suspense } from 'react';
import { Await, useLoaderData } from 'react-router-dom';

import type { ActivitySummary, SectorSummary } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';

interface SectorLoaderData {
  sector: Promise<SectorSummary>;
  activities: Promise<ActivitySummary[]>;
}

export default function SectorView() {
  const data = useLoaderData() as SectorLoaderData;

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
          </div>
        )}
      </Await>
    </Suspense>
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
