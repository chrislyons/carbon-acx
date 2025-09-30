import { useState } from 'react';

import { ProfileControls } from './components/ProfileControls';
import { ReferencesDrawer } from './components/ReferencesDrawer';
import { VizCanvas } from './components/VizCanvas';

export default function App(): JSX.Element {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <a
        href="#main"
        className="absolute left-4 top-4 z-50 -translate-y-20 rounded-lg bg-sky-500 px-3 py-2 font-semibold text-slate-900 transition focus:translate-y-0 focus:outline-none"
      >
        Skip to main content
      </a>
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Carbon</p>
            <h1 className="text-xl font-semibold">Analysis Console</h1>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 shadow-sm transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 lg:hidden"
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
      <main id="main" className="mx-auto flex max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,2.2fr)_minmax(260px,1fr)]">
          <ProfileControls />
          <VizCanvas />
          <ReferencesDrawer
            id="references-panel"
            open={isDrawerOpen}
            onToggle={() => setIsDrawerOpen((open) => !open)}
          />
        </div>
      </main>
    </div>
  );
}
