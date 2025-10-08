import {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState
} from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import { ResizableDivider } from './ResizableDivider';
import { Button } from './ui/button';

export type StageId = 'sector' | 'profile' | 'activity';

export interface StageStateMeta {
  unlocked: boolean;
  ready: boolean;
}

export type StageStateMap = Record<StageId, StageStateMeta>;

export type StageSummaries = Partial<Record<StageId, string>>;

interface LayoutProps {
  layerBrowser: ReactNode;
  controls: ReactNode;
  activity: ReactNode;
  canvas: ReactNode;
  scopeIndicator?: ReactNode;
  references: ReactNode;
  stage: StageId;
  stageStates: StageStateMap;
  stageSummaries?: StageSummaries;
  onStageChange: (stage: StageId) => void;
  onStageAdvance: (stage: StageId) => void;
  focusMode: boolean;
  onFocusModeChange: (focusMode: boolean) => void;
  referencesOpen: boolean;
  onToggleReferences: () => void;
}

interface StageMeta {
  id: StageId;
  label: string;
  summary: string;
  lockedSummary?: string;
  advanceLabel?: string;
  advanceHelper?: string;
  nextStage?: StageId;
}

const STAGES: StageMeta[] = [
  {
    id: 'sector',
    label: 'Sectors',
    summary: 'Anchor the analysis to the sectors you want to compare.',
    advanceLabel: 'Continue to profiles',
    advanceHelper: 'Lock in the sectors that matter, then deepen the persona.',
    nextStage: 'profile'
  },
  {
    id: 'profile',
    label: 'Profiles',
    summary: 'Shape the representative lifestyle for the active sectors.',
    lockedSummary: 'Choose your sectors above to unlock profile refinement.',
    advanceLabel: 'Drill into activities',
    advanceHelper: 'Dial commute, diet, and media habits to expose activities.',
    nextStage: 'activity'
  },
  {
    id: 'activity',
    label: 'Activities',
    summary: 'Trace the flows and activities surfaced by your context.',
    lockedSummary: 'Tune the profile above to unlock the activity planner.'
  }
];

const MIN_LEFT_WIDTH = 260;
const MAX_LEFT_WIDTH = 520;
const MIN_RIGHT_WIDTH = 260;
const MAX_RIGHT_WIDTH = 440;
const MIN_MAIN_WIDTH = 360;
const RESIZER_ALLOWANCE = 16;
const KEYBOARD_RESIZE_STEP = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function renderStagePanel(stage: StageId, slots: Pick<LayoutProps, 'layerBrowser' | 'controls' | 'activity'>) {
  switch (stage) {
    case 'sector':
      return slots.layerBrowser;
    case 'profile':
      return slots.controls;
    case 'activity':
      return slots.activity;
    default:
      return null;
  }
}

export function Layout({
  layerBrowser,
  controls,
  activity,
  canvas,
  scopeIndicator,
  references,
  stage,
  stageStates,
  stageSummaries,
  onStageChange,
  onStageAdvance,
  focusMode,
  onFocusModeChange,
  referencesOpen,
  onToggleReferences
}: LayoutProps): JSX.Element {
  const workflowLabelId = useId();
  const workflowId = useId();
  const stageIds = STAGES.map((meta) => meta.id);
  const activeIndex = stageIds.indexOf(stage);

  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return 320;
    }
    if (window.innerWidth < 1440) {
      return 300;
    }
    return 340;
  });
  const [rightWidth, setRightWidth] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return 320;
    }
    if (window.innerWidth < 1440) {
      return 300;
    }
    return 320;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftPaneRef = useRef<HTMLElement | null>(null);
  const rightPaneRef = useRef<HTMLElement | null>(null);
  const leftWidthRef = useRef(leftWidth);
  const rightWidthRef = useRef(rightWidth);

  useEffect(() => {
    leftWidthRef.current = leftWidth;
  }, [leftWidth]);

  useEffect(() => {
    rightWidthRef.current = rightWidth;
  }, [rightWidth]);

  const leftHidden = focusMode || isLeftCollapsed;
  const rightHidden = focusMode || !referencesOpen;

  useEffect(() => {
    const element = leftPaneRef.current;
    if (!element) {
      return;
    }
    if (leftHidden) {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    } else {
      element.removeAttribute('inert');
      element.removeAttribute('aria-hidden');
    }
  }, [leftHidden]);

  useEffect(() => {
    const element = rightPaneRef.current;
    if (!element) {
      return;
    }
    if (rightHidden) {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    } else {
      element.removeAttribute('inert');
      element.removeAttribute('aria-hidden');
    }
  }, [rightHidden]);

  const clampLeftWidth = useCallback(
    (candidate: number) => {
      const container = containerRef.current;
      if (!container) {
        return clamp(candidate, MIN_LEFT_WIDTH, MAX_LEFT_WIDTH);
      }
      const containerWidth = container.getBoundingClientRect().width;
      const visibleRight = !rightHidden;
      const resizerSpace = RESIZER_ALLOWANCE + (visibleRight ? RESIZER_ALLOWANCE : 0);
      const available = containerWidth - (visibleRight ? rightWidthRef.current : 0) - resizerSpace;
      const availableForPane = Math.max(0, available - MIN_MAIN_WIDTH);
      const upperBound = Math.min(MAX_LEFT_WIDTH, availableForPane);
      const lowerBound = Math.min(MIN_LEFT_WIDTH, upperBound);
      return clamp(candidate, lowerBound, upperBound);
    },
    [rightHidden]
  );

  const clampRightWidth = useCallback(
    (candidate: number) => {
      const container = containerRef.current;
      if (!container) {
        return clamp(candidate, MIN_RIGHT_WIDTH, MAX_RIGHT_WIDTH);
      }
      const containerWidth = container.getBoundingClientRect().width;
      const visibleLeft = !leftHidden;
      const resizerSpace = RESIZER_ALLOWANCE + (visibleLeft ? RESIZER_ALLOWANCE : 0);
      const available = containerWidth - (visibleLeft ? leftWidthRef.current : 0) - resizerSpace;
      const availableForPane = Math.max(0, available - MIN_MAIN_WIDTH);
      const upperBound = Math.min(MAX_RIGHT_WIDTH, availableForPane);
      const lowerBound = Math.min(MIN_RIGHT_WIDTH, upperBound);
      return clamp(candidate, lowerBound, upperBound);
    },
    [leftHidden]
  );

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setLeftWidth((value) => clampLeftWidth(value));
      setRightWidth((value) => clampRightWidth(value));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [clampLeftWidth, clampRightWidth]);

  const handleLeftResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) {
        return;
      }
      event.preventDefault();
      const pointerId = event.pointerId;
      event.currentTarget.setPointerCapture?.(pointerId);
      const startX = event.clientX;
      const startWidth = leftWidthRef.current;

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        const delta = pointerEvent.clientX - startX;
        const next = clampLeftWidth(startWidth + delta);
        setLeftWidth(next);
      };

      const handlePointerUp = () => {
        event.currentTarget.releasePointerCapture?.(pointerId);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp, { once: true });
    },
    [clampLeftWidth]
  );

  const handleRightResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) {
        return;
      }
      event.preventDefault();
      const pointerId = event.pointerId;
      event.currentTarget.setPointerCapture?.(pointerId);
      const startX = event.clientX;
      const startWidth = rightWidthRef.current;

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        const delta = startX - pointerEvent.clientX;
        const next = clampRightWidth(startWidth + delta);
        setRightWidth(next);
      };

      const handlePointerUp = () => {
        event.currentTarget.releasePointerCapture?.(pointerId);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp, { once: true });
    },
    [clampRightWidth]
  );

  const handleLeftKeyboardResize = useCallback(
    (delta: number) => {
      setLeftWidth((value) => clampLeftWidth(value + delta));
    },
    [clampLeftWidth]
  );

  const handleRightKeyboardResize = useCallback(
    (delta: number) => {
      setRightWidth((value) => clampRightWidth(value + delta));
    },
    [clampRightWidth]
  );

  const isStageUnlocked = useCallback(
    (stageId: StageId) => stageId === 'sector' || Boolean(stageStates[stageId]?.unlocked),
    [stageStates]
  );

  const selectStage = useCallback(
    (stageId: StageId) => {
      if (!isStageUnlocked(stageId)) {
        return;
      }
      onStageChange(stageId);
    },
    [isStageUnlocked, onStageChange]
  );

  const findNextUnlockedIndex = useCallback(
    (startIndex: number, direction: 1 | -1) => {
      let index = startIndex + direction;
      while (index >= 0 && index < stageIds.length) {
        const candidate = stageIds[index];
        if (isStageUnlocked(candidate)) {
          return index;
        }
        index += direction;
      }
      return startIndex;
    },
    [isStageUnlocked, stageIds]
  );

  const handleStageKeyDown = (meta: StageMeta) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const key = event.key.toLowerCase();
    const currentIndex = stageIds.indexOf(meta.id);
    const changeStage = (nextStageId: StageId | undefined) => {
      if (!nextStageId || nextStageId === stage || !isStageUnlocked(nextStageId)) {
        return;
      }
      onStageChange(nextStageId);
    };
    if (key === 'arrowright' || key === 'arrowdown') {
      event.preventDefault();
      const nextIndex = findNextUnlockedIndex(currentIndex, 1);
      changeStage(stageIds[nextIndex] ?? meta.id);
      return;
    }
    if (key === 'arrowleft' || key === 'arrowup') {
      event.preventDefault();
      const nextIndex = findNextUnlockedIndex(currentIndex, -1);
      changeStage(stageIds[nextIndex] ?? meta.id);
      return;
    }
    if (key === 'home') {
      event.preventDefault();
      const firstUnlocked = stageIds.find((candidate) => isStageUnlocked(candidate));
      changeStage(firstUnlocked);
      return;
    }
    if (key === 'end') {
      event.preventDefault();
      for (let index = stageIds.length - 1; index >= 0; index -= 1) {
        const candidate = stageIds[index];
        if (isStageUnlocked(candidate)) {
          changeStage(candidate);
          break;
        }
      }
      return;
    }
    if (key === 'enter' || key === ' ') {
      event.preventDefault();
      selectStage(meta.id);
    }
  };

  const focusButtonIcon = focusMode ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />;
  const focusButtonLabel = focusMode ? 'Exit focus mode' : 'Enter focus mode';

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
    >
      {leftHidden && !focusMode ? (
        <button
          type="button"
          onClick={() => setIsLeftCollapsed(false)}
          className="absolute left-0 top-1/2 hidden -translate-y-1/2 translate-x-2 items-center gap-1 rounded-r-lg border border-border/60 bg-background/90 px-2 py-1 text-2xs font-semibold uppercase tracking-[0.28em] text-muted-foreground shadow-lg transition hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:flex"
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Expand workflow panel</span>
        </button>
      ) : null}
      <aside
        ref={leftPaneRef}
        id="workflow-panel"
        role="complementary"
        aria-label="Workflow controls"
        className={cn(
          'left-pane relative hidden h-full flex-col overflow-hidden border-r border-border/60 bg-background/80 transition-[flex-basis,width,opacity] duration-200 ease-out lg:flex',
          leftHidden ? 'pointer-events-none opacity-0' : 'opacity-100'
        )}
        style={{
          flexBasis: leftHidden ? 0 : leftWidth,
          width: leftHidden ? 0 : leftWidth
        }}
      >
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-5 py-4 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p id={workflowLabelId} className="text-[11px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                  Context depth
                </p>
                <p className="mt-2 text-[12px] text-muted-foreground/80">
                  Feed the console more context to unlock deeper, sector-aware visualizations.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                onClick={() => setIsLeftCollapsed(true)}
                aria-controls="workflow-panel"
                aria-expanded={!leftHidden}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Collapse workflow panel</span>
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <ol role="list" aria-labelledby={workflowLabelId} className="flex flex-col gap-5">
              {STAGES.map((meta) => {
                const state = stageStates[meta.id] ?? { unlocked: meta.id === 'sector', ready: false };
                const unlocked = isStageUnlocked(meta.id);
                const isActive = unlocked && stage === meta.id;
                const stageIndex = stageIds.indexOf(meta.id);
                const isComplete = unlocked && stageIndex < activeIndex;
                const statusLabel = !unlocked
                  ? 'Locked'
                  : isActive
                  ? 'Active'
                  : isComplete
                  ? 'Complete'
                  : state.ready
                  ? 'Ready'
                  : 'Pending';
                const statusTone = !unlocked
                  ? 'text-muted-foreground'
                  : isActive
                  ? 'text-primary'
                  : isComplete
                  ? 'text-emerald-300'
                  : state.ready
                  ? 'text-foreground'
                  : 'text-muted-foreground';
                const summary = stageSummaries?.[meta.id] ?? meta.summary;
                const panelId = `${workflowId}-${meta.id}-panel`;
                const controlId = `${workflowId}-${meta.id}-control`;
                return (
                  <li key={meta.id} className="list-none">
                    <section
                      aria-labelledby={controlId}
                      aria-current={isActive ? 'step' : undefined}
                      className={cn(
                        'acx-card flex flex-col gap-4 border border-border/70 bg-background/60 p-5 transition shadow-inner shadow-black/10',
                        isActive
                          ? 'border-primary/60 bg-background/80 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
                          : unlocked
                          ? 'hover:border-border'
                          : 'opacity-60'
                      )}
                    >
                      <header className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          id={controlId}
                          aria-controls={panelId}
                          aria-expanded={isActive}
                          aria-disabled={!unlocked}
                          className={cn(
                            'flex flex-1 flex-col items-start text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                            unlocked ? '' : 'cursor-not-allowed'
                          )}
                          onClick={() => selectStage(meta.id)}
                          onKeyDown={handleStageKeyDown(meta)}
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-foreground">
                            {meta.label}
                          </span>
                          <span className="mt-2 text-[12px] text-muted-foreground">
                            {isActive ? meta.summary : summary}
                          </span>
                        </button>
                        <span className={cn('text-[10px] font-semibold uppercase tracking-[0.3em]', statusTone)}>
                          {statusLabel}
                        </span>
                      </header>
                      {unlocked ? (
                        isActive ? (
                          <div className="space-y-5">
                            <div id={panelId} role="region" aria-labelledby={controlId} className="space-y-5">
                              {renderStagePanel(meta.id, { layerBrowser, controls, activity })}
                            </div>
                            {meta.nextStage && meta.advanceLabel ? (
                              <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
                                <Button
                                  type="button"
                                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary transition hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:border-border/60 disabled:bg-muted/30 disabled:text-muted-foreground"
                                  onClick={() => onStageAdvance(meta.id)}
                                  disabled={!state.ready}
                                >
                                  {meta.advanceLabel}
                                  <span aria-hidden="true">→</span>
                                </Button>
                                {meta.advanceHelper ? (
                                  <p className="text-[11px] text-muted-foreground">{meta.advanceHelper}</p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">{summary}</p>
                        )
                      ) : (
                        <p className="text-[11px] text-muted-foreground">{meta.lockedSummary ?? meta.summary}</p>
                      )}
                    </section>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </aside>
      {!leftHidden ? (
        <ResizableDivider
          aria-controls="workflow-panel main-content"
          aria-valuemin={MIN_LEFT_WIDTH}
          aria-valuemax={MAX_LEFT_WIDTH}
          aria-valuenow={Math.round(leftWidth)}
          label="Resize workflow panel"
          className="hidden cursor-col-resize bg-transparent lg:flex"
          onResizeStart={handleLeftResizeStart}
          onResizeBy={(delta) => {
            const direction = Math.sign(delta);
            if (direction === 0) {
              return;
            }
            handleLeftKeyboardResize(direction * KEYBOARD_RESIZE_STEP);
          }}
        />
      ) : null}
      <section id="main-content" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 lg:px-6 lg:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[200px]">
              {scopeIndicator ? <div className="max-w-full overflow-hidden">{scopeIndicator}</div> : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={focusMode ? 'default' : 'outline'}
                aria-pressed={focusMode}
                onClick={() => onFocusModeChange(!focusMode)}
                className={cn(
                  'inline-flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.25em]',
                  focusMode ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground'
                )}
              >
                {focusButtonIcon}
                {focusButtonLabel}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onToggleReferences}
                aria-expanded={!rightHidden}
                aria-controls="references-panel"
                className="hidden items-center gap-2 text-2xs font-semibold uppercase tracking-[0.25em] text-muted-foreground hover:text-primary lg:inline-flex"
              >
                <ChevronRight className={cn('h-4 w-4 transition', rightHidden ? 'rotate-0' : 'rotate-90')} aria-hidden="true" />
                References
              </Button>
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
          <div className="min-h-0 flex-1 overflow-hidden">
            {canvas}
          </div>
        </div>
      </section>
      {!rightHidden ? (
        <ResizableDivider
          aria-controls="main-content references-panel"
          aria-valuemin={MIN_RIGHT_WIDTH}
          aria-valuemax={MAX_RIGHT_WIDTH}
          aria-valuenow={Math.round(rightWidth)}
          label="Resize references panel"
          className="hidden cursor-col-resize bg-transparent lg:flex"
          onResizeStart={handleRightResizeStart}
          onResizeBy={(delta) => {
            const direction = Math.sign(delta);
            if (direction === 0) {
              return;
            }
            handleRightKeyboardResize(direction > 0 ? -KEYBOARD_RESIZE_STEP : KEYBOARD_RESIZE_STEP);
          }}
        />
      ) : null}
      <aside
        ref={rightPaneRef}
        id="references-panel"
        role="complementary"
        aria-label="References"
        className={cn(
          'right-pane hidden h-full flex-col overflow-hidden border-l border-border/60 bg-background/80 transition-[flex-basis,width,opacity] duration-200 ease-out lg:flex',
          rightHidden ? 'pointer-events-none opacity-0' : 'opacity-100'
        )}
        style={{
          flexBasis: rightHidden ? 0 : rightWidth,
          width: rightHidden ? 0 : rightWidth
        }}
      >
        <div className="flex h-full flex-col overflow-hidden p-4 lg:p-6">{references}</div>
      </aside>
    </div>
  );
}
