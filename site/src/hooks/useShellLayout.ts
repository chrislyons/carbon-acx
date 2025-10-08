import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  SHELL_DIVIDER_WIDTH,
  SHELL_KEYBOARD_RESIZE_STEP,
  SHELL_LAYOUT_PRESETS,
  SHELL_LAYOUT_STORAGE_KEY,
  SHELL_MAX_LEFT_FRACTION,
  SHELL_MAX_RIGHT_FRACTION,
  SHELL_MIN_LEFT_FRACTION,
  SHELL_MIN_MAIN_FRACTION,
  SHELL_MIN_RIGHT_FRACTION,
  type ShellLayoutPreset
} from '@/theme/tokens';

interface ShellLayoutState {
  left: number;
  right: number;
}

const FALLBACK_LAYOUT: ShellLayoutState = { left: 0.28, right: 0.24 };
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
      return { left: preset.left, right: preset.right };
    }
    if (window.matchMedia(preset.query).matches) {
      return { left: preset.left, right: preset.right };
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
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      return null;
    }
    return { left, right };
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
    window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
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

function normaliseLayout(candidate: ShellLayoutState): ShellLayoutState {
  const left = clampLeft(candidate.left, candidate.right);
  const right = clampRight(candidate.right, left);
  return { left, right };
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
      return { left: nextLeft, right: previous.right };
    });
  }, []);

  const setRightFraction = useCallback((value: number) => {
    setLayout((previous) => {
      const nextRight = clampRight(value, previous.left);
      if (Math.abs(nextRight - previous.right) < EPSILON) {
        return previous;
      }
      return { left: previous.left, right: nextRight };
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
      return { left: nextLeft, right: previous.right };
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
      return { left: previous.left, right: nextRight };
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
    keyboardStep: SHELL_KEYBOARD_RESIZE_STEP
  };
}
