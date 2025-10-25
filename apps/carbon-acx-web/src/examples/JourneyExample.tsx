/**
 * JourneyExample - Complete User Journey Demonstration
 *
 * Showcases the full Carbon ACX experience using all Phase 1 components:
 * - XState journey machine orchestration
 * - All three story scenes (Onboarding → Baseline → Explore)
 * - Canvas-first layout with zone-based organization
 * - Tier 1-3 component integration
 * - Zustand state management
 *
 * This example demonstrates the complete architecture working end-to-end.
 */

import * as React from 'react';
import { OnboardingScene } from '../components/scenes/OnboardingScene';
import { BaselineScene } from '../components/scenes/BaselineScene';
import { ExploreScene } from '../components/scenes/ExploreScene';
import { useJourneyMachine } from '../hooks/useJourneyMachine';
import { useAppStore } from '../hooks/useAppStore';

export default function JourneyExample() {
  const {
    currentScene,
    isOnboarding,
    isBaseline,
    isExplore,
    isInsight,
    completeOnboarding,
    baselineComplete,
    viewInsights,
  } = useJourneyMachine();

  const totalEmissions = useAppStore((state) => state.getTotalEmissions());
  const activityCount = useAppStore((state) => state.activities.length);

  // Debug panel (can be removed in production)
  const [showDebug, setShowDebug] = React.useState(true);

  return (
    <div className="min-h-screen bg-[var(--surface-bg)]">
      {/* Onboarding Scene */}
      {isOnboarding && (
        <OnboardingScene
          show={isOnboarding}
          onComplete={() => {
            completeOnboarding();
          }}
          onSkip={() => {
            completeOnboarding();
          }}
        />
      )}

      {/* Baseline Scene */}
      {isBaseline && (
        <BaselineScene
          show={isBaseline}
          onComplete={() => {
            baselineComplete();
          }}
        />
      )}

      {/* Explore Scene */}
      {isExplore && (
        <ExploreScene
          show={isExplore}
          initialMode="timeline"
        />
      )}

      {/* Insight Scene (placeholder - to be implemented in Phase 2) */}
      {isInsight && (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-2xl text-center space-y-6">
            <h1 className="text-[var(--font-size-4xl)] font-bold text-[var(--text-primary)]">
              Insights Scene
            </h1>
            <p className="text-[var(--font-size-lg)] text-[var(--text-secondary)]">
              Coming in Phase 2 Week 5
            </p>
          </div>
        </div>
      )}

      {/* Debug Panel - Journey State Viewer */}
      {showDebug && (
        <div className="fixed bottom-4 right-4 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-lg)] max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[var(--font-size-sm)] font-semibold text-[var(--text-primary)]">
              Journey Debug
            </h3>
            <button
              onClick={() => setShowDebug(false)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Close debug panel"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-[var(--font-size-xs)] font-mono">
            {/* Current scene */}
            <div>
              <span className="text-[var(--text-secondary)]">Scene:</span>{' '}
              <span className="font-semibold text-[var(--interactive-primary)]">
                {currentScene}
              </span>
            </div>

            {/* State checks */}
            <div>
              <span className="text-[var(--text-secondary)]">States:</span>
              <ul className="ml-3 mt-1 space-y-0.5">
                <li className={isOnboarding ? 'text-[var(--carbon-low)]' : 'text-[var(--text-tertiary)]'}>
                  {isOnboarding ? '✓' : '○'} onboarding
                </li>
                <li className={isBaseline ? 'text-[var(--carbon-low)]' : 'text-[var(--text-tertiary)]'}>
                  {isBaseline ? '✓' : '○'} baseline
                </li>
                <li className={isExplore ? 'text-[var(--carbon-low)]' : 'text-[var(--text-tertiary)]'}>
                  {isExplore ? '✓' : '○'} explore
                </li>
                <li className={isInsight ? 'text-[var(--carbon-low)]' : 'text-[var(--text-tertiary)]'}>
                  {isInsight ? '✓' : '○'} insight
                </li>
              </ul>
            </div>

            {/* App state */}
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)]">App State:</span>
              <ul className="ml-3 mt-1 space-y-0.5">
                <li>
                  <span className="text-[var(--text-secondary)]">Activities:</span>{' '}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {activityCount}
                  </span>
                </li>
                <li>
                  <span className="text-[var(--text-secondary)]">Emissions:</span>{' '}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {totalEmissions.toFixed(0)} kg
                  </span>
                </li>
              </ul>
            </div>

            {/* Quick actions */}
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)]">Quick Actions:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                <button
                  onClick={completeOnboarding}
                  className="px-2 py-1 bg-[var(--interactive-primary)] text-white rounded text-[10px]"
                  disabled={!isOnboarding}
                >
                  Skip Onboard
                </button>
                <button
                  onClick={baselineComplete}
                  className="px-2 py-1 bg-[var(--interactive-primary)] text-white rounded text-[10px]"
                  disabled={!isBaseline}
                >
                  Complete Base
                </button>
                <button
                  onClick={viewInsights}
                  className="px-2 py-1 bg-[var(--interactive-primary)] text-white rounded text-[10px]"
                  disabled={!isExplore}
                >
                  View Insights
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle debug button (if panel is hidden) */}
      {!showDebug && (
        <button
          onClick={() => setShowDebug(true)}
          className="fixed bottom-4 right-4 px-4 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)] text-[var(--font-size-sm)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          aria-label="Show debug panel"
        >
          Show Debug
        </button>
      )}
    </div>
  );
}
