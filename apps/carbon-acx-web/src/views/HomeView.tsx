import { Suspense } from 'react';
import { Await, useLoaderData } from 'react-router-dom';

import HeroSection from '../components/HeroSection';
import type { DatasetSummary, SectorSummary } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';

interface HomeLoaderData {
  sectors: Promise<SectorSummary[]>;
  datasets: Promise<DatasetSummary[]>;
}

export default function HomeView() {
  const data = useLoaderData() as HomeLoaderData;

  return (
    <div className="home-view space-y-12 -mt-6">
      <Suspense fallback={<HeroSkeleton />}>
        <Await resolve={Promise.all([data.sectors, data.datasets])}>
          {([sectors, datasets]) => (
            <HeroSection sectors={sectors} latestDataset={datasets[0]} />
          )}
        </Await>
      </Suspense>

      {/* Future sections will go here:
          - Featured insights
          - Recent updates
          - Trending sectors
          - Community highlights
      */}
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="min-h-[85vh] flex flex-col justify-center rounded-3xl bg-surface/50 p-8 md:p-12 lg:p-16">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full max-w-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
