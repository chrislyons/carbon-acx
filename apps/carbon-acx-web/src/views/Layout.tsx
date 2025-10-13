import { Suspense, useEffect, useState } from 'react';
import { Await, Outlet, useLoaderData, useMatches } from 'react-router-dom';
import { Settings } from 'lucide-react';

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
import ThemeToggle from '../components/ThemeToggle';
import SettingsModal from '../components/SettingsModal';

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
  const [settingsOpen, setSettingsOpen] = useState(false);

  // References panel starts hidden by default
  useEffect(() => {
    // Only auto-open references when dataset is loaded AND it's currently closed
    if (datasetMatch && !isInspectOpen) {
      // Don't auto-open, let user explicitly open it
      // setInspectOpen(true);
    }
  }, [datasetMatch, isInspectOpen]);

  const datasetData = datasetMatch?.data as DatasetLoaderData | undefined;
  const datasetId = datasetMatch?.params?.datasetId as string | undefined;

  return (
    <>
      {/* Top-right controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-surface/80 backdrop-blur-sm border border-border rounded-lg p-1 shadow-lg">
        <ThemeToggle />
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          aria-label="Open settings"
        >
          <Settings className="h-5 w-5 text-text-secondary" />
        </button>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <div className="app-layout" data-references-open={isInspectOpen}>
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
        {/* Toggle button for References */}
        {!isInspectOpen && datasetId && (
          <button
            type="button"
            onClick={() => setInspectOpen(true)}
            className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 bg-surface border border-border rounded-l-lg px-2 py-8 hover:bg-surface-hover transition-colors shadow-md"
            aria-label="Show references"
            title="Show references"
          >
            <div className="text-xs font-semibold text-text-muted writing-mode-vertical">
              References
            </div>
          </button>
        )}

        <Suspense fallback={<ReferencePanelSkeleton />}>
          <ReferencesContent
            datasetId={datasetId}
            data={datasetData}
            onClose={() => setInspectOpen(false)}
            onToggle={() => setInspectOpen(!isInspectOpen)}
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
    </>
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
  onToggle,
}: {
  datasetId?: string;
  data?: DatasetLoaderData;
  onClose?: () => void;
  onToggle?: () => void;
}) {
  if (!datasetId || !data) {
    return <ReferencePanel datasetId={undefined} onClose={onClose} onToggle={onToggle} />;
  }

  return (
    <Await resolve={Promise.all([data.dataset, data.references])}>
      {([dataset, references]) => (
        <ReferencePanel
          datasetId={datasetId}
          fallbackDataset={dataset}
          fallbackReferences={references}
          onClose={onClose}
          onToggle={onToggle}
        />
      )}
    </Await>
  );
}
