/**
 * App Store - Zustand-based global state management
 *
 * Handles:
 * - UI state (active zones, transitions)
 * - Profile data (activities, layers)
 * - Goals and scenarios
 * - Settings and preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface Activity {
  id: string;
  sectorId: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  carbonIntensity: number;
  annualEmissions: number;
  addedAt: string;
  iconType?: string;
  iconUrl?: string;
  badgeColor?: string;
}

export interface ProfileLayer {
  id: string;
  name: string;
  sourceProfileId: string | null;
  color: string;
  visible: boolean;
  activities: Activity[];
  createdAt: string;
}

export interface CalculatorResult {
  category: 'commute' | 'diet' | 'energy' | 'shopping';
  label: string;
  annualEmissions: number;
  calculatedAt: string;
}

export interface CarbonGoal {
  id: string;
  name: string;
  targetEmissions: number; // kg CO₂/year
  currentEmissions: number; // kg CO₂/year
  deadline?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
  milestones: {
    percent: number;
    achieved: boolean;
    achievedAt?: string;
  }[];
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  changes: {
    activityId: string;
    activityName: string;
    originalQuantity: number;
    newQuantity: number;
    quantityDiff: number;
    emissionsDiff: number;
  }[];
  totalImpact: number; // kg CO₂ saved (positive) or added (negative)
  percentageChange: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileData {
  activities: Activity[];
  calculatorResults: CalculatorResult[];
  layers: ProfileLayer[];
  goals: CarbonGoal[];
  scenarios: Scenario[];
  lastUpdated: string;
}

export type CanvasZone = 'hero' | 'insight' | 'detail';
export type TransitionState = 'idle' | 'animating';

// ============================================================================
// Store Interface
// ============================================================================

interface AppStore {
  // UI State
  activeZone: CanvasZone;
  transitionState: TransitionState;
  setActiveZone: (zone: CanvasZone) => void;
  setTransitionState: (state: TransitionState) => void;

  // Profile Data
  profile: ProfileData;

  // Profile Actions
  addActivity: (activity: Omit<Activity, 'addedAt'>) => void;
  removeActivity: (activityId: string) => void;
  updateActivityQuantity: (activityId: string, quantity: number) => void;
  clearProfile: () => void;

  // Calculator Actions
  saveCalculatorResults: (results: Omit<CalculatorResult, 'calculatedAt'>[]) => void;

  // Layer Actions
  addLayer: (layer: Omit<ProfileLayer, 'createdAt'>) => void;
  removeLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;

  // Goal Actions
  addGoal: (goal: Omit<CarbonGoal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateGoal: (goalId: string, updates: Partial<CarbonGoal>) => void;
  removeGoal: (goalId: string) => void;

  // Scenario Actions
  addScenario: (scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateScenario: (scenarioId: string, updates: Partial<Scenario>) => void;
  removeScenario: (scenarioId: string) => void;

  // Computed Values
  getTotalEmissions: () => number;

  // Convenience accessors (for easier component usage)
  get activities(): Activity[];
  get layers(): ProfileLayer[];
  get calculatorResults(): CalculatorResult[];
  get goals(): CarbonGoal[];
  get scenarios(): Scenario[];
}

// ============================================================================
// Initial State
// ============================================================================

const initialProfile: ProfileData = {
  activities: [],
  calculatorResults: [],
  layers: [],
  goals: [],
  scenarios: [],
  lastUpdated: new Date().toISOString(),
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // UI State
      activeZone: 'hero',
      transitionState: 'idle',

      setActiveZone: (zone) => set({ activeZone: zone }),
      setTransitionState: (state) => set({ transitionState: state }),

      // Profile Data
      profile: initialProfile,

      // Profile Actions
      addActivity: (activity) =>
        set((state) => {
          // Prevent duplicates
          if (state.profile.activities.some((a) => a.id === activity.id)) {
            return state;
          }

          return {
            profile: {
              ...state.profile,
              activities: [
                ...state.profile.activities,
                {
                  ...activity,
                  addedAt: new Date().toISOString(),
                },
              ],
              lastUpdated: new Date().toISOString(),
            },
          };
        }),

      removeActivity: (activityId) =>
        set((state) => ({
          profile: {
            ...state.profile,
            activities: state.profile.activities.filter((a) => a.id !== activityId),
            lastUpdated: new Date().toISOString(),
          },
        })),

      updateActivityQuantity: (activityId, quantity) =>
        set((state) => ({
          profile: {
            ...state.profile,
            activities: state.profile.activities.map((activity) =>
              activity.id === activityId
                ? {
                    ...activity,
                    quantity,
                    annualEmissions: quantity * activity.carbonIntensity,
                  }
                : activity
            ),
            lastUpdated: new Date().toISOString(),
          },
        })),

      clearProfile: () =>
        set({
          profile: initialProfile,
        }),

      // Calculator Actions
      saveCalculatorResults: (results) =>
        set((state) => ({
          profile: {
            ...state.profile,
            calculatorResults: results.map((result) => ({
              ...result,
              calculatedAt: new Date().toISOString(),
            })),
            lastUpdated: new Date().toISOString(),
          },
        })),

      // Layer Actions
      addLayer: (layer) =>
        set((state) => {
          // Prevent duplicate layer IDs
          if (state.profile.layers.some((l) => l.id === layer.id)) {
            console.warn(`Layer with ID ${layer.id} already exists, skipping`);
            return state;
          }

          return {
            profile: {
              ...state.profile,
              layers: [
                ...state.profile.layers,
                {
                  ...layer,
                  createdAt: new Date().toISOString(),
                },
              ],
              lastUpdated: new Date().toISOString(),
            },
          };
        }),

      removeLayer: (layerId) =>
        set((state) => ({
          profile: {
            ...state.profile,
            layers: state.profile.layers.filter((l) => l.id !== layerId),
            lastUpdated: new Date().toISOString(),
          },
        })),

      toggleLayerVisibility: (layerId) =>
        set((state) => ({
          profile: {
            ...state.profile,
            layers: state.profile.layers.map((layer) =>
              layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
            ),
            lastUpdated: new Date().toISOString(),
          },
        })),

      renameLayer: (layerId, name) =>
        set((state) => ({
          profile: {
            ...state.profile,
            layers: state.profile.layers.map((layer) =>
              layer.id === layerId ? { ...layer, name } : layer
            ),
            lastUpdated: new Date().toISOString(),
          },
        })),

      // Goal Actions
      addGoal: (goal) =>
        set((state) => ({
          profile: {
            ...state.profile,
            goals: [
              ...state.profile.goals,
              {
                ...goal,
                id: `goal-${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            lastUpdated: new Date().toISOString(),
          },
        })),

      updateGoal: (goalId, updates) =>
        set((state) => ({
          profile: {
            ...state.profile,
            goals: state.profile.goals.map((goal) =>
              goal.id === goalId
                ? {
                    ...goal,
                    ...updates,
                    updatedAt: new Date().toISOString(),
                  }
                : goal
            ),
            lastUpdated: new Date().toISOString(),
          },
        })),

      removeGoal: (goalId) =>
        set((state) => ({
          profile: {
            ...state.profile,
            goals: state.profile.goals.filter((g) => g.id !== goalId),
            lastUpdated: new Date().toISOString(),
          },
        })),

      // Scenario Actions
      addScenario: (scenario) =>
        set((state) => ({
          profile: {
            ...state.profile,
            scenarios: [
              ...state.profile.scenarios,
              {
                ...scenario,
                id: `scenario-${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            lastUpdated: new Date().toISOString(),
          },
        })),

      updateScenario: (scenarioId, updates) =>
        set((state) => ({
          profile: {
            ...state.profile,
            scenarios: state.profile.scenarios.map((scenario) =>
              scenario.id === scenarioId
                ? {
                    ...scenario,
                    ...updates,
                    updatedAt: new Date().toISOString(),
                  }
                : scenario
            ),
            lastUpdated: new Date().toISOString(),
          },
        })),

      removeScenario: (scenarioId) =>
        set((state) => ({
          profile: {
            ...state.profile,
            scenarios: state.profile.scenarios.filter((s) => s.id !== scenarioId),
            lastUpdated: new Date().toISOString(),
          },
        })),

      // Computed Values
      getTotalEmissions: () => {
        const state = get();
        const activityTotal = state.profile.activities.reduce(
          (sum, activity) => sum + activity.annualEmissions,
          0
        );
        const calculatorTotal = state.profile.calculatorResults.reduce(
          (sum, result) => sum + result.annualEmissions,
          0
        );
        const layerTotal = state.profile.layers
          .filter((layer) => layer.visible)
          .reduce((sum, layer) => {
            const layerEmissions = layer.activities.reduce(
              (layerSum, activity) => layerSum + activity.annualEmissions,
              0
            );
            return sum + layerEmissions;
          }, 0);
        return activityTotal + calculatorTotal + layerTotal;
      },

      // Convenience accessors
      get activities() {
        return get().profile.activities;
      },
      get layers() {
        return get().profile.layers;
      },
      get calculatorResults() {
        return get().profile.calculatorResults;
      },
      get goals() {
        return get().profile.goals;
      },
      get scenarios() {
        return get().profile.scenarios;
      },
    }),
    {
      name: 'carbon-acx-storage',
      partialize: (state) => ({
        profile: state.profile,
      }),
    }
  )
);
