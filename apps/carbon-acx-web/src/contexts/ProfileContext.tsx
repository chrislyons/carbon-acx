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

interface ProfileContextValue {
  profile: ProfileData;
  /** Total annual emissions from all sources */
  totalEmissions: number;
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
}

// ============================================================================
// Context
// ============================================================================

const ProfileContext = createContext<ProfileContextValue | null>(null);

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'carbon-acx:profile';
const STORAGE_VERSION = 1;

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

// ============================================================================
// Provider Component
// ============================================================================

interface ProfileProviderProps {
  children: ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const [profile, setProfile] = useState<ProfileData>(loadProfile);
  const [totalEmissions, setTotalEmissions] = useState<number>(() => calculateTotal(profile));

  // Persist to localStorage whenever profile changes
  useEffect(() => {
    saveProfile(profile);
    setTotalEmissions(calculateTotal(profile));
  }, [profile]);

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
  };

  const hasActivity = (activityId: string): boolean => {
    return profile.activities.some((a) => a.id === activityId);
  };

  const value: ProfileContextValue = {
    profile,
    totalEmissions,
    addActivity,
    removeActivity,
    updateActivityQuantity,
    saveCalculatorResults,
    clearProfile,
    hasActivity,
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
