import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

/**
 * ProfileContext - Manages user's personal carbon footprint profile
 *
 * Features:
 * - localStorage persistence (hybrid stub for future backend)
 * - Selected activities from sectors
 * - Calculator results
 * - Real-time footprint totals
 */

// ============================================================================
// Types
// ============================================================================

export interface SelectedActivity {
  id: string;
  sectorId: string;
  name: string;
  category: string | null;
  /** User-specified quantity (e.g., "10 km/day") */
  quantity: number;
  /** Unit from backend (e.g., "km", "kWh") */
  unit: string;
  /** Carbon intensity in kg CO₂e per unit */
  carbonIntensity: number;
  /** Calculated: quantity * carbonIntensity */
  annualEmissions: number;
  addedAt: string; // ISO timestamp
  /** Optional icon type from icon registry */
  iconType?: string;
  /** Optional direct icon URL */
  iconUrl?: string;
  /** Optional brand/badge color */
  badgeColor?: string;
}

export interface CalculatorResult {
  category: 'commute' | 'diet' | 'energy' | 'shopping';
  label: string;
  annualEmissions: number;
  calculatedAt: string; // ISO timestamp
}

export interface ProfileData {
  activities: SelectedActivity[];
  calculatorResults: CalculatorResult[];
  lastUpdated: string; // ISO timestamp
}

export interface HistoricalSnapshot {
  timestamp: string; // ISO timestamp
  totalEmissions: number;
  activityCount: number;
  topSectors: Array<{
    sectorId: string;
    emissions: number;
  }>;
}

interface ProfileContextValue {
  profile: ProfileData;
  /** Total annual emissions from all sources */
  totalEmissions: number;
  /** Historical snapshots for tracking over time */
  history: HistoricalSnapshot[];
  /** Add an activity to profile */
  addActivity: (activity: Omit<SelectedActivity, 'addedAt'>) => void;
  /** Remove activity by ID */
  removeActivity: (activityId: string) => void;
  /** Update activity quantity */
  updateActivityQuantity: (activityId: string, quantity: number) => void;
  /** Save calculator results */
  saveCalculatorResults: (results: Omit<CalculatorResult, 'calculatedAt'>[]) => void;
  /** Clear entire profile */
  clearProfile: () => void;
  /** Check if activity is in profile */
  hasActivity: (activityId: string) => boolean;
  /** Manually take a snapshot of current profile */
  takeSnapshot: () => void;
  /** Get time-series data for charting */
  getTimeSeriesData: () => Array<{ date: string; value: number }>;
}

// ============================================================================
// Context
// ============================================================================

const ProfileContext = createContext<ProfileContextValue | null>(null);

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'carbon-acx:profile';
const HISTORY_STORAGE_KEY = 'carbon-acx:history';
const STORAGE_VERSION = 1;
const MAX_HISTORY_ENTRIES = 365; // Keep up to 1 year of daily snapshots
const SNAPSHOT_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 hours

const EMPTY_PROFILE: ProfileData = {
  activities: [],
  calculatorResults: [],
  lastUpdated: new Date().toISOString(),
};

// ============================================================================
// Utilities
// ============================================================================

/** Load profile from localStorage with version checking */
function loadProfile(): ProfileData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return EMPTY_PROFILE;

    const parsed = JSON.parse(stored);

    // Version check for future migrations
    if (parsed.version !== STORAGE_VERSION) {
      console.warn(`Profile version mismatch (${parsed.version} vs ${STORAGE_VERSION}), resetting`);
      return EMPTY_PROFILE;
    }

    return parsed.data as ProfileData;
  } catch (error) {
    console.error('Failed to load profile from localStorage:', error);
    return EMPTY_PROFILE;
  }
}

/** Save profile to localStorage */
function saveProfile(data: ProfileData): void {
  try {
    const payload = {
      version: STORAGE_VERSION,
      data: {
        ...data,
        lastUpdated: new Date().toISOString(),
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to save profile to localStorage:', error);
  }
}

/** Calculate total emissions from profile */
function calculateTotal(profile: ProfileData): number {
  const activityTotal = profile.activities.reduce(
    (sum, activity) => sum + activity.annualEmissions,
    0
  );
  const calculatorTotal = profile.calculatorResults.reduce(
    (sum, result) => sum + result.annualEmissions,
    0
  );
  return activityTotal + calculatorTotal;
}

/** Load history from localStorage */
function loadHistory(): HistoricalSnapshot[] {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (parsed.version !== STORAGE_VERSION) {
      console.warn('History version mismatch, resetting');
      return [];
    }

    return (parsed.data || []) as HistoricalSnapshot[];
  } catch (error) {
    console.error('Failed to load history from localStorage:', error);
    return [];
  }
}

/** Save history to localStorage */
function saveHistory(history: HistoricalSnapshot[]): void {
  try {
    // Keep only the most recent entries
    const trimmed = history.slice(-MAX_HISTORY_ENTRIES);

    const payload = {
      version: STORAGE_VERSION,
      data: trimmed,
    };
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to save history to localStorage:', error);
  }
}

/** Create a snapshot from current profile */
function createSnapshot(profile: ProfileData, totalEmissions: number): HistoricalSnapshot {
  // Calculate emissions by sector
  const sectorMap = new Map<string, number>();
  profile.activities.forEach((activity) => {
    const current = sectorMap.get(activity.sectorId) || 0;
    sectorMap.set(activity.sectorId, current + activity.annualEmissions);
  });

  // Get top 5 sectors
  const topSectors = Array.from(sectorMap.entries())
    .map(([sectorId, emissions]) => ({ sectorId, emissions }))
    .sort((a, b) => b.emissions - a.emissions)
    .slice(0, 5);

  return {
    timestamp: new Date().toISOString(),
    totalEmissions,
    activityCount: profile.activities.length + profile.calculatorResults.length,
    topSectors,
  };
}

/** Check if snapshot should be taken (throttled to once per day) */
function shouldTakeSnapshot(history: HistoricalSnapshot[]): boolean {
  if (history.length === 0) return true;

  const lastSnapshot = history[history.length - 1];
  const lastTime = new Date(lastSnapshot.timestamp).getTime();
  const now = Date.now();

  return now - lastTime >= SNAPSHOT_THROTTLE_MS;
}

// ============================================================================
// Provider Component
// ============================================================================

interface ProfileProviderProps {
  children: ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const [profile, setProfile] = useState<ProfileData>(loadProfile);
  const [totalEmissions, setTotalEmissions] = useState<number>(() => calculateTotal(profile));
  const [history, setHistory] = useState<HistoricalSnapshot[]>(loadHistory);

  // Persist to localStorage whenever profile changes
  useEffect(() => {
    saveProfile(profile);
    const newTotal = calculateTotal(profile);
    setTotalEmissions(newTotal);

    // Automatically take snapshot if enough time has passed
    if (shouldTakeSnapshot(history)) {
      const snapshot = createSnapshot(profile, newTotal);
      const newHistory = [...history, snapshot];
      setHistory(newHistory);
      saveHistory(newHistory);
    }
  }, [profile, history]);

  const addActivity = (activity: Omit<SelectedActivity, 'addedAt'>) => {
    setProfile((prev) => {
      // Prevent duplicates
      if (prev.activities.some((a) => a.id === activity.id)) {
        return prev;
      }

      const newActivity: SelectedActivity = {
        ...activity,
        addedAt: new Date().toISOString(),
      };

      return {
        ...prev,
        activities: [...prev.activities, newActivity],
      };
    });
  };

  const removeActivity = (activityId: string) => {
    setProfile((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== activityId),
    }));
  };

  const updateActivityQuantity = (activityId: string, quantity: number) => {
    setProfile((prev) => ({
      ...prev,
      activities: prev.activities.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              quantity,
              annualEmissions: quantity * activity.carbonIntensity,
            }
          : activity
      ),
    }));
  };

  const saveCalculatorResults = (results: Omit<CalculatorResult, 'calculatedAt'>[]) => {
    setProfile((prev) => ({
      ...prev,
      calculatorResults: results.map((result) => ({
        ...result,
        calculatedAt: new Date().toISOString(),
      })),
    }));
  };

  const clearProfile = () => {
    setProfile(EMPTY_PROFILE);
    localStorage.removeItem(STORAGE_KEY);
    // Optionally clear history too
    setHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  };

  const hasActivity = (activityId: string): boolean => {
    return profile.activities.some((a) => a.id === activityId);
  };

  const takeSnapshot = () => {
    const snapshot = createSnapshot(profile, totalEmissions);
    const newHistory = [...history, snapshot];
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  const getTimeSeriesData = (): Array<{ date: string; value: number }> => {
    return history.map((snapshot) => ({
      date: new Date(snapshot.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      value: snapshot.totalEmissions,
    }));
  };

  const value: ProfileContextValue = {
    profile,
    totalEmissions,
    history,
    addActivity,
    removeActivity,
    updateActivityQuantity,
    saveCalculatorResults,
    clearProfile,
    hasActivity,
    takeSnapshot,
    getTimeSeriesData,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
}
