/**
 * Journey State Machine - XState-based user flow orchestration
 *
 * Manages the narrative flow of the carbon literacy experience:
 * 1. Onboarding - Introduction and goal setting
 * 2. Baseline - Establish current footprint
 * 3. Explore - Discover emissions sources
 * 4. Insight - Analyze and compare
 * 5. Act - Set goals and model scenarios
 * 6. Share - Export and communicate
 */

import { createMachine, assign } from 'xstate';

// ============================================================================
// Types
// ============================================================================

export interface JourneyContext {
  // User state
  hasCompletedOnboarding: boolean;
  hasEstablishedBaseline: boolean;

  // Progress tracking
  activitiesAdded: number;
  scenariosCreated: number;
  goalsSet: number;
  exportsGenerated: number;

  // Journey metadata
  startedAt: string | null;
  currentStepCompletedAt: string | null;
}

export type JourneyEvent =
  | { type: 'SKIP_ONBOARDING' }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'START_CALCULATOR' }
  | { type: 'FINISH_CALCULATOR' }
  | { type: 'ADD_ACTIVITIES' }
  | { type: 'BASELINE_COMPLETE' }
  | { type: 'EXPLORE_SECTORS' }
  | { type: 'VIEW_INSIGHTS' }
  | { type: 'CREATE_SCENARIO' }
  | { type: 'SET_GOAL' }
  | { type: 'EXPORT_DATA' }
  | { type: 'RESET_JOURNEY' };

// ============================================================================
// Machine Definition
// ============================================================================

export const journeyMachine = createMachine(
  {
    id: 'carbonJourney',
    initial: 'onboarding',
    context: {
      hasCompletedOnboarding: false,
      hasEstablishedBaseline: false,
      activitiesAdded: 0,
      scenariosCreated: 0,
      goalsSet: 0,
      exportsGenerated: 0,
      startedAt: null,
      currentStepCompletedAt: null,
    } as JourneyContext,
    types: {} as {
      context: JourneyContext;
      events: JourneyEvent;
    },
    states: {
      // ======================================================================
      // Onboarding - Introduction and goal setting
      // ======================================================================
      onboarding: {
        entry: assign({
          startedAt: () => new Date().toISOString(),
        }),
        on: {
          SKIP_ONBOARDING: {
            target: 'baseline',
          },
          COMPLETE_ONBOARDING: {
            target: 'baseline',
            actions: assign({
              hasCompletedOnboarding: true,
              currentStepCompletedAt: () => new Date().toISOString(),
            }),
          },
        },
      },

      // ======================================================================
      // Baseline - Establish current footprint
      // ======================================================================
      baseline: {
        initial: 'choosing',
        states: {
          choosing: {
            on: {
              START_CALCULATOR: 'calculator',
              ADD_ACTIVITIES: 'manual',
            },
          },
          calculator: {
            on: {
              FINISH_CALCULATOR: {
                target: '#carbonJourney.explore',
                actions: assign({
                  hasEstablishedBaseline: true,
                  currentStepCompletedAt: () => new Date().toISOString(),
                }),
              },
            },
          },
          manual: {
            on: {
              BASELINE_COMPLETE: {
                target: '#carbonJourney.explore',
                actions: assign({
                  hasEstablishedBaseline: true,
                  activitiesAdded: ({ context, event }) => context.activitiesAdded + 1,
                  currentStepCompletedAt: () => new Date().toISOString(),
                }),
              },
            },
          },
        },
      },

      // ======================================================================
      // Explore - Discover emissions sources
      // ======================================================================
      explore: {
        initial: 'sectors',
        states: {
          sectors: {
            on: {
              ADD_ACTIVITIES: {
                actions: assign({
                  activitiesAdded: ({ context }) => context.activitiesAdded + 1,
                }),
              },
              VIEW_INSIGHTS: {
                target: '#carbonJourney.insight',
              },
            },
          },
        },
      },

      // ======================================================================
      // Insight - Analyze and compare
      // ======================================================================
      insight: {
        on: {
          EXPLORE_SECTORS: 'explore',
          CREATE_SCENARIO: {
            target: 'act',
            actions: assign({
              scenariosCreated: ({ context }) => context.scenariosCreated + 1,
            }),
          },
          SET_GOAL: {
            target: 'act',
            actions: assign({
              goalsSet: ({ context }) => context.goalsSet + 1,
            }),
          },
          EXPORT_DATA: {
            target: 'share',
          },
        },
      },

      // ======================================================================
      // Act - Set goals and model scenarios
      // ======================================================================
      act: {
        on: {
          EXPLORE_SECTORS: 'explore',
          VIEW_INSIGHTS: 'insight',
          CREATE_SCENARIO: {
            actions: assign({
              scenariosCreated: ({ context }) => context.scenariosCreated + 1,
            }),
          },
          SET_GOAL: {
            actions: assign({
              goalsSet: ({ context }) => context.goalsSet + 1,
            }),
          },
          EXPORT_DATA: 'share',
        },
      },

      // ======================================================================
      // Share - Export and communicate
      // ======================================================================
      share: {
        on: {
          EXPORT_DATA: {
            actions: assign({
              exportsGenerated: ({ context }) => context.exportsGenerated + 1,
            }),
          },
          EXPLORE_SECTORS: 'explore',
          VIEW_INSIGHTS: 'insight',
          CREATE_SCENARIO: 'act',
        },
      },
    },
    on: {
      RESET_JOURNEY: {
        target: '.onboarding',
        actions: assign({
          hasCompletedOnboarding: false,
          hasEstablishedBaseline: false,
          activitiesAdded: 0,
          scenariosCreated: 0,
          goalsSet: 0,
          exportsGenerated: 0,
          startedAt: null,
          currentStepCompletedAt: null,
        }),
      },
    },
  }
);
