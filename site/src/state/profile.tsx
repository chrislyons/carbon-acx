import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { compute } from '../lib/api';

export type DietOption = 'omnivore' | 'vegetarian' | 'vegan';

export interface ModeSplit {
  car: number;
  transit: number;
  bike: number;
}

export interface ProfileControlsState {
  commuteDaysPerWeek: number;
  modeSplit: ModeSplit;
  diet: DietOption;
  streamingHoursPerDay: number;
}

export type ProfileStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ComputeResult {
  manifest?: {
    profile_id?: string;
    dataset_version?: string;
    overrides?: Record<string, number>;
    sources?: string[];
    [key: string]: unknown;
  };
  datasetId?: string;
  figures?: {
    bubble?: {
      data?: unknown;
      citation_keys?: string[];
      [key: string]: unknown;
    };
    stacked?: {
      data?: unknown;
      citation_keys?: string[];
      [key: string]: unknown;
    };
    sankey?: {
      data?: unknown;
      citation_keys?: string[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  references?: unknown;
  [key: string]: unknown;
}

interface ProfileContextValue {
  profileId: string;
  controls: ProfileControlsState;
  overrides: Record<string, number>;
  status: ProfileStatus;
  result: ComputeResult | null;
  error: string | null;
  refresh: () => void;
  setCommuteDays: (value: number) => void;
  setModeSplit: (mode: keyof ModeSplit, value: number) => void;
  setDiet: (diet: DietOption) => void;
  setStreamingHours: (value: number) => void;
  setControlsState: (next: ProfileControlsState) => void;
}

const STORAGE_KEY = 'acx:profile-controls';
const DEFAULT_PROFILE_ID = 'PRO.TO.24_39.HYBRID.2025';
const DEBOUNCE_MS = 250;
const DAYS_PER_WEEK = 7;

const COMMUTE_ACTIVITY_IDS: Record<keyof ModeSplit, string> = {
  car: 'TRAVEL.COMMUTE.CAR.WORKDAY',
  transit: 'TRAVEL.COMMUTE.TRANSIT.WORKDAY',
  bike: 'TRAVEL.COMMUTE.BIKE.WORKDAY'
};

const DIET_ACTIVITY_IDS: Record<DietOption, string> = {
  omnivore: 'FOOD.DIET.OMNIVORE.WEEK',
  vegetarian: 'FOOD.DIET.VEGETARIAN.WEEK',
  vegan: 'FOOD.DIET.VEGAN.WEEK'
};

const STREAMING_ACTIVITY_ID = 'MEDIA.STREAM.HD.HOUR.TV';

const DEFAULT_CONTROLS: ProfileControlsState = {
  commuteDaysPerWeek: 3,
  modeSplit: {
    car: 60,
    transit: 30,
    bike: 10
  },
  diet: 'omnivore',
  streamingHoursPerDay: 1.5
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function clampPercentage(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

function normaliseSplit(split: ModeSplit): ModeSplit {
  const weights = [split.car, split.transit, split.bike].map((value) =>
    clamp(Math.round(value), 0, 100)
  );
  const total = weights.reduce((sum, value) => sum + value, 0);

  if (total === 100) {
    return { car: weights[0], transit: weights[1], bike: weights[2] };
  }

  const distributed = distributeIntegerTotal(100, weights);
  return { car: distributed[0], transit: distributed[1], bike: distributed[2] };
}

function controlsAreEqual(a: ProfileControlsState, b: ProfileControlsState): boolean {
  if (a === b) {
    return true;
  }

  if (
    a.commuteDaysPerWeek !== b.commuteDaysPerWeek ||
    a.streamingHoursPerDay !== b.streamingHoursPerDay ||
    a.diet !== b.diet
  ) {
    return false;
  }

  return (
    a.modeSplit.car === b.modeSplit.car &&
    a.modeSplit.transit === b.modeSplit.transit &&
    a.modeSplit.bike === b.modeSplit.bike
  );
}

function roundTo(value: number, precision: number): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function distributeIntegerTotal(total: number, weights: number[]): number[] {
  if (weights.length === 0) {
    return [];
  }
  const normalisedWeights = weights.map((value) => Math.max(0, value));
  const weightSum = normalisedWeights.reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return new Array(weights.length).fill(0);
  }

  if (weightSum === 0) {
    const base = Math.floor(total / weights.length);
    const remainder = total - base * weights.length;
    return normalisedWeights.map((_, index) => (index < remainder ? base + 1 : base));
  }

  const raw = normalisedWeights.map((value) => (value / weightSum) * total);
  const floored = raw.map((value) => Math.floor(value));
  let remainder = total - floored.reduce((sum, value) => sum + value, 0);

  const fractional = raw
    .map((value, index) => ({ index, fraction: value - floored[index] }))
    .sort((a, b) => b.fraction - a.fraction);

  const distributed = [...floored];
  for (let i = 0; i < remainder; i += 1) {
    distributed[fractional[i % fractional.length].index] += 1;
  }

  return distributed;
}

function rebalanceSplit(current: ModeSplit, mode: keyof ModeSplit, value: number): ModeSplit {
  const target = clampPercentage(value);
  const otherKeys = (Object.keys(current) as (keyof ModeSplit)[]).filter((key) => key !== mode);
  const otherWeights = otherKeys.map((key) => current[key]);
  const distribution = distributeIntegerTotal(100 - target, otherWeights);
  const next: ModeSplit = { ...current };
  next[mode] = target;
  otherKeys.forEach((key, index) => {
    next[key] = distribution[index];
  });
  return next;
}

function normaliseControls(partial: Partial<ProfileControlsState>): ProfileControlsState {
  const next: ProfileControlsState = {
    commuteDaysPerWeek: clamp(partial.commuteDaysPerWeek ?? DEFAULT_CONTROLS.commuteDaysPerWeek, 0, 7),
    streamingHoursPerDay: clamp(partial.streamingHoursPerDay ?? DEFAULT_CONTROLS.streamingHoursPerDay, 0, 6),
    diet: (partial.diet ?? DEFAULT_CONTROLS.diet) as DietOption,
    modeSplit: normaliseSplit(partial.modeSplit ?? DEFAULT_CONTROLS.modeSplit)
  };

  if (!Object.prototype.hasOwnProperty.call(DIET_ACTIVITY_IDS, next.diet)) {
    next.diet = DEFAULT_CONTROLS.diet;
  }

  return next;
}

function loadStoredControls(): ProfileControlsState | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored) as Partial<ProfileControlsState> | null;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return normaliseControls(parsed);
  } catch (error) {
    console.warn('Failed to read persisted profile controls', error);
    return null;
  }
}

function persistControls(state: ProfileControlsState): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to persist profile controls', error);
  }
}

function buildOverrides(controls: ProfileControlsState): Record<string, number> {
  const overrides: Record<string, number> = {};

  const commuteDays = clamp(controls.commuteDaysPerWeek, 0, 7);
  const split = normaliseSplit(controls.modeSplit);
  const carDays = roundTo((split.car / 100) * commuteDays, 3);
  const transitDays = roundTo((split.transit / 100) * commuteDays, 3);
  let bikeDays = roundTo((split.bike / 100) * commuteDays, 3);
  const commuteDiff = roundTo(commuteDays - (carDays + transitDays + bikeDays), 3);
  if (commuteDiff !== 0) {
    bikeDays = roundTo(Math.max(0, bikeDays + commuteDiff), 3);
  }

  overrides[COMMUTE_ACTIVITY_IDS.car] = carDays;
  overrides[COMMUTE_ACTIVITY_IDS.transit] = transitDays;
  overrides[COMMUTE_ACTIVITY_IDS.bike] = bikeDays;

  const dietEntries = Object.entries(DIET_ACTIVITY_IDS) as [DietOption, string][];
  dietEntries.forEach(([diet, activityId]) => {
    overrides[activityId] = diet === controls.diet ? DAYS_PER_WEEK : 0;
  });

  overrides[STREAMING_ACTIVITY_ID] = roundTo(controls.streamingHoursPerDay * DAYS_PER_WEEK, 3);

  return overrides;
}

export function ProfileProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [controls, setControls] = useState<ProfileControlsState>(() => {
    const stored = loadStoredControls();
    return stored ?? DEFAULT_CONTROLS;
  });
  const [status, setStatus] = useState<ProfileStatus>('idle');
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileId] = useState<string>(DEFAULT_PROFILE_ID);
  const [refreshToken, setRefreshToken] = useState(0);

  const overrides = useMemo(() => buildOverrides(controls), [controls]);
  const overridesKey = useMemo(() => JSON.stringify(overrides), [overrides]);

  const hasHydrated = useRef(false);
  useEffect(() => {
    hasHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) {
      return;
    }
    persistControls(controls);
  }, [controls]);

  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    if (abortRef.current) {
      abortRef.current.abort();
    }

    setStatus((previous) => (previous === 'loading' ? previous : 'loading'));
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = window.setTimeout(async () => {
      try {
        const payload = { profile_id: profileId, overrides };
        const response = await compute<ComputeResult>(payload, {
          signal: controller.signal
        });
        if (controller.signal.aborted) {
          return;
        }
        setResult(response);
        setStatus('success');
        setError(null);
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          requestError instanceof Error ? requestError.message : 'Request failed';
        setError(message);
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    debounceRef.current = timeoutId;

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [profileId, overrides, overridesKey, refreshToken]);

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  const setCommuteDays = useCallback((value: number) => {
    setControls((previous) => {
      const nextValue = clamp(value, 0, 7);
      if (previous.commuteDaysPerWeek === nextValue) {
        return previous;
      }
      return { ...previous, commuteDaysPerWeek: nextValue };
    });
  }, []);

  const setModeSplit = useCallback((mode: keyof ModeSplit, value: number) => {
    setControls((previous) => {
      const rebalanced = rebalanceSplit(previous.modeSplit, mode, value);
      if (
        previous.modeSplit.car === rebalanced.car &&
        previous.modeSplit.transit === rebalanced.transit &&
        previous.modeSplit.bike === rebalanced.bike
      ) {
        return previous;
      }
      return { ...previous, modeSplit: rebalanced };
    });
  }, []);

  const setDiet = useCallback((diet: DietOption) => {
    setControls((previous) => {
      if (previous.diet === diet) {
        return previous;
      }
      const nextDiet: DietOption = Object.prototype.hasOwnProperty.call(
        DIET_ACTIVITY_IDS,
        diet
      )
        ? diet
        : previous.diet;
      return { ...previous, diet: nextDiet };
    });
  }, []);

  const setStreamingHours = useCallback((value: number) => {
    setControls((previous) => {
      const nextValue = clamp(value, 0, 6);
      if (previous.streamingHoursPerDay === nextValue) {
        return previous;
      }
      return { ...previous, streamingHoursPerDay: nextValue };
    });
  }, []);

  const setControlsState = useCallback((next: ProfileControlsState) => {
    setControls((previous) => {
      const normalised = normaliseControls(next);
      if (controlsAreEqual(previous, normalised)) {
        return previous;
      }
      return normalised;
    });
  }, []);

  const contextValue = useMemo<ProfileContextValue>(
    () => ({
      profileId,
      controls,
      overrides,
      status,
      result,
      error,
      refresh,
      setCommuteDays,
      setModeSplit,
      setDiet,
      setStreamingHours,
      setControlsState
    }),
    [
      profileId,
      controls,
      overrides,
      status,
      result,
      error,
      refresh,
      setCommuteDays,
      setModeSplit,
      setDiet,
      setStreamingHours,
      setControlsState
    ]
  );

  return <ProfileContext.Provider value={contextValue}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
