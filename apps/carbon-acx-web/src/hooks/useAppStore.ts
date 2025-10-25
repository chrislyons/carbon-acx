/**
 * useAppStore Hook
 *
 * Convenient re-export of Zustand store with TypeScript inference.
 * Provides type-safe access to app state and actions.
 */

export { useAppStore } from '../store/appStore';

// Re-export types for convenience
export type {
  Activity,
  ProfileLayer,
  CalculatorResult,
  ProfileData,
  CanvasZone,
  TransitionState,
} from '../store/appStore';
