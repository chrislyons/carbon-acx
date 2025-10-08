import {
  lazy,
  type KeyboardEvent as ReactKeyboardEvent,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef
} from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { ContextRailTab, DockController } from './types';

const ReferencesTab = lazy(async () => import('./tabs/ReferencesTab'));
const ScenarioTab = lazy(async () => import('./tabs/ScenarioTab'));
const CompareTab = lazy(async () => import('./tabs/CompareTab'));
const ChatTab = lazy(async () => import('./tabs/ChatTab'));
const LogsTab = lazy(async () => import('./tabs/LogsTab'));

const TAB_ORDER: ContextRailTab[] = ['refs', 'scenario', 'compare', 'chat', 'logs'];

const TAB_LABELS: Record<ContextRailTab, string> = {
  refs: 'References',
  scenario: 'Scenario',
  compare: 'Compare',
  chat: 'Chat',
  logs: 'Logs'
};

export interface ContextRailProps {
  activeTab: ContextRailTab;
  onTabChange: (tab: ContextRailTab) => void;
  manifestHash?: string | null;
  references: readonly string[];
  scenario?: ReactNode;
  compare?: ReactNode | ((controller: DockController) => ReactNode);
  chat?: ReactNode;
  logs?: ReactNode;
  dockController: DockController;
  className?: string;
}

const FALLBACK_NODE = (
  <div className="grid min-h-[160px] place-items-center text-sm text-muted-foreground">Loading…</div>
);

export function ContextRail({
  activeTab,
  onTabChange,
  manifestHash = null,
  references,
  scenario,
  compare,
  chat,
  logs,
  dockController,
  className
}: ContextRailProps): JSX.Element {
  const baseId = useId();
  const tabRefs = useRef<Partial<Record<ContextRailTab, HTMLButtonElement | null>>>({});
  const scrollPositions = useRef<Map<ContextRailTab, number>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const tabIdLookup = useMemo(() => {
    return TAB_ORDER.reduce<Record<ContextRailTab, string>>((acc, tab) => {
      acc[tab] = `${baseId}-tab-${tab}`;
      return acc;
    }, {} as Record<ContextRailTab, string>);
  }, [baseId]);

  const panelIdLookup = useMemo(() => {
    return TAB_ORDER.reduce<Record<ContextRailTab, string>>((acc, tab) => {
      acc[tab] = `${baseId}-panel-${tab}`;
      return acc;
    }, {} as Record<ContextRailTab, string>);
  }, [baseId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const handleScroll = () => {
      scrollPositions.current.set(activeTab, container.scrollTop);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const restore = () => {
      const stored = scrollPositions.current.get(activeTab) ?? 0;
      container.scrollTop = stored;
    };
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(restore);
      return;
    }
    restore();
  }, [activeTab]);

  const handleTabKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const key = event.key.toLowerCase();
      const currentTarget = event.target as HTMLElement | null;
      const currentIndex = currentTarget ? Number(currentTarget.dataset.index) : NaN;
      if (Number.isNaN(currentIndex)) {
        return;
      }
      let nextIndex = currentIndex;
      if (key === 'arrowright') {
        event.preventDefault();
        nextIndex = (currentIndex + 1) % TAB_ORDER.length;
      } else if (key === 'arrowleft') {
        event.preventDefault();
        nextIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
      } else if (key === 'home') {
        event.preventDefault();
        nextIndex = 0;
      } else if (key === 'end') {
        event.preventDefault();
        nextIndex = TAB_ORDER.length - 1;
      } else {
        return;
      }
      const nextTab = TAB_ORDER[nextIndex];
      onTabChange(nextTab);
      tabRefs.current[nextTab]?.focus();
    },
    [onTabChange]
  );

  const renderContent = useCallback((): ReactNode => {
    switch (activeTab) {
      case 'refs':
        return (
          <ReferencesTab
            manifestHash={manifestHash}
            references={references}
          />
        );
      case 'scenario':
        return <ScenarioTab>{scenario}</ScenarioTab>;
      case 'compare':
        return <CompareTab controller={dockController} content={compare} />;
      case 'chat':
        return <ChatTab>{chat}</ChatTab>;
      case 'logs':
        return <LogsTab>{logs}</LogsTab>;
      default:
        return null;
    }
  }, [activeTab, chat, compare, dockController, manifestHash, references, scenario]);

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-border/60 bg-background/70 backdrop-blur',
        className
      )}
    >
      <header className="border-b border-border/60 px-5 py-4">
        <nav
          role="tablist"
          aria-label="Context view"
          className="flex items-center gap-2"
          onKeyDown={handleTabKeyDown}
          data-testid="context-rail-tabs"
        >
          {TAB_ORDER.map((tab, index) => (
            <button
              key={tab}
              ref={(element) => {
                tabRefs.current[tab] = element;
              }}
              id={tabIdLookup[tab]}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={panelIdLookup[tab]}
              tabIndex={activeTab === tab ? 0 : -1}
              data-index={index}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] transition',
                activeTab === tab
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
              onClick={() => onTabChange(tab)}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </header>
      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-y-auto px-5 py-5"
        role="tabpanel"
        id={panelIdLookup[activeTab]}
        aria-labelledby={tabIdLookup[activeTab]}
        tabIndex={0}
        data-testid="context-rail-scroll"
      >
        <Suspense fallback={FALLBACK_NODE}>{renderContent()}</Suspense>
      </div>
    </aside>
  );
}

export default ContextRail;
