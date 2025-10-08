import { useCallback, useEffect, useMemo, useState } from 'react';

import type { FigureDataUpdate } from './components/ChartContainer';
import { Layout, type StageId, type StageStateMap } from './components/Layout';
import { SectorBrowser } from './components/LayerBrowser';
import { ProfileControls } from './components/ProfileControls';
import { ReferencesDrawer } from './components/ReferencesDrawer';
import { VizCanvas } from './components/VizCanvas';
import { ProfileProvider, useProfile } from './state/profile';
import { useACXStore, setACXStoreState } from './store/useACXStore';
import { buildSearchFromState, parseACXStateFromSearch } from './utils/url';
import { ActivityPlanner } from './components/ActivityPlanner';
import { ScopeBar, type ScopePin, type ScopeSectorDescriptor } from './components/ScopeBar';
import type { FigureDataStatus } from './lib/DataLoader';
import { useLayerCatalog } from './lib/useLayerCatalog';
import { Button } from './components/ui/button';
import { Toolbar } from './components/ui/toolbar';

export default function App(): JSX.Element {
  useUrlStateSync();
  return (
    <ProfileProvider>
      <AppShell />
    </ProfileProvider>
  );
}

function useUrlStateSync(): void {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const applySearch = (search: string) => {
      const parsed = parseACXStateFromSearch(search);
      setACXStoreState({
        figureId: parsed.figureId,
        selectedLayers: new Set(parsed.layers),
        scale: parsed.scale,
        period: parsed.period
      });
    };
    applySearch(window.location.search);
    const handlePopState = () => {
      applySearch(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const unsubscribe = useACXStore.subscribe((state, previous) => {
      const nextSnapshot = {
        figureId: state.figureId,
        layers: Array.from(state.selectedLayers),
        scale: state.scale,
        period: state.period
      };
      const previousSnapshot = previous
        ? {
            figureId: previous.figureId,
            layers: Array.from(previous.selectedLayers),
            scale: previous.scale,
            period: previous.period
          }
        : null;
      if (
        previousSnapshot &&
        previousSnapshot.figureId === nextSnapshot.figureId &&
        previousSnapshot.scale === nextSnapshot.scale &&
        previousSnapshot.period === nextSnapshot.period &&
        previousSnapshot.layers.length === nextSnapshot.layers.length &&
        previousSnapshot.layers.every((layer, index) => layer === nextSnapshot.layers[index])
      ) {
        return;
      }
      const search = buildSearchFromState(nextSnapshot, window.location.search);
      if (search === window.location.search) {
        return;
      }
      const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    });
    return () => {
      unsubscribe();
    };
  }, []);
}

const STAGE_SEQUENCE: StageId[] = ['sector', 'profile', 'activity'];

function AppShell(): JSX.Element {
  const { activeLayers, primaryLayer, hasLifestyleOverrides } = useProfile();
  const { layers: layerCatalog } = useLayerCatalog();
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.matchMedia('(min-width: 1280px)').matches;
  });
  const [stage, setStage] = useState<StageId>('sector');
  const [unlockedStages, setUnlockedStages] = useState<Set<StageId>>(
    () => new Set(['sector'])
  );
  const focusMode = useACXStore((state) => state.focusMode);
  const setFocusMode = useACXStore((state) => state.setFocusMode);

  const [figureReferences, setFigureReferences] = useState<string[] | null>(null);
  const [figureReferenceStatus, setFigureReferenceStatus] = useState<FigureDataStatus | null>(null);
  const [figureReferenceError, setFigureReferenceError] = useState<string | null>(null);

  const handleFigureDataChange = useCallback((update: FigureDataUpdate) => {
    if (
      update.figureId == null &&
      update.status === 'idle' &&
      update.references.length === 0 &&
      !update.error
    ) {
      setFigureReferences(null);
      setFigureReferenceStatus(null);
      setFigureReferenceError(null);
      return;
    }
    setFigureReferences(update.references);
    setFigureReferenceStatus(update.status);
    setFigureReferenceError(update.error ?? null);
  }, []);

  const optionalSectors = useMemo(
    () => activeLayers.filter((layer) => layer !== primaryLayer),
    [activeLayers, primaryLayer]
  );

  const layerTitleLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    layerCatalog.forEach((layer) => {
      if (layer?.id) {
        lookup.set(layer.id, layer.title ?? layer.id);
      }
    });
    return lookup;
  }, [layerCatalog]);

  const activeSectorDescriptors = useMemo<ScopeSectorDescriptor[]>(
    () =>
      activeLayers.map((id) => ({
        id,
        label: layerTitleLookup.get(id) ?? id
      })),
    [activeLayers, layerTitleLookup]
  );
  const sectorContextReady = activeLayers.length > 0;
  const profileUnlocked = unlockedStages.has('profile');
  const activityUnlocked = unlockedStages.has('activity');

  const stageStates: StageStateMap = useMemo(
    () => ({
      sector: { unlocked: true, ready: sectorContextReady },
      profile: { unlocked: profileUnlocked, ready: hasLifestyleOverrides },
      activity: { unlocked: activityUnlocked, ready: false }
    }),
    [sectorContextReady, profileUnlocked, hasLifestyleOverrides, activityUnlocked]
  );

  const stageSummaries = useMemo(() => {
    const baselineIncluded = activeLayers.includes(primaryLayer);
    const totalSectors = optionalSectors.length + (baselineIncluded ? 1 : 0);
    return {
      sector:
        totalSectors > 1
          ? `${totalSectors} sectors active`
          : baselineIncluded
            ? 'Single baseline sector active'
            : 'No sectors selected yet',
      profile: hasLifestyleOverrides
        ? 'Lifestyle inputs customised'
        : 'Using default lifestyle baseline',
      activity: activityUnlocked
        ? 'Activity planner unlocked'
        : 'Add lifestyle detail to unlock activities'
    };
  }, [activeLayers, primaryLayer, optionalSectors.length, hasLifestyleOverrides, activityUnlocked]);

  const profileDetail = stageSummaries.profile;
  const activityDetail = stageSummaries.activity;

  interface StoredScopePin extends ScopePin {
    fingerprint: string;
  }

  const [pinnedScopes, setPinnedScopes] = useState<StoredScopePin[]>([]);

  const handlePinScope = useCallback(() => {
    const fingerprint = JSON.stringify({
      stage,
      sectors: activeSectorDescriptors.map((sector) => sector.id),
      profile: profileDetail,
      activity: activityDetail
    });
    setPinnedScopes((previous) => {
      if (previous.some((pin) => pin.fingerprint === fingerprint)) {
        return previous;
      }
      const stageLabel =
        stage === 'sector' ? 'Sector scope' : stage === 'profile' ? 'Profile scope' : 'Activity scope';
      const title =
        activeSectorDescriptors.length > 0
          ? activeSectorDescriptors.map((sector) => sector.label).join(' · ')
          : 'No sectors selected';
      const subtitleParts = [stageLabel];
      if (profileDetail) {
        subtitleParts.push(profileDetail);
      }
      if (activityDetail) {
        subtitleParts.push(activityDetail);
      }
      const subtitle = subtitleParts.join(' • ');
      const id = `scope-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const nextPin: StoredScopePin = {
        id,
        stage,
        title,
        subtitle,
        stageSummary: stageSummaries[stage],
        fingerprint
      };
      return [...previous, nextPin];
    });
  }, [stage, activeSectorDescriptors, profileDetail, activityDetail, stageSummaries]);

  const handleRemovePinnedScope = useCallback((id: string) => {
    setPinnedScopes((previous) => previous.filter((pin) => pin.id !== id));
  }, []);

  const visiblePinnedScopes = useMemo<ScopePin[]>(() => pinnedScopes.map(({ fingerprint, ...pin }) => pin), [pinnedScopes]);

  const isStageUnlocked = useCallback(
    (stageId: StageId) => stageId === 'sector' || unlockedStages.has(stageId),
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
      if (currentStage === 'sector' && !sectorContextReady) {
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
    [sectorContextReady, hasLifestyleOverrides]
  );

  return (
    <div className="acx-condensed flex min-h-screen w-screen flex-col bg-background/95 text-foreground">
      <a
        href="#main"
        className="absolute left-4 top-4 z-50 -translate-y-20 rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground transition focus:translate-y-0 focus:outline-none"
      >
        Skip to main content
      </a>
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <Toolbar className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-none border-0 bg-transparent px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">Carbon</p>
            <h1 className="text-base font-semibold text-foreground">Analysis Console</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden min-h-[2.5rem] items-center gap-2 rounded-md border-border/70 bg-background/80 text-2xs font-semibold uppercase tracking-[0.25em] text-foreground shadow-sm hover:bg-muted/40 focus-visible:ring-primary lg:flex"
            aria-expanded={isDrawerOpen && !focusMode}
            aria-controls="references-panel"
            onClick={() => setIsDrawerOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key.toLowerCase() === 'r') {
                event.preventDefault();
                setIsDrawerOpen((open) => !open);
              }
            }}
          >
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            References
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="inline-flex min-h-[2.25rem] items-center gap-2 rounded-md border-border/70 bg-background/80 text-2xs font-semibold uppercase tracking-[0.25em] text-foreground shadow-sm hover:bg-muted/40 focus-visible:ring-primary lg:hidden"
            aria-expanded={isDrawerOpen && !focusMode}
            aria-controls="references-panel"
            onClick={() => setIsDrawerOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key.toLowerCase() === 'r') {
                event.preventDefault();
                setIsDrawerOpen((open) => !open);
              }
            }}
          >
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            References
          </Button>
        </Toolbar>
      </header>
      <main
        id="main"
        className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-6"
      >
        <Layout
          layerBrowser={<SectorBrowser />}
          controls={<ProfileControls />}
          activity={<ActivityPlanner />}
          canvas={<VizCanvas stage={stage} onFigureDataChange={handleFigureDataChange} />}
          scopeIndicator={
            <ScopeBar
              stage={stage}
              stageSummaries={stageSummaries}
              sectors={activeSectorDescriptors}
              profileDetail={profileDetail}
              activityDetail={activityDetail}
              pinnedScopes={visiblePinnedScopes}
              onPinScope={handlePinScope}
              onRemovePinnedScope={handleRemovePinnedScope}
            />
          }
          references={
            <ReferencesDrawer
              id="references-panel"
              open={isDrawerOpen && !focusMode}
              onToggle={() => setIsDrawerOpen((open) => !open)}
              referencesOverride={figureReferences}
              referencesStatus={figureReferenceStatus}
              referencesError={figureReferenceError}
            />
          }
          stage={stage}
          stageStates={stageStates}
          stageSummaries={stageSummaries}
          onStageChange={handleStageChange}
          onStageAdvance={handleAdvanceStage}
          focusMode={focusMode}
          onFocusModeChange={setFocusMode}
          referencesOpen={isDrawerOpen}
          onToggleReferences={() => setIsDrawerOpen((open) => !open)}
        />
      </main>
    </div>
  );
}
