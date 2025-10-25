/**
 * BaselineScene - Establish user's baseline carbon footprint
 *
 * Integrates two pathways established in onboarding:
 * 1. EmissionCalculator - Quick 4-question estimate
 * 2. Manual Entry - Browse and select specific activities
 *
 * Features:
 * - Canvas-first layout
 * - Celebration upon completion
 * - Progress tracking with GaugeProgress
 * - Smooth transitions between modes
 * - State persistence via Zustand
 *
 * Phase 2 Week 4 implementation
 */

import * as React from 'react';
import { CanvasZone } from '../canvas/CanvasZone';
import { StoryScene } from '../canvas/StoryScene';
import { TransitionWrapper } from '../canvas/TransitionWrapper';
import { GaugeProgress } from '../viz/GaugeProgress';
import { Button } from '../system/Button';
import { EmissionCalculator, type CalculatorResults } from '../domain/EmissionCalculator';
import { useAppStore } from '../../hooks/useAppStore';
import { Sparkles, CheckCircle, ArrowRight, Plus, TrendingUp } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface BaselineSceneProps {
  show: boolean;
  mode?: 'calculator' | 'manual';
  onComplete: () => void;
}

type BaselineState = 'choosing' | 'calculating' | 'entering' | 'celebrating';

// ============================================================================
// Component
// ============================================================================

export function BaselineScene({ show, mode = 'calculator', onComplete }: BaselineSceneProps) {
  const [state, setState] = React.useState<BaselineState>(
    mode === 'calculator' ? 'calculating' : 'choosing'
  );
  const [calculatorResults, setCalculatorResults] = React.useState<CalculatorResults | null>(null);

  const { saveCalculatorResults, getTotalEmissions, activities } = useAppStore();

  const totalEmissions = getTotalEmissions();
  const activityCount = activities.length;

  // Handle calculator completion
  const handleCalculatorComplete = (results: CalculatorResults) => {
    setCalculatorResults(results);

    // Save to store
    saveCalculatorResults([
      {
        category: 'commute',
        label: `Daily commute`,
        annualEmissions: results.breakdown.commute,
      },
      {
        category: 'diet',
        label: `Diet`,
        annualEmissions: results.breakdown.diet,
      },
      {
        category: 'energy',
        label: `Home energy`,
        annualEmissions: results.breakdown.energy,
      },
      {
        category: 'shopping',
        label: `Shopping`,
        annualEmissions: results.breakdown.shopping,
      },
    ]);

    setState('celebrating');
  };

  // Handle manual entry milestone
  const handleManualMilestone = () => {
    if (activityCount >= 5) {
      setState('celebrating');
    }
  };

  React.useEffect(() => {
    if (state === 'entering' && activityCount >= 5) {
      handleManualMilestone();
    }
  }, [activityCount, state]);

  if (!show) return null;

  return (
    <StoryScene scene="baseline" layout="canvas" title="Establish Baseline">
      <CanvasZone zone="hero" zoneId="baseline-hero" padding="lg" interactionMode="explore">
        {/* Calculator flow */}
        <TransitionWrapper type="fade" show={state === 'calculating'}>
          <div className="min-h-[80vh] flex items-center justify-center">
            <EmissionCalculator
              onComplete={handleCalculatorComplete}
              onCancel={() => setState('choosing')}
            />
          </div>
        </TransitionWrapper>

        {/* Manual entry flow */}
        <TransitionWrapper type="fade" show={state === 'entering'}>
          <div className="min-h-[80vh] flex items-center justify-center px-[var(--space-8)]">
            <ManualEntryView
              activityCount={activityCount}
              totalEmissions={totalEmissions}
              onContinue={handleManualMilestone}
            />
          </div>
        </TransitionWrapper>

        {/* Celebration */}
        <TransitionWrapper type="zoom" show={state === 'celebrating'}>
          <div className="min-h-[80vh] flex items-center justify-center px-[var(--space-8)]">
            <CelebrationView
              mode={mode}
              totalEmissions={totalEmissions}
              calculatorResults={calculatorResults}
              onComplete={onComplete}
            />
          </div>
        </TransitionWrapper>
      </CanvasZone>
    </StoryScene>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ManualEntryViewProps {
  activityCount: number;
  totalEmissions: number;
  onContinue: () => void;
}

function ManualEntryView({ activityCount, totalEmissions, onContinue }: ManualEntryViewProps) {
  const targetActivities = 5;
  const progress = Math.min(activityCount / targetActivities, 1);

  return (
    <div className="max-w-3xl mx-auto text-center space-y-[var(--space-8)]">
      {/* Header */}
      <div className="space-y-[var(--space-4)]">
        <h2
          className="font-bold"
          style={{
            fontSize: 'var(--font-size-3xl)',
            color: 'var(--text-primary)',
          }}
        >
          Build Your Baseline
        </h2>
        <p
          style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--text-secondary)',
          }}
        >
          Add {targetActivities} activities to establish your baseline. Browse sectors and select
          activities that match your operations.
        </p>
      </div>

      {/* Progress gauge */}
      <div className="flex justify-center">
        <div className="w-64 h-64">
          <GaugeProgress
            value={activityCount}
            max={targetActivities}
            target={targetActivities}
            colorScheme="progress"
            label="activities added"
            size={256}
            showPercentage={false}
          />
        </div>
      </div>

      {/* Current total */}
      {totalEmissions > 0 && (
        <div
          className="p-[var(--space-6)] rounded-[var(--radius-lg)] inline-block"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div
            className="mb-[var(--space-1)]"
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            Current Total
          </div>
          <div className="flex items-baseline gap-[var(--space-2)]">
            <span
              className="font-bold"
              style={{
                fontSize: 'var(--font-size-4xl)',
                color: 'var(--text-primary)',
              }}
            >
              {(totalEmissions / 1000).toFixed(1)}
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-xl)',
                color: 'var(--text-secondary)',
              }}
            >
              tonnes CO₂/year
            </span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div
        className="p-[var(--space-4)] rounded-[var(--radius-lg)] text-left"
        style={{
          backgroundColor: 'var(--color-insight-bg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <p
          className="font-medium mb-[var(--space-2)]"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-primary)',
          }}
        >
          💡 How to add activities:
        </p>
        <ul
          className="space-y-[var(--space-1)]"
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
          }}
        >
          <li>1. Browse sectors in the sidebar (Transportation, Energy, etc.)</li>
          <li>2. Click activity cards to add them to your profile</li>
          <li>3. Adjust quantities to match your actual usage</li>
        </ul>
      </div>

      {/* CTA */}
      {activityCount >= targetActivities && (
        <TransitionWrapper type="slide-up" show={true} delay={200}>
          <Button
            variant="primary"
            size="lg"
            onClick={onContinue}
            icon={<CheckCircle className="w-5 h-5" />}
          >
            Continue to Results
          </Button>
        </TransitionWrapper>
      )}

      {/* Placeholder for activity browser (would integrate with existing ActivityMatrix) */}
      {activityCount === 0 && (
        <div className="pt-[var(--space-8)]">
          <Button
            variant="secondary"
            size="md"
            icon={<Plus className="w-5 h-5" />}
          >
            Browse Activities
          </Button>
        </div>
      )}
    </div>
  );
}

interface CelebrationViewProps {
  mode: 'calculator' | 'manual';
  totalEmissions: number;
  calculatorResults: CalculatorResults | null;
  onComplete: () => void;
}

function CelebrationView({
  mode,
  totalEmissions,
  calculatorResults,
  onComplete,
}: CelebrationViewProps) {
  const emissions = calculatorResults ? calculatorResults.total : totalEmissions;
  const totalTonnes = emissions / 1000;
  const globalAverage = 4.5; // tonnes CO₂ per person per year
  const percentOfAverage = ((totalTonnes / globalAverage) * 100).toFixed(0);

  return (
    <div className="max-w-4xl mx-auto text-center space-y-[var(--space-8)]">
      {/* Celebration icon */}
      <TransitionWrapper type="zoom" show={true} delay={100}>
        <div
          className="mx-auto w-32 h-32 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: 'var(--carbon-low-bg)',
          }}
        >
          <Sparkles className="w-16 h-16" style={{ color: 'var(--carbon-low)' }} />
        </div>
      </TransitionWrapper>

      {/* Headline */}
      <TransitionWrapper type="slide-up" show={true} delay={200}>
        <div className="space-y-[var(--space-4)]">
          <h2
            className="font-bold"
            style={{
              fontSize: 'var(--font-size-4xl)',
              color: 'var(--text-primary)',
            }}
          >
            Baseline Established!
          </h2>
          <p
            className="max-w-2xl mx-auto"
            style={{
              fontSize: 'var(--font-size-lg)',
              color: 'var(--text-secondary)',
            }}
          >
            {mode === 'calculator'
              ? "You've completed the quick calculator. Here's your carbon footprint estimate:"
              : "Great work! You've established your baseline with real activity data."}
          </p>
        </div>
      </TransitionWrapper>

      {/* Results card */}
      <TransitionWrapper type="slide-up" show={true} delay={300}>
        <div
          className="p-[var(--space-8)] rounded-[var(--radius-xl)]"
          style={{
            background: 'linear-gradient(135deg, var(--color-baseline-bg) 0%, var(--color-goal-bg) 100%)',
            border: '2px solid var(--border-default)',
          }}
        >
          {/* Main number */}
          <div className="mb-[var(--space-6)]">
            <div
              className="mb-[var(--space-2)]"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              {mode === 'calculator' ? 'Estimated Annual Emissions' : 'Your Baseline'}
            </div>
            <div className="flex items-baseline justify-center gap-[var(--space-2)]">
              <span
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-5xl)',
                  color: 'var(--text-primary)',
                }}
              >
                {totalTonnes.toFixed(1)}
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  color: 'var(--text-secondary)',
                }}
              >
                tonnes CO₂/year
              </span>
            </div>
          </div>

          {/* Context */}
          <div className="grid grid-cols-2 gap-[var(--space-4)]">
            <div
              className="p-[var(--space-4)] rounded-[var(--radius-lg)]"
              style={{
                backgroundColor: 'var(--surface-elevated)',
              }}
            >
              <div
                className="mb-[var(--space-1)]"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-tertiary)',
                }}
              >
                Global Average
              </div>
              <div
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  color: 'var(--text-primary)',
                }}
              >
                {globalAverage}t
              </div>
            </div>
            <div
              className="p-[var(--space-4)] rounded-[var(--radius-lg)]"
              style={{
                backgroundColor: 'var(--surface-elevated)',
              }}
            >
              <div
                className="mb-[var(--space-1)]"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-tertiary)',
                }}
              >
                vs Global Average
              </div>
              <div
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  color: totalTonnes > globalAverage ? 'var(--carbon-high)' : 'var(--carbon-low)',
                }}
              >
                {percentOfAverage}%
              </div>
            </div>
          </div>
        </div>
      </TransitionWrapper>

      {/* Comparisons (if calculator mode) */}
      {calculatorResults && (
        <TransitionWrapper type="slide-up" show={true} delay={400}>
          <div
            className="p-[var(--space-6)] rounded-[var(--radius-lg)] text-left"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h3
              className="font-semibold mb-[var(--space-4)]"
              style={{
                fontSize: 'var(--font-size-lg)',
                color: 'var(--text-primary)',
              }}
            >
              To put this in perspective:
            </h3>
            <div className="grid grid-cols-3 gap-[var(--space-4)] text-center">
              <ComparisonStat
                value={calculatorResults.comparisons.flights.toFixed(1)}
                label="round trip flights"
                sublabel="NYC → LA"
              />
              <ComparisonStat
                value={Math.ceil(calculatorResults.comparisons.trees).toString()}
                label="trees needed"
                sublabel="to offset/year"
              />
              <ComparisonStat
                value={Math.floor(calculatorResults.comparisons.meals).toString()}
                label="plant-based meals"
                sublabel="vs meat equivalent"
              />
            </div>
          </div>
        </TransitionWrapper>
      )}

      {/* Next steps */}
      <TransitionWrapper type="fade" show={true} delay={500}>
        <div
          className="p-[var(--space-6)] rounded-[var(--radius-lg)] text-left"
          style={{
            backgroundColor: 'var(--color-insight-bg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <h3
            className="font-semibold mb-[var(--space-3)]"
            style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--text-primary)',
            }}
          >
            What's next:
          </h3>
          <ul
            className="space-y-[var(--space-2)]"
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            <li className="flex items-start gap-[var(--space-2)]">
              <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--carbon-low)' }} />
              <span>Explore your emissions breakdown by activity and sector</span>
            </li>
            <li className="flex items-start gap-[var(--space-2)]">
              <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--carbon-low)' }} />
              <span>Track progress over time and identify reduction opportunities</span>
            </li>
            <li className="flex items-start gap-[var(--space-2)]">
              <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--carbon-low)' }} />
              <span>Model "what-if" scenarios and set carbon reduction goals</span>
            </li>
          </ul>
        </div>
      </TransitionWrapper>

      {/* CTA */}
      <TransitionWrapper type="slide-up" show={true} delay={600}>
        <div className="pt-[var(--space-4)]">
          <Button
            variant="primary"
            size="lg"
            onClick={onComplete}
            icon={<ArrowRight className="w-5 h-5" />}
          >
            Explore Your Data
          </Button>
        </div>
      </TransitionWrapper>
    </div>
  );
}

interface ComparisonStatProps {
  value: string;
  label: string;
  sublabel: string;
}

function ComparisonStat({ value, label, sublabel }: ComparisonStatProps) {
  return (
    <div className="space-y-[var(--space-1)]">
      <div
        className="font-bold"
        style={{
          fontSize: 'var(--font-size-3xl)',
          color: 'var(--text-primary)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-tertiary)',
        }}
      >
        {sublabel}
      </div>
    </div>
  );
}
