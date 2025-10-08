import { devtools } from 'zustand/middleware';
import { create } from 'zustand';

import { PRIMARY_LAYER_ID } from '../state/constants';

export type EmissionScale = 'total' | 'per_capita';
export type EmissionPeriod = 'annual' | 'monthly';

export interface ACXStoreState {
  figureId: string | null;
  selectedLayers: ReadonlySet<string>;
  scale: EmissionScale;
  period: EmissionPeriod;
  focusMode: boolean;
  setFigureId: (figureId: string | null) => void;
  setSelectedLayers: (layers: Iterable<string>) => void;
  toggleLayer: (layerId: string) => void;
  addLayer: (layerId: string) => void;
  removeLayer: (layerId: string) => void;
  setScale: (scale: EmissionScale) => void;
  setPeriod: (period: EmissionPeriod) => void;
  setFocusMode: (focusMode: boolean) => void;
  reset: () => void;
}

interface InternalState {
  figureId: string | null;
  selectedLayers: Set<string>;
  scale: EmissionScale;
  period: EmissionPeriod;
  focusMode: boolean;
}

const DEFAULT_STATE: InternalState = {
  figureId: null,
  selectedLayers: new Set<string>([PRIMARY_LAYER_ID]),
  scale: 'total',
  period: 'annual',
  focusMode: false
};

function createSet(values: Iterable<string> | Set<string>): Set<string> {
  if (values instanceof Set) {
    return new Set(values);
  }
  const next = new Set<string>();
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        next.add(trimmed);
      }
    }
  }
  return next;
}

function setsAreEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

function withBaseline(values: Set<string>): Set<string> {
  if (!values.has(PRIMARY_LAYER_ID)) {
    values.add(PRIMARY_LAYER_ID);
  }
  return values;
}

export const useACXStore = create<ACXStoreState>()(
  devtools(
    (set) => ({
      figureId: DEFAULT_STATE.figureId,
      selectedLayers: DEFAULT_STATE.selectedLayers,
      scale: DEFAULT_STATE.scale,
      period: DEFAULT_STATE.period,
      focusMode: DEFAULT_STATE.focusMode,
      setFigureId: (figureId) => {
        const next = figureId?.trim() ?? null;
        set({ figureId: next && next.length > 0 ? next : null });
      },
      setSelectedLayers: (layers) => {
        set((state) => {
          const next = withBaseline(createSet(layers));
          if (next.size === 0) {
            next.add(PRIMARY_LAYER_ID);
          }
          if (setsAreEqual(state.selectedLayers, next)) {
            return state;
          }
          return { selectedLayers: next };
        });
      },
      toggleLayer: (layerId) => {
        const trimmed = layerId.trim();
        if (!trimmed || trimmed === PRIMARY_LAYER_ID) {
          return;
        }
        set((state) => {
          const next = new Set(state.selectedLayers);
          if (next.has(trimmed)) {
            next.delete(trimmed);
          } else {
            next.add(trimmed);
          }
          next.add(PRIMARY_LAYER_ID);
          if (setsAreEqual(state.selectedLayers, next)) {
            return state;
          }
          return { selectedLayers: next };
        });
      },
      addLayer: (layerId) => {
        const trimmed = layerId.trim();
        if (!trimmed) {
          return;
        }
        set((state) => {
          const next = new Set(state.selectedLayers);
          next.add(trimmed);
          next.add(PRIMARY_LAYER_ID);
          if (setsAreEqual(state.selectedLayers, next)) {
            return state;
          }
          return { selectedLayers: next };
        });
      },
      removeLayer: (layerId) => {
        const trimmed = layerId.trim();
        if (!trimmed || trimmed === PRIMARY_LAYER_ID) {
          return;
        }
        set((state) => {
          if (!state.selectedLayers.has(trimmed)) {
            return state;
          }
          const next = new Set(state.selectedLayers);
          next.delete(trimmed);
          next.add(PRIMARY_LAYER_ID);
          return { selectedLayers: next };
        });
      },
      setScale: (scale) => {
        set({ scale });
      },
      setPeriod: (period) => {
        set({ period });
      },
      setFocusMode: (focusMode) => {
        set({ focusMode });
      },
      reset: () => {
        set({
          figureId: DEFAULT_STATE.figureId,
          selectedLayers: new Set(DEFAULT_STATE.selectedLayers),
          scale: DEFAULT_STATE.scale,
          period: DEFAULT_STATE.period,
          focusMode: DEFAULT_STATE.focusMode
        });
      }
    }),
    { name: 'ACXStore' }
  )
);

export function getACXStoreState(): ACXStoreState {
  return useACXStore.getState();
}

export function setACXStoreState(partial: Partial<InternalState>): void {
  useACXStore.setState((state) => {
    const next: Partial<InternalState> = {};
    if (Object.prototype.hasOwnProperty.call(partial, 'figureId')) {
      const raw = partial.figureId ?? null;
      next.figureId = raw && raw.trim().length > 0 ? raw.trim() : null;
    }
    if (partial.selectedLayers) {
      next.selectedLayers = withBaseline(createSet(partial.selectedLayers));
    }
    if (partial.scale) {
      next.scale = partial.scale;
    }
    if (partial.period) {
      next.period = partial.period;
    }
    if (Object.prototype.hasOwnProperty.call(partial, 'focusMode') && typeof partial.focusMode === 'boolean') {
      next.focusMode = partial.focusMode;
    }
    if (Object.keys(next).length === 0) {
      return state;
    }
    return {
      ...state,
      ...next,
      selectedLayers: next.selectedLayers ?? state.selectedLayers
    };
  });
}

export const defaultACXState: InternalState = {
  figureId: DEFAULT_STATE.figureId,
  selectedLayers: new Set(DEFAULT_STATE.selectedLayers),
  scale: DEFAULT_STATE.scale,
  period: DEFAULT_STATE.period,
  focusMode: DEFAULT_STATE.focusMode
};
