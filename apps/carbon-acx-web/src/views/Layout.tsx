import { Suspense, useEffect, useState } from 'react';
import { Await, Outlet, useLoaderData, useMatches } from 'react-router-dom';

import type {
  ActivitySummary,
  DatasetSummary,
  ReferenceSummary,
  SectorSummary,
} from '../lib/api';
import NavSidebar, { NavSidebarSkeleton } from './NavSidebar';
import ReferencePanel, { ReferencePanelSkeleton } from './ReferencePanel';
import ScopeSelector, { ScopeSelectorSkeleton } from './ScopeSelector';
import VisualizationCanvas, { VisualizationSkeleton } from './VisualizationCanvas';

import '../styles/layout.css';

interface LayoutLoaderData {
  sectors: Promise<SectorSummary[]>;
}

interface DatasetLoaderData {
  dataset: Promise<DatasetSummary>;
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
        <ScopePane />
      </main>
      <aside className="app-layout__inspect" data-open={isInspectOpen}>
        <Suspense fallback={<ReferencePanelSkeleton />}>
          <ReferencesContent
            data={datasetData}
            isSheetOpen={isInspectOpen}
            onToggleSheet={() => setInspectOpen((value) => !value)}
          />
        </Suspense>
      </aside>
      <button
        type="button"
        className="app-layout__inspect-trigger"
        onClick={() => setInspectOpen((value) => !value)}
        aria-expanded={isInspectOpen}
      >
        {isInspectOpen ? 'Hide references' : 'Show references'}
      </button>
    </div>
  );
}

function ScopePane() {
  const matches = useMatches();
  const sectorMatch = matches.find((match) => match.id === 'sector');
  const sectorData = sectorMatch?.data as
    | { sector: Promise<SectorSummary>; activities: Promise<ActivitySummary[]> }
    | undefined;

  if (!sectorData) {
    return (
      <>
        <ScopeSelector />
        <VisualizationCanvas>
          <Outlet />
        </VisualizationCanvas>
      </>
    );
  }

  return (
    <Suspense fallback={<ScopePaneSkeleton />}>
      <Await resolve={Promise.all([sectorData.sector, sectorData.activities])}>
        {([sector, activities]) => (
          <>
            <ScopeSelector sector={sector} activities={activities} />
            <VisualizationCanvas>
              <Outlet />
            </VisualizationCanvas>
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
      <VisualizationSkeleton />
    </>
  );
}

function ReferencesContent({
  data,
  isSheetOpen,
  onToggleSheet,
}: {
  data?: DatasetLoaderData;
  isSheetOpen: boolean;
  onToggleSheet: () => void;
}) {
  const matches = useMatches();

  if (!data) {
    return (
      <ReferencePanel
        references={undefined}
        isSheetOpen={isSheetOpen}
        onToggleSheet={matches.some((match) => match.pathname.startsWith('/sectors')) ? onToggleSheet : undefined}
      />
    );
  }

  return (
    <Await resolve={Promise.all([data.dataset, data.references])}>
      {([dataset, references]) => (
        <ReferencePanel
          dataset={dataset}
          references={references}
          isSheetOpen={isSheetOpen}
          onToggleSheet={onToggleSheet}
        />
      )}
    </Await>
  );
}
