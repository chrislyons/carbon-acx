import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { cn } from '@/lib/utils';
import { useShellLayout } from '@/hooks/useShellLayout';
import { useViewParam } from '@/hooks/useViewParam';
import { useACXStore } from '@/store/useACXStore';
import type { ContextRailTab, DockController } from './ContextRail';
import ContextRail from './ContextRail';

import type { ShellDockPosition } from '@/theme/tokens';

export interface PlotlyTheme {
  layout: Record<string, unknown>;
  config: Record<string, unknown>;
}

export interface DockComponentProps {
  theme: PlotlyTheme;
}

export interface VisualizerSurfaceProps {
  primary: ReactNode;
  manifestHash?: string | null;
  references: readonly string[];
  scenario?: ReactNode;
  compare?: ReactNode | ((controller: DockController) => ReactNode);
  chat?: ReactNode;
  logs?: ReactNode;
  dockLoader?: () => Promise<{ default: ComponentType<DockComponentProps> }>;
  className?: string;
}

const DENSE_PLOTLY_THEME: PlotlyTheme = {
  layout: {
    margin: { l: 40, r: 16, t: 36, b: 40, pad: 2 },
    font: { family: 'Inter, system-ui, sans-serif', size: 12, color: '#e2e8f0' },
    paper_bgcolor: 'rgba(9, 11, 18, 0.95)',
    plot_bgcolor: 'rgba(9, 11, 18, 0.95)',
    legend: {
      orientation: 'h',
      xanchor: 'center',
      yanchor: 'bottom',
      x: 0.5,
      y: -0.2,
      font: { size: 11, color: '#94a3b8' },
      itemwidth: 30
    },
    hovermode: 'closest',
    hoverlabel: {
      bgcolor: 'rgba(15, 23, 42, 0.95)',
      bordercolor: '#0f172a',
      font: { size: 11 }
    },
    transition: { duration: 0 },
    separators: ', '
  },
  config: {
    displaylogo: false,
    responsive: true,
    scrollZoom: false,
    staticPlot: false,
    displayModeBar: true,
    modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d'],
    toImageButtonOptions: { format: 'png', filename: 'visualizer-export', height: 900, width: 1600 }
  }
};

async function defaultDockLoader(): Promise<{ default: ComponentType<DockComponentProps> }> {
  return import('./VisualizerSurfaceDock');
}

function clampFraction(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function computeSideTemplate(open: boolean, position: ShellDockPosition, fraction: number): string | undefined {
  if (!open || position !== 'side') {
    return undefined;
  }
  const safeFraction = clampFraction(fraction, 0.1, 0.9);
  const primary = 1 - safeFraction;
  const total = primary + safeFraction;
  const primaryPercent = (primary / total) * 100;
  const dockPercent = (safeFraction / total) * 100;
  return `${primaryPercent.toFixed(3)}% ${dockPercent.toFixed(3)}%`;
}

function renderDockContent(
  DockComponent: ComponentType<DockComponentProps> | null,
  isLoading: boolean
): ReactNode {
  if (isLoading) {
    return <div className="grid h-full place-content-center text-sm text-muted-foreground">Preparing…</div>;
  }
  if (DockComponent) {
    return <DockComponent theme={DENSE_PLOTLY_THEME} />;
  }
  return (
    <div className="grid h-full place-content-center text-sm text-muted-foreground" role="status">
      Dock content unavailable.
    </div>
  );
}

export function VisualizerSurface({
  primary,
  manifestHash = null,
  references,
  scenario,
  compare,
  chat,
  logs,
  dockLoader = defaultDockLoader,
  className
}: VisualizerSurfaceProps): JSX.Element {
  const { dockFraction, dockPosition, setDockFraction, setDockPosition } = useShellLayout();
  const [isDockOpen, setDockOpen] = useState(false);
  const [isDockLoading, setDockLoading] = useState(false);
  const [DockComponent, setDockComponent] = useState<ComponentType<DockComponentProps> | null>(null);
  const focusMode = useACXStore((state) => state.focusMode);
  const setFocusMode = useACXStore((state) => state.setFocusMode);
  const { view, activeTab, setView, setActiveTab, exitFocus } = useViewParam({ defaultTab: 'scenario' });
  const contextRailRef = useRef<HTMLDivElement | null>(null);
  const focusSyncRef = useRef(false);

  const loadDock = useCallback(async () => {
    if (DockComponent || isDockLoading) {
      setDockOpen(true);
      return;
    }
    try {
      setDockLoading(true);
      const module = await dockLoader();
      if (module?.default) {
        setDockComponent(() => module.default);
      }
      setDockOpen(true);
    } catch (error) {
      console.warn('Failed to load dock content', error);
    } finally {
      setDockLoading(false);
    }
  }, [DockComponent, dockLoader, isDockLoading]);

  const closeDock = useCallback(() => {
    setDockOpen(false);
  }, []);

  const toggleDock = useCallback(() => {
    if (isDockOpen) {
      closeDock();
    } else {
      void loadDock();
    }
  }, [closeDock, isDockOpen, loadDock]);

  const dockController = useMemo<DockController>(() => {
    return {
      isOpen: isDockOpen,
      isLoading: isDockLoading,
      dockPosition,
      dockFraction,
      open: () => {
        void loadDock();
      },
      close: closeDock,
      toggle: toggleDock,
      setDockPosition,
      setDockFraction
    } satisfies DockController;
  }, [closeDock, dockFraction, dockPosition, isDockLoading, isDockOpen, loadDock, setDockFraction, setDockPosition, toggleDock]);

  useEffect(() => {
    if (view === 'focus' && !focusMode) {
      focusSyncRef.current = true;
      setFocusMode(true);
    } else if (view !== 'focus' && focusMode) {
      focusSyncRef.current = true;
      setFocusMode(false);
    }
  }, [focusMode, setFocusMode, view]);

  useEffect(() => {
    if (focusSyncRef.current) {
      focusSyncRef.current = false;
      return;
    }
    if (focusMode && view !== 'focus') {
      setView('focus');
    } else if (!focusMode && view === 'focus') {
      exitFocus();
    }
  }, [exitFocus, focusMode, setView, view]);

  useEffect(() => {
    const rail = contextRailRef.current;
    if (!rail) {
      return;
    }
    if (view === 'focus') {
      rail.setAttribute('inert', '');
      rail.setAttribute('aria-hidden', 'true');
    } else {
      rail.removeAttribute('inert');
      rail.removeAttribute('aria-hidden');
    }
  }, [view]);

  useEffect(() => {
    if (view !== 'focus') {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        exitFocus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [exitFocus, view]);

  const topLevelColumns = useMemo(() => {
    return view === 'focus' ? 'minmax(0, 1fr) 0px' : 'minmax(0, 1fr) 340px';
  }, [view]);

  const sideTemplate = useMemo(() => computeSideTemplate(isDockOpen, dockPosition, dockFraction), [dockFraction, dockPosition, isDockOpen]);

  const dockNode = useMemo(() => {
    if (!isDockOpen) {
      return null;
    }
    const content = renderDockContent(DockComponent, isDockLoading);
    return (
      <div
        className={cn(
          'min-h-[160px] min-w-0 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-inner shadow-black/30',
          dockPosition === 'side' ? 'min-h-0' : undefined
        )}
        data-testid="visualizer-dock"
        data-orientation={dockPosition}
      >
        {content}
      </div>
    );
  }, [DockComponent, dockPosition, isDockLoading, isDockOpen]);

  const mainArea: ReactNode = (
    <div className="min-h-0 min-w-0 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-inner shadow-black/30" data-testid="visualizer-primary">
      {primary}
    </div>
  );

  let canvasSection: ReactNode;
  if (dockNode && dockPosition === 'side') {
    canvasSection = (
      <div
        className="grid min-h-0 flex-1 gap-4"
        style={sideTemplate ? { gridTemplateColumns: sideTemplate } : undefined}
      >
        {mainArea}
        {dockNode}
      </div>
    );
  } else if (dockNode && dockPosition === 'bottom') {
    const primaryFlex = clampFraction(1 - dockFraction, 0.1, 0.9);
    const dockFlex = clampFraction(dockFraction, 0.1, 0.9);
    canvasSection = (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="min-h-0" style={{ flexBasis: 0, flexGrow: primaryFlex }}>
          {mainArea}
        </div>
        <div className="flex min-h-0 flex-col" style={{ flexBasis: 0, flexGrow: dockFlex }}>
          {dockNode}
        </div>
      </div>
    );
  } else {
    canvasSection = (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {mainArea}
        {dockNode && dockPosition === 'bottom' ? dockNode : null}
      </div>
    );
  }

  const focusActive = view === 'focus';

  return (
    <section
      className={cn(
        'flex h-full min-h-[480px] flex-col overflow-hidden rounded-3xl border border-border/60 bg-background/80 backdrop-blur shadow-xl',
        className
      )}
      data-visualizer-view={view}
      data-testid="visualizer-surface"
    >
      <header className="flex items-center justify-between gap-4 border-b border-border/60 px-6 py-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Visualizer</p>
          <p className="text-xs text-muted-foreground">Inspect your scenario and supporting context.</p>
        </div>
      </header>
      <div
        className="grid min-h-0 flex-1 gap-0"
        style={{ gridTemplateColumns: topLevelColumns }}
      >
        <div className="min-h-0 min-w-0 px-6 py-5">
          {canvasSection}
        </div>
        <div
          ref={contextRailRef}
          className={cn('min-h-0 min-w-0 transition-[opacity,transform] duration-200 ease-out', focusActive ? 'pointer-events-none opacity-0' : 'opacity-100')}
          data-testid="context-rail-container"
        >
          <ContextRail
            activeTab={activeTab as ContextRailTab}
            onTabChange={setActiveTab as (tab: ContextRailTab) => void}
            manifestHash={manifestHash}
            references={references}
            scenario={scenario}
            compare={compare}
            chat={chat}
            logs={logs}
            dockController={dockController}
          />
        </div>
      </div>
    </section>
  );
}

export default VisualizerSurface;
