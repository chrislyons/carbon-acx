/**
 * useJourneyMachine Hook
 *
 * React hook for XState journey machine integration.
 * Provides type-safe access to journey state and transitions.
 */

import { useMachine } from '@xstate/react';
import { journeyMachine } from '../machines/journeyMachine';

export function useJourneyMachine() {
  const [state, send] = useMachine(journeyMachine);

  return {
    // Current state
    state,
    currentScene: state.value as string,

    // State checks
    isOnboarding: state.matches('onboarding'),
    isBaseline: state.matches('baseline'),
    isExplore: state.matches('explore'),
    isInsight: state.matches('insight'),
    isAct: state.matches('act'),
    isShare: state.matches('share'),

    // Context values
    context: state.context,
    hasCompletedOnboarding: state.context.hasCompletedOnboarding,
    hasEstablishedBaseline: state.context.hasEstablishedBaseline,
    activitiesAdded: state.context.activitiesAdded,
    scenariosCreated: state.context.scenariosCreated,
    goalsSet: state.context.goalsSet,

    // Actions
    skipOnboarding: () => send({ type: 'SKIP_ONBOARDING' }),
    completeOnboarding: () => send({ type: 'COMPLETE_ONBOARDING' }),
    startCalculator: () => send({ type: 'START_CALCULATOR' }),
    finishCalculator: () => send({ type: 'FINISH_CALCULATOR' }),
    addActivities: () => send({ type: 'ADD_ACTIVITIES' }),
    baselineComplete: () => send({ type: 'BASELINE_COMPLETE' }),
    exploreSectors: () => send({ type: 'EXPLORE_SECTORS' }),
    viewInsights: () => send({ type: 'VIEW_INSIGHTS' }),
    createScenario: () => send({ type: 'CREATE_SCENARIO' }),
    setGoal: () => send({ type: 'SET_GOAL' }),
    exportData: () => send({ type: 'EXPORT_DATA' }),
    resetJourney: () => send({ type: 'RESET_JOURNEY' }),
  };
}

// Re-export types
export type { JourneyContext, JourneyEvent } from '../machines/journeyMachine';
