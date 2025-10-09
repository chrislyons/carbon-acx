import { Suspense, useEffect, useState } from 'react';
import { Await, Outlet, useLoaderData, useMatches } from 'react-router-dom';

import type {
  ActivitySummary,
  DatasetDetail,
  DatasetSummary,
  ReferenceSummary,
  SectorSummary,
} from '../lib/api';
import NavSidebar, { NavSidebarSkeleton } from './NavSidebar';
import ReferencePanel, { ReferencePanelSkeleton } from './ReferencePanel';
import ScopeSelector, { ScopeSelectorSkeleton } from './ScopeSelector';
import ProfilePicker, { ProfilePickerSkeleton } from './ProfilePicker';
import { CanvasSkeleton } from './VisualizationCanvas';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import { Button } from '../components/ui/button';

import '../styles/layout.css';

interface LayoutLoaderData {
  sectors: Promise<SectorSummary[]>;
  datasets: Promise<DatasetSummary[]>;
}

export interface LayoutOutletContext {
  datasets: DatasetSummary[];
}

interface DatasetLoaderData {
  dataset: Promise<DatasetDetail>;
  references: Promise<ReferenceSummary[]>;
}

export default function Layout() {
  const data = useLoaderData() as LayoutLoaderData;
  const matches = useMatches();
  const datasetMatch = matches.find((match) => match.id === 'dataset');

  const [isInspectOpen, setInspectOpen] = useState(false);

  useEffect(() => {
    setInspectOpen(Boolean(datasetMatch));
  }, [datasetMatch]);

  const datasetData = datasetMatch?.data as DatasetLoaderData | undefined;
  const datasetId = datasetMatch?.params?.datasetId as string | undefined;

  return (
    <div className="app-layout">
      <aside className="app-layout__nav">
        <Suspense fallback={<NavSidebarSkeleton />}>
          <Await resolve={data.sectors}>
            {(sectors) => <NavSidebar sectors={sectors} />}
          </Await>
        </Suspense>
      </aside>
      <main className="app-layout__main">
        <ScopePane datasetsPromise={data.datasets} />
      </main>
      <aside className="app-layout__inspect hidden lg:flex" data-open={isInspectOpen ? 'true' : 'false'}>
        <Suspense fallback={<ReferencePanelSkeleton />}>
          <ReferencesContent
            datasetId={datasetId}
            data={datasetData}
            onClose={() => setInspectOpen(false)}
          />
        </Suspense>
      </aside>
      <Sheet open={isInspectOpen} onOpenChange={setInspectOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            className="app-layout__inspect-trigger lg:hidden"
            aria-expanded={isInspectOpen}
          >
            {isInspectOpen ? 'Hide references' : 'Show references'}
          </Button>
        </SheetTrigger>
        <SheetContent className="lg:hidden overflow-y-auto">
          <Suspense fallback={<ReferencePanelSkeleton />}>
            <ReferencesContent
              datasetId={datasetId}
              data={datasetData}
              onClose={() => setInspectOpen(false)}
            />
          </Suspense>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ScopePane({ datasetsPromise }: { datasetsPromise: Promise<DatasetSummary[]> }) {
  const matches = useMatches();
  const sectorMatch = matches.find((match) => match.id === 'sector');
  const sectorData = sectorMatch?.data as
    | { sector: Promise<SectorSummary>; activities: Promise<ActivitySummary[]> }
    | undefined;

  if (!sectorData) {
    return (
      <>
        <ScopeSelector />
        <ProfilePicker />
        <Suspense fallback={<CanvasSkeleton />}>
          <Await resolve={datasetsPromise}>
            {(datasets) => <Outlet context={{ datasets } satisfies LayoutOutletContext} />}
          </Await>
        </Suspense>
      </>
    );
  }

  return (
    <Suspense fallback={<ScopePaneSkeleton />}>
      <Await resolve={Promise.all([sectorData.sector, sectorData.activities, datasetsPromise])}>
        {([sector, activities, datasets]) => (
          <>
            <ScopeSelector sector={sector} />
            <ProfilePicker activities={activities} />
            <Outlet context={{ datasets } satisfies LayoutOutletContext} />
          </>
        )}
      </Await>
    </Suspense>
  );
}

function ScopePaneSkeleton() {
  return (
    <>
      <ScopeSelectorSkeleton />
      <ProfilePickerSkeleton />
      <CanvasSkeleton />
    </>
  );
}

function ReferencesContent({
  datasetId,
  data,
  onClose,
}: {
  datasetId?: string;
  data?: DatasetLoaderData;
  onClose?: () => void;
}) {
  if (!datasetId || !data) {
    return <ReferencePanel datasetId={undefined} onClose={onClose} />;
  }

  return (
    <Await resolve={Promise.all([data.dataset, data.references])}>
      {([dataset, references]) => (
        <ReferencePanel
          datasetId={datasetId}
          fallbackDataset={dataset}
          fallbackReferences={references}
          onClose={onClose}
        />
      )}
    </Await>
  );
}
