import { useMemo, useState } from 'react';

import { ProfileControls } from './components/ProfileControls';
import { ReferencesDrawer } from './components/ReferencesDrawer';
import { Layout } from './components/Layout';
import { VizCanvas } from './components/VizCanvas';
import { ProfileProvider, useProfile } from './state/profile';

function OfflineToast(): JSX.Element | null {
  const { mode } = useProfile();
  if (mode !== 'static') {
    return null;
  }
  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-40 flex -translate-x-1/2 justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-[13px] font-medium text-amber-100 shadow-lg shadow-amber-900/30"
      >
        <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden="true" />
        Live compute offline — showing baseline.
      </div>
    </div>
  );
}

function AppShell(): JSX.Element {
  const initialDrawerState = useMemo(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.matchMedia('(min-width: 1280px)').matches;
  }, []);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(initialDrawerState);

  return (
    <div className="flex min-h-screen w-screen flex-col bg-slate-950 text-slate-100">
      <OfflineToast />
      <a
        href="#main"
        className="absolute left-4 top-4 z-50 -translate-y-20 rounded-lg bg-sky-500 px-3 py-2 font-semibold text-slate-900 transition focus:translate-y-0 focus:outline-none"
      >
        Skip to main content
      </a>
      <header className="border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2.5 sm:px-5 lg:px-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-sky-400">Carbon</p>
            <h1 className="text-base font-semibold">Analysis Console</h1>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-100 shadow-sm transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 lg:hidden"
            aria-expanded={isDrawerOpen}
            aria-controls="references-panel"
            onClick={() => setIsDrawerOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key.toLowerCase() === 'r') {
                event.preventDefault();
                setIsDrawerOpen((open) => !open);
              }
            }}
          >
            <span className="h-2 w-2 rounded-full bg-sky-400" aria-hidden="true" />
            References
          </button>
        </div>
      </header>
      <main id="main" className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-5 lg:px-6">
        <Layout
          controls={<ProfileControls />}
          canvas={<VizCanvas />}
          references={
            <ReferencesDrawer
              id="references-panel"
              open={isDrawerOpen}
              onToggle={() => setIsDrawerOpen((open) => !open)}
            />
          }
        />
      </main>
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <ProfileProvider>
      <AppShell />
    </ProfileProvider>
  );
}
