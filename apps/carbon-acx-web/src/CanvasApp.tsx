/**
 * CanvasApp - Phase 1 Rebuild Entry Point
 *
 * Canvas-first, story-driven application architecture.
 * Uses XState journey machine + Zustand app store.
 *
 * This is the new application - the old grid-based app is in legacy/
 */

import React from 'react';
import { useJourneyMachine } from './hooks/useJourneyMachine';
import { useAppStore } from './hooks/useAppStore';

// Story Scenes (Tier 5)
import { OnboardingScene } from './components/scenes/OnboardingScene';
import { BaselineScene } from './components/scenes/BaselineScene';
import { ExploreScene } from './components/scenes/ExploreScene';
import { InsightScene } from './components/scenes/InsightScene';

// Styles
import './styles/tokens.css';
import './index.css';

export default function CanvasApp() {
  const {
    isOnboarding,
    isBaseline,
    isExplore,
    isInsight,
    skipOnboarding,
    completeOnboarding,
    baselineComplete,
  } = useJourneyMachine();

  // Get total emissions for display
  const getTotalEmissions = useAppStore((state) => state.getTotalEmissions);
  const totalEmissions = getTotalEmissions();

  // Track chosen path from onboarding
  const [baselineMode, setBaselineMode] = React.useState<'calculator' | 'manual'>('calculator');

  const handleOnboardingComplete = (pathChoice: 'calculator' | 'manual') => {
    setBaselineMode(pathChoice);
    completeOnboarding();
  };

  return (
    <div className="min-h-screen bg-[var(--surface-bg)]">
      {/* Onboarding Scene */}
      <OnboardingScene
        show={isOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={skipOnboarding}
      />

      {/* Baseline Scene */}
      <BaselineScene
        show={isBaseline}
        mode={baselineMode}
        onComplete={baselineComplete}
      />

      {/* Explore Scene */}
      <ExploreScene
        show={isExplore}
        initialMode="timeline"
      />

      {/* Insight Scene */}
      <InsightScene show={isInsight} />

      {/* Debug Panel (development only) */}
      {import.meta.env.DEV && (
        <div
          className="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-secondary)',
            maxWidth: '300px',
            zIndex: 9999,
          }}
        >
          <div className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            🎨 Canvas App Debug
          </div>
          <div className="space-y-1">
            <div>State: {isOnboarding ? 'Onboarding' : isBaseline ? 'Baseline' : isExplore ? 'Explore' : 'Insight'}</div>
            <div>Emissions: {(totalEmissions / 1000).toFixed(1)}t CO₂/yr</div>
            <div className="pt-2 mt-2 border-t border-[var(--border-subtle)]">
              <div className="font-medium mb-1">Quick Actions:</div>
              <button
                onClick={skipOnboarding}
                className="block w-full text-left px-2 py-1 rounded hover:bg-[var(--surface-hover)]"
              >
                → Skip to Baseline
              </button>
              <button
                onClick={baselineComplete}
                className="block w-full text-left px-2 py-1 rounded hover:bg-[var(--surface-hover)]"
              >
                → Skip to Explore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
