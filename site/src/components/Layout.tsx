import { KeyboardEvent, ReactNode, useCallback, useId } from 'react';

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
  onStageAdvance
}: LayoutProps): JSX.Element {
  const workflowLabelId = useId();
  const workflowId = useId();
  const stageIds = STAGES.map((meta) => meta.id);
  const activeIndex = stageIds.indexOf(stage);

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

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-[var(--gap-1)] lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
      <div className="order-2 flex min-h-0 flex-col lg:order-1 lg:max-h-[calc(100vh-128px)] lg:pr-[calc(var(--gap-0)*0.75)]">
        <div className="sticky top-0 z-20 bg-slate-950/85 pb-[calc(var(--gap-0)*0.5)] pt-[var(--gap-0)] backdrop-blur">
          <p id={workflowLabelId} className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Context depth
          </p>
          <p className="mt-[6px] text-[12px] text-slate-400">
            Feed the console more context to unlock deeper, sector-aware visualizations.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pt-[calc(var(--gap-0)*0.9)]">
          <ol
            role="list"
            aria-labelledby={workflowLabelId}
            className="flex flex-col gap-[calc(var(--gap-0)*0.75)]"
          >
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
                ? 'text-slate-500'
                : isActive
                ? 'text-sky-300'
                : isComplete
                ? 'text-emerald-300'
                : state.ready
                ? 'text-slate-200'
                : 'text-slate-500';
              const summary = stageSummaries?.[meta.id] ?? meta.summary;
              const panelId = `${workflowId}-${meta.id}-panel`;
              const controlId = `${workflowId}-${meta.id}-control`;
              return (
                <li key={meta.id} className="list-none">
                  <section
                    aria-labelledby={controlId}
                    aria-current={isActive ? 'step' : undefined}
                    className={`acx-card flex flex-col gap-[calc(var(--gap-0)*0.75)] border border-slate-800/70 bg-slate-950/60 p-[calc(var(--gap-1)*0.85)] transition ${
                      isActive
                        ? 'border-sky-500/60 bg-slate-900/80 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
                        : unlocked
                        ? 'hover:border-slate-700/70'
                        : 'opacity-60'
                    }`}
                  >
                    <header className="flex items-start justify-between gap-[var(--gap-0)]">
                      <button
                        type="button"
                        id={controlId}
                        aria-controls={panelId}
                        aria-expanded={isActive}
                        aria-disabled={!unlocked}
                        className={`flex flex-1 flex-col items-start text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                          unlocked ? '' : 'cursor-not-allowed'
                        }`}
                        onClick={() => selectStage(meta.id)}
                        onKeyDown={handleStageKeyDown(meta)}
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-200">
                          {meta.label}
                        </span>
                        <span className="mt-[6px] text-[12px] text-slate-400">
                          {isActive ? meta.summary : summary}
                        </span>
                      </button>
                      <span className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${statusTone}`}>
                        {statusLabel}
                      </span>
                    </header>
                    {unlocked ? (
                      isActive ? (
                        <div className="space-y-[calc(var(--gap-1)*0.85)]">
                          <div
                            id={panelId}
                            role="region"
                            aria-labelledby={controlId}
                            className="space-y-[calc(var(--gap-1)*0.85)]"
                          >
                            {renderStagePanel(meta.id, { layerBrowser, controls, activity })}
                          </div>
                          {meta.nextStage && meta.advanceLabel ? (
                            <div className="flex flex-col gap-[var(--gap-0)] border-t border-slate-800/60 pt-[calc(var(--gap-0)*0.85)]">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-500/50 bg-sky-500/10 px-[var(--gap-1)] py-[calc(var(--gap-0)*0.85)] text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100 transition hover:bg-sky-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/40 disabled:text-slate-500"
                                onClick={() => onStageAdvance(meta.id)}
                                disabled={!state.ready}
                              >
                                {meta.advanceLabel}
                                <span aria-hidden="true">→</span>
                              </button>
                              {meta.advanceHelper ? (
                                <p className="text-[11px] text-slate-400">{meta.advanceHelper}</p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">{summary}</p>
                      )
                    ) : (
                      <p className="text-[11px] text-slate-500">{meta.lockedSummary ?? meta.summary}</p>
                    )}
                  </section>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <div className="order-1 flex min-h-0 flex-col gap-[var(--gap-1)] lg:order-2 lg:min-h-[calc(100vh-128px)]">
        {scopeIndicator ? (
          <div className="lg:flex-none">{scopeIndicator}</div>
        ) : null}
        <div className="min-h-0 lg:flex-1">{canvas}</div>
        <div className="min-h-0 lg:flex-none">{references}</div>
      </div>
    </div>
  );
}
