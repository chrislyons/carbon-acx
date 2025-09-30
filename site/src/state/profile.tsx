import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  compute,
  health,
  parseComputeResponse,
  type ComputeResponse as ApiComputeResponse,
  type ReferenceEntry as ApiReferenceEntry
} from '../lib/api';

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
export type ProfileMode = 'live' | 'static';
export type ReferenceEntry = ApiReferenceEntry;
export type ComputeResult = ApiComputeResponse;

interface ProfileContextValue {
  profileId: string;
  controls: ProfileControlsState;
  overrides: Record<string, number>;
  status: ProfileStatus;
  mode: ProfileMode;
  result: ComputeResult | null;
  error: string | null;
  refresh: () => void;
  primaryLayer: string;
  availableLayers: string[];
  activeLayers: string[];
  activeReferenceKeys: string[];
  activeReferences: ReferenceEntry[];
  setActiveLayers: (layers: string[]) => void;
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
export const PRIMARY_LAYER_ID = 'professional';

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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : null))
    .filter((item): item is string => Boolean(item));
}

function normaliseLayerMapping(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const entries = value as Record<string, unknown>;
  const mapping: Record<string, string[]> = {};
  Object.entries(entries).forEach(([layer, raw]) => {
    const values = toStringArray(raw);
    if (values.length > 0) {
      mapping[layer] = values;
    }
  });
  return mapping;
}

function cleanReferenceText(value: string): string {
  return value.replace(/^\[[0-9]+\]\s*/, '').trim();
}

function resolvePublicBasePath(): string {
  const base = typeof __PUBLIC_BASE_PATH__ === 'string' ? __PUBLIC_BASE_PATH__ : '/';
  if (!base) {
    return '/';
  }
  return base.endsWith('/') ? base : `${base}/`;
}

function normaliseReferenceEntries(value: unknown): ReferenceEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: ReferenceEntry[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }
    const record = item as Record<string, unknown>;
    const textValue = typeof record.text === 'string' ? record.text.trim() : '';
    if (!textValue) {
      return;
    }
    const entry: ReferenceEntry = { text: textValue };
    if (typeof record.key === 'string' && record.key.trim()) {
      entry.key = record.key.trim();
    }
    if (typeof record.n === 'number' && Number.isFinite(record.n)) {
      entry.n = Math.trunc(record.n);
    }
    entries.push(entry);
  });
  if (entries.length <= 1) {
    return entries;
  }
  return entries.sort((a, b) => {
    if (typeof a.n === 'number' && typeof b.n === 'number') {
      return a.n - b.n;
    }
    if (typeof a.n === 'number') {
      return -1;
    }
    if (typeof b.n === 'number') {
      return 1;
    }
    return 0;
  });
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
  const [mode, setMode] = useState<ProfileMode>('live');
  const [status, setStatus] = useState<ProfileStatus>('idle');
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileId] = useState<string>(DEFAULT_PROFILE_ID);
  const [refreshToken, setRefreshToken] = useState(0);
  const [activeLayers, setActiveLayersState] = useState<string[]>([PRIMARY_LAYER_ID]);

  const overrides = useMemo(() => buildOverrides(controls), [controls]);
  const overridesKey = useMemo(() => JSON.stringify(overrides), [overrides]);

  const assetBasePath = useMemo(() => resolvePublicBasePath(), []);
  const baselineUrl = useMemo(() => `${assetBasePath}outputs/baseline.json`, [assetBasePath]);
  const baselineCache = useRef<ComputeResult | null>(null);

  const fetchBaseline = useCallback(async (): Promise<ComputeResult> => {
    if (baselineCache.current) {
      return baselineCache.current;
    }
    const response = await fetch(baselineUrl, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Baseline dataset unavailable (${response.status})`);
    }
    const payload = await response.json();
    const parsed = parseComputeResponse(payload);
    baselineCache.current = parsed;
    return parsed;
  }, [baselineUrl]);

  const availableLayers = useMemo(() => {
    const unique = new Set<string>();
    const push = (values: unknown) => {
      toStringArray(values).forEach((layer) => unique.add(layer));
    };
    push(result?.manifest?.layers);
    push(result?.figures?.stacked?.layers);
    push(result?.figures?.bubble?.layers);
    push(result?.figures?.sankey?.layers);
    if (unique.size === 0) {
      unique.add(PRIMARY_LAYER_ID);
    }
    return Array.from(unique);
  }, [result]);

  const layerCitationKeys = useMemo(() => {
    const combined: Record<string, string[]> = {};
    const merge = (mapping: Record<string, string[]>) => {
      Object.entries(mapping).forEach(([layer, keys]) => {
        if (!combined[layer]) {
          combined[layer] = [...keys];
          return;
        }
        const existing = new Set(combined[layer]);
        keys.forEach((key) => {
          if (!existing.has(key)) {
            combined[layer].push(key);
            existing.add(key);
          }
        });
      });
    };
    merge(normaliseLayerMapping(result?.manifest?.layer_citation_keys));
    merge(normaliseLayerMapping(result?.figures?.stacked?.layer_citation_keys));
    merge(normaliseLayerMapping(result?.figures?.bubble?.layer_citation_keys));
    merge(normaliseLayerMapping(result?.figures?.sankey?.layer_citation_keys));
    return combined;
  }, [result]);

  const layerReferenceTexts = useMemo(
    () => normaliseLayerMapping(result?.manifest?.layer_references),
    [result]
  );

  const citationOrder = useMemo(() => {
    const manifestSources = toStringArray(result?.manifest?.sources);
    if (manifestSources.length > 0) {
      return manifestSources;
    }
    const stackedKeys = toStringArray(result?.figures?.stacked?.citation_keys);
    if (stackedKeys.length > 0) {
      return stackedKeys;
    }
    const bubbleKeys = toStringArray(result?.figures?.bubble?.citation_keys);
    if (bubbleKeys.length > 0) {
      return bubbleKeys;
    }
    return toStringArray(result?.figures?.sankey?.citation_keys);
  }, [result]);

  const referenceEntries = useMemo(() => normaliseReferenceEntries(result?.references), [result]);

  const referenceByKey = useMemo(() => {
    const lookup = new Map<string, ReferenceEntry>();
    referenceEntries.forEach((entry) => {
      if (entry.key) {
        lookup.set(entry.key, entry);
      }
    });
    return lookup;
  }, [referenceEntries]);

  const activeReferenceKeys = useMemo(() => {
    const activeSet = new Set<string>();
    activeLayers.forEach((layer) => {
      const keys = layerCitationKeys[layer];
      if (Array.isArray(keys)) {
        keys.forEach((key) => {
          if (typeof key === 'string' && key) {
            activeSet.add(key);
          }
        });
      }
    });
    if (activeSet.size === 0) {
      return citationOrder;
    }
    const ordered: string[] = [];
    citationOrder.forEach((key) => {
      if (activeSet.has(key)) {
        ordered.push(key);
        activeSet.delete(key);
      }
    });
    activeSet.forEach((key) => ordered.push(key));
    return ordered;
  }, [activeLayers, layerCitationKeys, citationOrder]);

  const activeReferences = useMemo(() => {
    const seen = new Set<string>();
    const ordered: ReferenceEntry[] = [];

    const pushEntry = (entry: ReferenceEntry | undefined) => {
      if (!entry || !entry.text) {
        return;
      }
      const cleaned = cleanReferenceText(entry.text);
      if (!cleaned || seen.has(cleaned)) {
        return;
      }
      seen.add(cleaned);
      ordered.push({ ...entry, text: cleaned });
    };

    const pushText = (text: string) => {
      const cleaned = cleanReferenceText(text);
      if (!cleaned || seen.has(cleaned)) {
        return;
      }
      seen.add(cleaned);
      ordered.push({ text: cleaned });
    };

    activeReferenceKeys.forEach((key) => {
      pushEntry(referenceByKey.get(key));
    });

    if (ordered.length === 0) {
      activeLayers.forEach((layer) => {
        const references = layerReferenceTexts[layer];
        if (!Array.isArray(references)) {
          return;
        }
        references.forEach((reference) => pushText(reference));
      });
    }

    if (ordered.length === 0) {
      referenceEntries.forEach((entry) => pushEntry(entry));
    }

    return ordered;
  }, [activeLayers, activeReferenceKeys, layerReferenceTexts, referenceByKey, referenceEntries]);

  useEffect(() => {
    setActiveLayersState((previous) => {
      const fallback = availableLayers.includes(PRIMARY_LAYER_ID)
        ? PRIMARY_LAYER_ID
        : availableLayers[0] ?? PRIMARY_LAYER_ID;
      const availableSet = new Set(availableLayers);
      const nextSet = new Set<string>();
      previous.forEach((layer) => {
        if (typeof layer === 'string' && availableSet.has(layer)) {
          nextSet.add(layer);
        }
      });

      if (availableSet.size === 0) {
        return [fallback];
      }

      if (nextSet.size === 0 || (nextSet.size === 1 && nextSet.has(fallback))) {
        return Array.from(availableSet);
      }

      nextSet.add(fallback);
      const ordered: string[] = [];
      availableLayers.forEach((layer) => {
        if (nextSet.has(layer)) {
          ordered.push(layer);
          nextSet.delete(layer);
        }
      });
      nextSet.forEach((layer) => ordered.push(layer));
      return ordered;
    });
  }, [availableLayers]);

  const setActiveLayers = useCallback(
    (layers: string[]) => {
      setActiveLayersState(() => {
        const fallback = availableLayers.includes(PRIMARY_LAYER_ID)
          ? PRIMARY_LAYER_ID
          : availableLayers[0] ?? PRIMARY_LAYER_ID;
        const nextSet = new Set<string>();
        if (Array.isArray(layers)) {
          layers.forEach((layer) => {
            if (typeof layer === 'string' && availableLayers.includes(layer)) {
              nextSet.add(layer);
            }
          });
        }
        nextSet.add(fallback);
        const ordered: string[] = [];
        availableLayers.forEach((layer) => {
          if (nextSet.has(layer)) {
            ordered.push(layer);
            nextSet.delete(layer);
          }
        });
        nextSet.forEach((layer) => ordered.push(layer));
        return ordered;
      });
    },
    [availableLayers]
  );

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

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 800);

    const run = async () => {
      try {
        await health({ signal: controller.signal });
        window.clearTimeout(timer);
        if (cancelled) {
          return;
        }
        setMode('live');
        setError(null);
      } catch (healthError) {
        window.clearTimeout(timer);
        if (cancelled) {
          return;
        }
        console.warn('Health check failed; switching to static baseline', healthError);
        setMode('static');
        setStatus('loading');
        try {
          const baseline = await fetchBaseline();
          if (cancelled) {
            return;
          }
          setResult(baseline);
          setStatus('success');
          setError(null);
        } catch (baselineError) {
          if (cancelled) {
            return;
          }
          console.error('Failed to load baseline dataset', baselineError);
          setError('Baseline dataset unavailable');
          setStatus('error');
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchBaseline]);

  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (mode === 'static') {
      return;
    }
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
        const response = await compute(payload, {
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
        if (mode === 'live') {
          console.warn('Compute request failed; falling back to baseline dataset', requestError);
          setMode('static');
          setStatus('loading');
          try {
            const baseline = await fetchBaseline();
            if (controller.signal.aborted) {
              return;
            }
            setResult(baseline);
            setStatus('success');
            setError(null);
            return;
          } catch (baselineError) {
            console.error('Unable to load baseline dataset after compute failure', baselineError);
          }
        }
        setError(message);
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    debounceRef.current = timeoutId;

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [profileId, overrides, overridesKey, refreshToken, mode, fetchBaseline]);

  const refresh = useCallback(() => {
    setMode('live');
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
      mode,
      result,
      error,
      refresh,
      primaryLayer: PRIMARY_LAYER_ID,
      availableLayers,
      activeLayers,
      activeReferenceKeys,
      activeReferences,
      setActiveLayers,
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
      mode,
      result,
      error,
      refresh,
      availableLayers,
      activeLayers,
      activeReferenceKeys,
      activeReferences,
      setActiveLayers,
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
