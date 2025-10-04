import { KeyboardEvent, ReactNode, useId } from 'react';

interface LayoutProps {
  layerBrowser: ReactNode;
  controls: ReactNode;
  activity: ReactNode;
  canvas: ReactNode;
  references: ReactNode;
  stage: StageId;
  onStageChange: (stage: StageId) => void;
}

export type StageId = 'layer' | 'profile' | 'activity';

interface StageMeta {
  id: StageId;
  label: string;
  summary: string;
}

const STAGES: StageMeta[] = [
  {
    id: 'layer',
    label: 'Layer',
    summary: 'Choose the baseline layers that frame the story.'
  },
  {
    id: 'profile',
    label: 'Profile',
    summary: 'Dial in who we are modelling and their habits.'
  },
  {
    id: 'activity',
    label: 'Activity',
    summary: 'Pinpoint the specific actions to interrogate next.'
  }
];

export function Layout({
  layerBrowser,
  controls,
  activity,
  canvas,
  references,
  stage,
  onStageChange
}: LayoutProps): JSX.Element {
  const workflowLabelId = useId();
  const workflowId = useId();
  const activeStage = stage;

  const resolveStageClassName = (stage: StageMeta, activeIndex: number) => {
    const stageIndex = STAGES.findIndex((candidate) => candidate.id === stage.id);
    const isActive = activeStage === stage.id;
    const isComplete = stageIndex < activeIndex;
    const baseClassName =
      'group relative flex w-full items-start gap-[var(--gap-0)] rounded-2xl border px-[calc(var(--gap-0)*0.95)] py-[calc(var(--gap-0)*0.85)] text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500';
    const stateClassName = isActive
      ? 'border-sky-500/60 bg-slate-900/80 shadow-[0_0_0_1px_rgba(125,211,252,0.35)]'
      : isComplete
      ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-100/90 hover:bg-emerald-500/10'
      : 'border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-slate-600/70 hover:text-slate-100';
    return `${baseClassName} ${stateClassName}`;
  };

  const handleStageKeyDown = (stage: StageMeta) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const key = event.key.toLowerCase();
    const currentIndex = STAGES.findIndex((candidate) => candidate.id === activeStage);
    if (key === 'arrowright' || key === 'arrowdown') {
      event.preventDefault();
      const nextIndex = Math.min(STAGES.length - 1, currentIndex + 1);
      onStageChange(STAGES[nextIndex].id);
      return;
    }
    if (key === 'arrowleft' || key === 'arrowup') {
      event.preventDefault();
      const nextIndex = Math.max(0, currentIndex - 1);
      onStageChange(STAGES[nextIndex].id);
      return;
    }
    if (key === 'home') {
      event.preventDefault();
      onStageChange(STAGES[0].id);
      return;
    }
    if (key === 'end') {
      event.preventDefault();
      onStageChange(STAGES[STAGES.length - 1].id);
      return;
    }
    if (key === 'enter' || key === ' ') {
      event.preventDefault();
      onStageChange(stage.id);
    }
  };

  const renderStagePanel = (stage: StageId) => {
    switch (stage) {
      case 'layer':
        return layerBrowser;
      case 'profile':
        return controls;
      case 'activity':
        return activity;
      default:
        return null;
    }
  };

  const activeIndex = STAGES.findIndex((stage) => stage.id === activeStage);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-[var(--gap-1)] lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
      <div className="order-2 flex min-h-0 flex-col lg:order-1 lg:max-h-[calc(100vh-128px)] lg:pr-[calc(var(--gap-0)*0.75)]">
        <div className="sticky top-0 z-20 bg-slate-950/85 pb-[calc(var(--gap-0)*0.5)] pt-[var(--gap-0)] backdrop-blur">
          <p id={workflowLabelId} className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Workflow
          </p>
          <ol
            role="list"
            aria-labelledby={workflowLabelId}
            className="mt-[calc(var(--gap-0)*0.6)] flex flex-col gap-[calc(var(--gap-0)*0.55)]"
          >
            {STAGES.map((stage) => {
              const panelId = `${workflowId}-${stage.id}-panel`;
              const controlId = `${workflowId}-${stage.id}-control`;
              const isActive = activeStage === stage.id;
              const stageIndex = STAGES.findIndex((candidate) => candidate.id === stage.id);
              const isComplete = stageIndex < activeIndex;
              return (
                <li key={stage.id} className="list-none">
                  <button
                    type="button"
                    id={controlId}
                    aria-controls={panelId}
                    aria-expanded={isActive}
                    aria-current={isActive ? 'step' : undefined}
                    className={resolveStageClassName(stage, activeIndex)}
                    onClick={() => onStageChange(stage.id)}
                    onKeyDown={handleStageKeyDown(stage)}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] font-semibold transition ${
                        isActive
                          ? 'border-sky-300/80 bg-sky-400/20 text-sky-200'
                          : isComplete
                          ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-200'
                          : 'border-slate-700 bg-slate-800/70 text-slate-400'
                      }`}
                    >
                      {stageIndex + 1}
                    </span>
                    <span className="flex flex-col gap-[2px]">
                      <span className="text-[12px] font-semibold uppercase tracking-[0.24em] text-slate-200">
                        {stage.label}
                      </span>
                      <span className="text-[11px] text-slate-400">{stage.summary}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pt-[calc(var(--gap-0)*0.9)]">
          {STAGES.map((stage) => {
            const panelId = `${workflowId}-${stage.id}-panel`;
            const controlId = `${workflowId}-${stage.id}-control`;
            const isActive = activeStage === stage.id;
            return (
              <section
                key={stage.id}
                role="region"
                id={panelId}
                aria-labelledby={controlId}
                hidden={!isActive}
                className={`${isActive ? 'block' : 'hidden'} min-h-0`}
              >
                {isActive ? (
                  <div className="space-y-[calc(var(--gap-1)*0.85)]">{renderStagePanel(stage.id)}</div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
      <div className="order-1 flex min-h-0 flex-col gap-[var(--gap-1)] lg:order-2 lg:min-h-[calc(100vh-128px)]">
        <div className="min-h-0 lg:flex-1">{canvas}</div>
        <div className="min-h-0 lg:flex-none">{references}</div>
      </div>
    </div>
  );
}
