import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  SHELL_DEFAULT_DOCK_FRACTION,
  SHELL_DEFAULT_DOCK_POSITION,
  SHELL_DIVIDER_WIDTH,
  SHELL_KEYBOARD_RESIZE_STEP,
  SHELL_LAYOUT_PRESETS,
  SHELL_LAYOUT_STORAGE_KEY,
  SHELL_MAX_DOCK_FRACTION,
  SHELL_MAX_LEFT_FRACTION,
  SHELL_MAX_RIGHT_FRACTION,
  SHELL_MIN_DOCK_FRACTION,
  SHELL_MIN_LEFT_FRACTION,
  SHELL_MIN_MAIN_FRACTION,
  SHELL_MIN_RIGHT_FRACTION,
  type ShellDockPosition,
  type ShellLayoutPreset
} from '@/theme/tokens';

interface ShellLayoutState {
  left: number;
  right: number;
  dock: {
    fraction: number;
    position: ShellDockPosition;
  };
}

const FALLBACK_LAYOUT: ShellLayoutState = {
  left: 0.28,
  right: 0.24,
  dock: { fraction: SHELL_DEFAULT_DOCK_FRACTION, position: SHELL_DEFAULT_DOCK_POSITION }
};
const EPSILON = 0.0001;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  if (min > max) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function resolvePreset(presets: ShellLayoutPreset[]): ShellLayoutState {
  if (typeof window === 'undefined') {
    return FALLBACK_LAYOUT;
  }
  for (const preset of presets) {
    if (!preset.query) {
      return {
        left: preset.left,
        right: preset.right,
        dock: { fraction: SHELL_DEFAULT_DOCK_FRACTION, position: SHELL_DEFAULT_DOCK_POSITION }
      };
    }
    if (window.matchMedia(preset.query).matches) {
      return {
        left: preset.left,
        right: preset.right,
        dock: { fraction: SHELL_DEFAULT_DOCK_FRACTION, position: SHELL_DEFAULT_DOCK_POSITION }
      };
    }
  }
  return FALLBACK_LAYOUT;
}

function readStoredLayout(): ShellLayoutState | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(SHELL_LAYOUT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const left = Number((parsed as Record<string, unknown>).left);
    const right = Number((parsed as Record<string, unknown>).right);
    const dockFraction = Number((parsed as Record<string, unknown>).dockFraction);
    const dockPositionRaw = (parsed as Record<string, unknown>).dockPosition;
    const dockPosition = dockPositionRaw === 'bottom' ? 'bottom' : SHELL_DEFAULT_DOCK_POSITION;
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      return null;
    }
    const fraction = Number.isFinite(dockFraction) ? Number(dockFraction) : SHELL_DEFAULT_DOCK_FRACTION;
    return {
      left,
      right,
      dock: { fraction, position: dockPosition }
    };
  } catch (error) {
    console.warn('Failed to read stored shell layout', error);
    return null;
  }
}

function serialiseLayout(layout: ShellLayoutState): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const payload = {
      left: layout.left,
      right: layout.right,
      dockFraction: layout.dock.fraction,
      dockPosition: layout.dock.position
    } satisfies {
      left: number;
      right: number;
      dockFraction: number;
      dockPosition: ShellDockPosition;
    };
    window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist shell layout', error);
  }
}

function clampLeft(value: number, right: number): number {
  const max = Math.min(
    SHELL_MAX_LEFT_FRACTION,
    1 - SHELL_MIN_MAIN_FRACTION - Math.max(right, SHELL_MIN_RIGHT_FRACTION)
  );
  const safeMax = Math.max(SHELL_MIN_LEFT_FRACTION, max);
  return clamp(value, SHELL_MIN_LEFT_FRACTION, safeMax);
}

function clampRight(value: number, left: number): number {
  const max = Math.min(
    SHELL_MAX_RIGHT_FRACTION,
    1 - SHELL_MIN_MAIN_FRACTION - Math.max(left, SHELL_MIN_LEFT_FRACTION)
  );
  const safeMax = Math.max(SHELL_MIN_RIGHT_FRACTION, max);
  return clamp(value, SHELL_MIN_RIGHT_FRACTION, safeMax);
}

function clampDockFraction(value: number): number {
  return clamp(value, SHELL_MIN_DOCK_FRACTION, SHELL_MAX_DOCK_FRACTION);
}

function normaliseLayout(candidate: ShellLayoutState): ShellLayoutState {
  const left = clampLeft(candidate.left, candidate.right);
  const right = clampRight(candidate.right, left);
  const fraction = clampDockFraction(candidate.dock?.fraction ?? SHELL_DEFAULT_DOCK_FRACTION);
  const position = candidate.dock?.position === 'bottom' ? 'bottom' : SHELL_DEFAULT_DOCK_POSITION;
  return {
    left,
    right,
    dock: { fraction, position }
  };
}

export interface ShellLayout {
  containerRef: React.RefObject<HTMLDivElement>;
  leftFraction: number;
  rightFraction: number;
  gridTemplateColumns: string;
  leftPercentage: number;
  rightPercentage: number;
  dividerWidth: number;
  setLeftFraction: (value: number) => void;
  setRightFraction: (value: number) => void;
  shiftLeftBy: (delta: number) => void;
  shiftRightBy: (delta: number) => void;
  reset: () => void;
  keyboardStep: number;
  dockFraction: number;
  dockPosition: ShellDockPosition;
  setDockFraction: (value: number) => void;
  shiftDockFraction: (delta: number) => void;
  setDockPosition: (position: ShellDockPosition) => void;
  toggleDockPosition: () => void;
}

export function useShellLayout(): ShellLayout {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<ShellLayoutState>(() => {
    const stored = readStoredLayout();
    if (stored) {
      return normaliseLayout(stored);
    }
    return resolvePreset(SHELL_LAYOUT_PRESETS);
  });

  useEffect(() => {
    serialiseLayout(layout);
  }, [layout]);

  const setLeftFraction = useCallback((value: number) => {
    setLayout((previous) => {
      const nextLeft = clampLeft(value, previous.right);
      if (Math.abs(nextLeft - previous.left) < EPSILON) {
        return previous;
      }
      return { ...previous, left: nextLeft };
    });
  }, []);

  const setRightFraction = useCallback((value: number) => {
    setLayout((previous) => {
      const nextRight = clampRight(value, previous.left);
      if (Math.abs(nextRight - previous.right) < EPSILON) {
        return previous;
      }
      return { ...previous, right: nextRight };
    });
  }, []);

  const setDockFraction = useCallback((value: number) => {
    setLayout((previous) => {
      const nextFraction = clampDockFraction(value);
      if (Math.abs(previous.dock.fraction - nextFraction) < EPSILON) {
        return previous;
      }
      return {
        ...previous,
        dock: { ...previous.dock, fraction: nextFraction }
      };
    });
  }, []);

  const shiftLeftBy = useCallback((delta: number) => {
    if (delta === 0) {
      return;
    }
    setLayout((previous) => {
      const nextLeft = clampLeft(previous.left + delta, previous.right);
      if (Math.abs(nextLeft - previous.left) < EPSILON) {
        return previous;
      }
      return { ...previous, left: nextLeft };
    });
  }, []);

  const shiftRightBy = useCallback((delta: number) => {
    if (delta === 0) {
      return;
    }
    setLayout((previous) => {
      const nextRight = clampRight(previous.right + delta, previous.left);
      if (Math.abs(nextRight - previous.right) < EPSILON) {
        return previous;
      }
      return { ...previous, right: nextRight };
    });
  }, []);

  const shiftDockFraction = useCallback((delta: number) => {
    if (delta === 0) {
      return;
    }
    setLayout((previous) => {
      const nextFraction = clampDockFraction(previous.dock.fraction + delta);
      if (Math.abs(nextFraction - previous.dock.fraction) < EPSILON) {
        return previous;
      }
      return {
        ...previous,
        dock: { ...previous.dock, fraction: nextFraction }
      };
    });
  }, []);

  const setDockPosition = useCallback((position: ShellDockPosition) => {
    setLayout((previous) => {
      const normalised = position === 'bottom' ? 'bottom' : SHELL_DEFAULT_DOCK_POSITION;
      if (previous.dock.position === normalised) {
        return previous;
      }
      return {
        ...previous,
        dock: { ...previous.dock, position: normalised }
      };
    });
  }, []);

  const toggleDockPosition = useCallback(() => {
    setLayout((previous) => {
      const next = previous.dock.position === 'bottom' ? SHELL_DEFAULT_DOCK_POSITION : 'bottom';
      return {
        ...previous,
        dock: { ...previous.dock, position: next }
      };
    });
  }, []);

  const reset = useCallback(() => {
    setLayout(() => resolvePreset(SHELL_LAYOUT_PRESETS));
  }, []);

  const leftPercentage = useMemo(() => layout.left * 100, [layout.left]);
  const rightPercentage = useMemo(() => layout.right * 100, [layout.right]);
  const gridTemplateColumns = useMemo(
    () => `${layout.left * 100}% minmax(0, 1fr) ${layout.right * 100}%`,
    [layout.left, layout.right]
  );

  return {
    containerRef,
    leftFraction: layout.left,
    rightFraction: layout.right,
    gridTemplateColumns,
    leftPercentage,
    rightPercentage,
    dividerWidth: SHELL_DIVIDER_WIDTH,
    setLeftFraction,
    setRightFraction,
    shiftLeftBy,
    shiftRightBy,
    reset,
    keyboardStep: SHELL_KEYBOARD_RESIZE_STEP,
    dockFraction: layout.dock.fraction,
    dockPosition: layout.dock.position,
    setDockFraction,
    shiftDockFraction,
    setDockPosition,
    toggleDockPosition
  };
}
