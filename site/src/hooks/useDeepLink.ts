import { useEffect, useRef } from 'react';

import { useACXStore, setACXStoreState, type ACXStoreState } from '@/store/useACXStore';
import { buildSearchFromState, parseACXStateFromSearch } from '@/utils/url';

import type { StageId } from '@/components/Layout';

export interface UseDeepLinkOptions {
  stage: StageId;
  onStageChange: (stage: StageId) => void;
  selectedOmniNodes: readonly string[];
  onOmniSelectionChange: (nodes: readonly string[]) => void;
}

interface StoreSnapshot {
  figureId: string | null;
  layers: string[];
  scale: ACXStoreState['scale'];
  period: ACXStoreState['period'];
  focusMode: boolean;
}

function createSnapshot(state: ACXStoreState): StoreSnapshot {
  return {
    figureId: state.figureId,
    layers: Array.from(state.selectedLayers),
    scale: state.scale,
    period: state.period,
    focusMode: state.focusMode,
  } satisfies StoreSnapshot;
}

function arraysAreEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

function snapshotsAreEqual(a: StoreSnapshot | null, b: StoreSnapshot): boolean {
  if (!a) {
    return false;
  }
  if (a.figureId !== b.figureId || a.scale !== b.scale || a.period !== b.period || a.focusMode !== b.focusMode) {
    return false;
  }
  return arraysAreEqual(a.layers, b.layers);
}

export function useDeepLink({
  stage,
  onStageChange,
  selectedOmniNodes,
  onOmniSelectionChange,
}: UseDeepLinkOptions): void {
  const stageRef = useRef(stage);
  const omniRef = useRef<readonly string[]>(selectedOmniNodes);
  const appliedSearchRef = useRef<string | null>(null);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    omniRef.current = selectedOmniNodes;
  }, [selectedOmniNodes]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const applySearch = (search: string) => {
      if (appliedSearchRef.current === search) {
        return;
      }
      appliedSearchRef.current = search;
      const parsed = parseACXStateFromSearch(search);
      const current = useACXStore.getState();
      const currentLayers = Array.from(current.selectedLayers);
      const sameLayers = arraysAreEqual(currentLayers, parsed.layers);
      const sameFigure = current.figureId === parsed.figureId;
      const sameScale = current.scale === parsed.scale;
      const samePeriod = current.period === parsed.period;
      const sameFocus = current.focusMode === parsed.focusMode;
      if (!(sameLayers && sameFigure && sameScale && samePeriod && sameFocus)) {
        setACXStoreState({
          figureId: parsed.figureId,
          selectedLayers: new Set(parsed.layers),
          scale: parsed.scale,
          period: parsed.period,
          focusMode: parsed.focusMode,
        });
      }
      if (parsed.pane && ['sector', 'profile', 'activity'].includes(parsed.pane)) {
        onStageChange(parsed.pane as StageId);
      }
      onOmniSelectionChange(parsed.omni);
    };
    applySearch(window.location.search);
    const handlePopState = () => {
      applySearch(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onOmniSelectionChange, onStageChange]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    let previousSnapshot: StoreSnapshot | null = null;
    const updateUrl = () => {
      const state = useACXStore.getState();
      const search = buildSearchFromState(
        {
          figureId: state.figureId,
          layers: state.selectedLayers,
          scale: state.scale,
          period: state.period,
          focusMode: state.focusMode,
          pane: stageRef.current,
          omni: omniRef.current,
        },
        window.location.search,
      );
      if (search !== window.location.search) {
        const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
        window.history.replaceState({}, '', nextUrl);
        appliedSearchRef.current = search;
      }
    };
    const unsubscribe = useACXStore.subscribe((state) => {
      const snapshot = createSnapshot(state);
      if (snapshotsAreEqual(previousSnapshot, snapshot)) {
        return;
      }
      previousSnapshot = snapshot;
      updateUrl();
    });
    updateUrl();
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const state = useACXStore.getState();
    const search = buildSearchFromState(
      {
        figureId: state.figureId,
        layers: state.selectedLayers,
        scale: state.scale,
        period: state.period,
        focusMode: state.focusMode,
        pane: stage,
        omni: selectedOmniNodes,
      },
      window.location.search,
    );
    if (search !== window.location.search) {
      const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, [selectedOmniNodes, stage]);
}
