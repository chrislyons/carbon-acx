import { useCallback, useMemo, useState } from 'react';

import { Layout, type StageId, type StageStateMap } from './components/Layout';
import { LayerBrowser } from './components/LayerBrowser';
import { ProfileControls } from './components/ProfileControls';
import { ReferencesDrawer } from './components/ReferencesDrawer';
import { VizCanvas } from './components/VizCanvas';
import { ProfileProvider, useProfile } from './state/profile';
import { ActivityPlanner } from './components/ActivityPlanner';

export default function App(): JSX.Element {
  return (
    <ProfileProvider>
      <AppShell />
    </ProfileProvider>
  );
}

const STAGE_SEQUENCE: StageId[] = ['segment', 'profile', 'activity'];

function AppShell(): JSX.Element {
  const { activeLayers, primaryLayer, hasLifestyleOverrides } = useProfile();
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.matchMedia('(min-width: 1280px)').matches;
  });
  const [stage, setStage] = useState<StageId>('segment');
  const [unlockedStages, setUnlockedStages] = useState<Set<StageId>>(
    () => new Set(['segment'])
  );

  const optionalSegments = useMemo(
    () => activeLayers.filter((layer) => layer !== primaryLayer),
    [activeLayers, primaryLayer]
  );
  const segmentContextReady = activeLayers.length > 0;
  const profileUnlocked = unlockedStages.has('profile');
  const activityUnlocked = unlockedStages.has('activity');

  const stageStates: StageStateMap = useMemo(
    () => ({
      segment: { unlocked: true, ready: segmentContextReady },
      profile: { unlocked: profileUnlocked, ready: hasLifestyleOverrides },
      activity: { unlocked: activityUnlocked, ready: false }
    }),
    [segmentContextReady, profileUnlocked, hasLifestyleOverrides, activityUnlocked]
  );

  const stageSummaries = useMemo(() => {
    const baselineIncluded = activeLayers.includes(primaryLayer);
    const totalSegments = optionalSegments.length + (baselineIncluded ? 1 : 0);
    return {
      segment:
        totalSegments > 1
          ? `${totalSegments} segments active`
          : baselineIncluded
            ? 'Single baseline segment active'
            : 'No segments selected yet',
      profile: hasLifestyleOverrides
        ? 'Lifestyle inputs customised'
        : 'Using default lifestyle baseline',
      activity: activityUnlocked
        ? 'Activity planner unlocked'
        : 'Add lifestyle detail to unlock activities'
    };
  }, [activeLayers, primaryLayer, optionalSegments.length, hasLifestyleOverrides, activityUnlocked]);

  const isStageUnlocked = useCallback(
    (stageId: StageId) => stageId === 'segment' || unlockedStages.has(stageId),
    [unlockedStages]
  );

  const handleStageChange = useCallback(
    (nextStage: StageId) => {
      if (!isStageUnlocked(nextStage)) {
        return;
      }
      setStage(nextStage);
    },
    [isStageUnlocked]
  );

  const handleAdvanceStage = useCallback(
    (currentStage: StageId) => {
      const currentIndex = STAGE_SEQUENCE.indexOf(currentStage);
      if (currentIndex === -1) {
        return;
      }
      const nextStage = STAGE_SEQUENCE[currentIndex + 1];
      if (!nextStage) {
        return;
      }
      if (currentStage === 'segment' && !segmentContextReady) {
        return;
      }
      if (currentStage === 'profile' && !hasLifestyleOverrides) {
        return;
      }
      setUnlockedStages((previous) => {
        if (previous.has(nextStage)) {
          return previous;
        }
        const next = new Set(previous);
        next.add(nextStage);
        return next;
      });
      setStage(nextStage);
    },
    [segmentContextReady, hasLifestyleOverrides]
  );

  return (
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
          activity={<ActivityPlanner />}
          canvas={<VizCanvas stage={stage} />}
          references={
            <ReferencesDrawer
              id="references-panel"
              open={isDrawerOpen}
              onToggle={() => setIsDrawerOpen((open) => !open)}
            />
          }
          stage={stage}
          stageStates={stageStates}
          stageSummaries={stageSummaries}
          onStageChange={handleStageChange}
          onStageAdvance={handleAdvanceStage}
        />
      </main>
    </div>
  );
}
