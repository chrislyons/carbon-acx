import { KeyboardEvent, ReactNode, useId, useState } from 'react';

interface LayoutProps {
  layerBrowser: ReactNode;
  controls: ReactNode;
  canvas: ReactNode;
  references: ReactNode;
}

export function Layout({ layerBrowser, controls, canvas, references }: LayoutProps): JSX.Element {
  const sidebarLabelId = useId();
  const layersTabId = `${sidebarLabelId}-layers-tab`;
  const controlsTabId = `${sidebarLabelId}-controls-tab`;
  const layersPanelId = `${sidebarLabelId}-layers-panel`;
  const controlsPanelId = `${sidebarLabelId}-controls-panel`;
  const [activeSidebar, setActiveSidebar] = useState<'layers' | 'controls'>('layers');

  const resolveTabClassName = (tab: 'layers' | 'controls') => {
    const isActive = activeSidebar === tab;
    const baseClassName =
      'w-full rounded-lg px-[var(--gap-0)] py-[6px] text-[10px] font-semibold uppercase tracking-[0.22em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500';
    const activeClassName = 'bg-slate-800/80 text-slate-100 shadow-inner shadow-slate-900/60';
    const inactiveClassName = 'text-slate-400 hover:text-slate-200';
    return `${baseClassName} ${isActive ? activeClassName : inactiveClassName}`;
  };

  const handleSidebarKeyDown = (tab: 'layers' | 'controls') => (event: KeyboardEvent<HTMLButtonElement>) => {
    const key = event.key.toLowerCase();
    if (key === 'arrowright' || key === 'arrowdown') {
      event.preventDefault();
      setActiveSidebar(tab === 'layers' ? 'controls' : 'layers');
    }
    if (key === 'arrowleft' || key === 'arrowup') {
      event.preventDefault();
      setActiveSidebar(tab === 'layers' ? 'controls' : 'layers');
    }
    if (key === 'home') {
      event.preventDefault();
      setActiveSidebar('layers');
    }
    if (key === 'end') {
      event.preventDefault();
      setActiveSidebar('controls');
    }
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-[var(--gap-1)] lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
      <div className="order-2 flex min-h-0 flex-col lg:order-1 lg:max-h-[calc(100vh-128px)] lg:pr-[calc(var(--gap-0)*0.75)]">
        <div className="sticky top-0 z-20 bg-slate-950/85 pb-[calc(var(--gap-0)*0.5)] pt-[var(--gap-0)] backdrop-blur">
          <p id={sidebarLabelId} className="sr-only">
            Sidebar view switcher
          </p>
          <div
            role="tablist"
            aria-labelledby={sidebarLabelId}
            className="grid grid-cols-2 gap-[calc(var(--gap-0)*0.6)] rounded-2xl border border-slate-800/70 bg-slate-950/60 p-[calc(var(--gap-0)*0.6)] shadow-inner shadow-slate-950/60"
          >
            <button
              type="button"
              id={layersTabId}
              role="tab"
              aria-selected={activeSidebar === 'layers'}
              aria-controls={layersPanelId}
              tabIndex={activeSidebar === 'layers' ? 0 : -1}
              className={resolveTabClassName('layers')}
              onClick={() => setActiveSidebar('layers')}
              onKeyDown={handleSidebarKeyDown('layers')}
            >
              Layer Browser
            </button>
            <button
              type="button"
              id={controlsTabId}
              role="tab"
              aria-selected={activeSidebar === 'controls'}
              aria-controls={controlsPanelId}
              tabIndex={activeSidebar === 'controls' ? 0 : -1}
              className={resolveTabClassName('controls')}
              onClick={() => setActiveSidebar('controls')}
              onKeyDown={handleSidebarKeyDown('controls')}
            >
              Profile Controls
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-[calc(var(--gap-1)*0.85)] overflow-y-auto pt-[calc(var(--gap-0)*0.75)]">
          <div
            role="tabpanel"
            id={layersPanelId}
            aria-labelledby={layersTabId}
            hidden={activeSidebar !== 'layers'}
            className={`${activeSidebar === 'layers' ? 'block' : 'hidden'} min-h-0`}
          >
            {layerBrowser}
          </div>
          <div
            role="tabpanel"
            id={controlsPanelId}
            aria-labelledby={controlsTabId}
            hidden={activeSidebar !== 'controls'}
            className={`${activeSidebar === 'controls' ? 'block' : 'hidden'} min-h-0`}
          >
            {controls}
          </div>
        </div>
      </div>
      <div className="order-1 flex min-h-0 flex-col gap-[var(--gap-1)] lg:order-2 lg:min-h-[calc(100vh-128px)]">
        <div className="min-h-0 lg:flex-1">{canvas}</div>
        <div className="min-h-0 lg:flex-none">{references}</div>
      </div>
    </div>
  );
}
