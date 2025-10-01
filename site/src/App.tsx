import { useState } from 'react';

import { Layout } from './components/Layout';
import { LayerBrowser } from './components/LayerBrowser';
import { ProfileControls } from './components/ProfileControls';
import { ReferencesDrawer } from './components/ReferencesDrawer';
import { VizCanvas } from './components/VizCanvas';
import { ProfileProvider } from './state/profile';

export default function App(): JSX.Element {
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.matchMedia('(min-width: 1280px)').matches;
  });

  return (
    <ProfileProvider>
      <div className="acx-condensed flex min-h-screen w-screen flex-col bg-slate-950/95 text-slate-100">
        <a
          href="#main"
          className="absolute left-4 top-4 z-50 -translate-y-20 rounded-lg bg-sky-500 px-3 py-2 font-semibold text-slate-900 transition focus:translate-y-0 focus:outline-none"
        >
          Skip to main content
        </a>
        <header className="border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
          <div className="flex items-center justify-between px-[var(--gap-2)] py-[var(--gap-1)] sm:px-[var(--gap-2)] lg:px-[var(--gap-2)]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-sky-400">Carbon</p>
              <h1 className="text-[15px] font-semibold">Analysis Console</h1>
            </div>
            <button
              type="button"
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-700 px-[var(--gap-1)] py-[var(--gap-0)] text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-100 shadow-sm transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 lg:hidden"
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
        <main
          id="main"
          className="flex min-h-0 flex-1 flex-col gap-[var(--gap-1)] px-[var(--gap-2)] py-[var(--gap-2)] sm:px-[var(--gap-2)] lg:px-[var(--gap-2)]"
        >
          <Layout
            layerBrowser={<LayerBrowser />}
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
    </ProfileProvider>
  );
}
