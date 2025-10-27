/**
 * CalculatorPage - Baseline establishment via calculator or manual entry
 *
 * Simplified from BaselineScene - removed CanvasZone, StoryScene, TransitionWrapper.
 * Clean page layout for establishing baseline emissions.
 */

import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/system/Button';
import { EmissionCalculator, type CalculatorResults } from '../components/domain/EmissionCalculator';
import { ActivityBrowser } from '../components/domain/ActivityBrowser';
import { useAppStore } from '../hooks/useAppStore';
import { Sparkles, CheckCircle, ArrowRight, TrendingUp, Globe } from 'lucide-react';

// Lazy load DataUniverse to avoid SSR issues with Three.js
const DataUniverse = React.lazy(() =>
  import('../components/viz/DataUniverse').then((module) => ({
    default: module.DataUniverse,
  }))
);

type BaselineState = 'choosing' | 'calculating' | 'entering' | 'celebrating';

export default function CalculatorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = (location.state as any)?.mode || 'calculator';

  const [state, setState] = React.useState<BaselineState>(
    mode === 'calculator' ? 'calculating' : 'entering'
  );
  const [calculatorResults, setCalculatorResults] = React.useState<CalculatorResults | null>(null);

  const saveCalculatorResults = useAppStore((state) => state.saveCalculatorResults);
  const getTotalEmissions = useAppStore((state) => state.getTotalEmissions);
  const activities = useAppStore((state) => state.profile.activities);

  const totalEmissions = getTotalEmissions();
  const activityCount = activities.length;

  // Handle calculator completion
  const handleCalculatorComplete = (results: CalculatorResults) => {
    setCalculatorResults(results);

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

  const [show3D, setShow3D] = React.useState(false);

  const handleComplete = () => {
    navigate('/explore');
  };

  const handleReveal3D = () => {
    setShow3D(true);
  };

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] p-[var(--space-8)]">
      <div className="max-w-7xl mx-auto">
        {/* Calculator flow */}
        {state === 'calculating' && (
          <EmissionCalculator
            onComplete={handleCalculatorComplete}
            onCancel={() => navigate('/welcome')}
          />
        )}

        {/* Manual entry flow */}
        {state === 'entering' && (
          <div>
            <h1
              className="font-bold mb-[var(--space-6)]"
              style={{
                fontSize: 'var(--font-size-3xl)',
                color: 'var(--text-primary)',
              }}
            >
              Build Your Baseline
            </h1>
            <ActivityBrowser targetActivities={5} onTargetReached={handleManualMilestone} />
          </div>
        )}

        {/* Celebration */}
        {state === 'celebrating' && (
          <CelebrationView
            mode={mode}
            totalEmissions={totalEmissions}
            calculatorResults={calculatorResults}
            activityCount={activityCount}
            show3D={show3D}
            onReveal3D={handleReveal3D}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Celebration View
// ============================================================================

interface CelebrationViewProps {
  mode: 'calculator' | 'manual';
  totalEmissions: number;
  calculatorResults: CalculatorResults | null;
  activityCount: number;
  show3D: boolean;
  onReveal3D: () => void;
  onComplete: () => void;
}

function CelebrationView({
  mode,
  totalEmissions,
  calculatorResults,
  activityCount,
  show3D,
  onReveal3D,
  onComplete,
}: CelebrationViewProps) {
  const emissions = calculatorResults ? calculatorResults.total : totalEmissions;
  const totalTonnes = emissions / 1000;
  const globalAverage = 4.5;
  const percentOfAverage = ((totalTonnes / globalAverage) * 100).toFixed(0);

  const activities = useAppStore((state) => state.activities);

  return (
    <div className="max-w-7xl mx-auto space-y-[var(--space-8)]">
      {!show3D ? (
        // 2D Results Display
        <div className="max-w-4xl mx-auto text-center space-y-[var(--space-8)]">
      {/* Celebration icon */}
      <div
        className="mx-auto w-32 h-32 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: 'var(--carbon-low-bg)',
        }}
      >
        <Sparkles className="w-16 h-16" style={{ color: 'var(--carbon-low)' }} />
      </div>

      {/* Headline */}
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

      {/* Results card */}
      <div
        className="p-[var(--space-8)] rounded-[var(--radius-xl)]"
        style={{
          background:
            'linear-gradient(135deg, var(--color-baseline-bg) 0%, var(--color-goal-bg) 100%)',
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-4)]">
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

      {/* Comparisons */}
      {calculatorResults && (
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--space-4)] text-center">
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
      )}

      {/* Next steps */}
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
            <TrendingUp
              className="w-4 h-4 flex-shrink-0 mt-0.5"
              style={{ color: 'var(--carbon-low)' }}
            />
            <span>Explore your emissions breakdown by activity and sector</span>
          </li>
          <li className="flex items-start gap-[var(--space-2)]">
            <TrendingUp
              className="w-4 h-4 flex-shrink-0 mt-0.5"
              style={{ color: 'var(--carbon-low)' }}
            />
            <span>Track progress over time and identify reduction opportunities</span>
          </li>
          <li className="flex items-start gap-[var(--space-2)]">
            <TrendingUp
              className="w-4 h-4 flex-shrink-0 mt-0.5"
              style={{ color: 'var(--carbon-low)' }}
            />
            <span>Model "what-if" scenarios and set carbon reduction goals</span>
          </li>
        </ul>
      </div>

      {/* CTA */}
      <div className="pt-[var(--space-4)] flex flex-col items-center gap-[var(--space-3)]">
        <Button
          variant="primary"
          size="lg"
          onClick={onReveal3D}
          icon={<Globe className="w-5 h-5" />}
        >
          See in 3D Universe
        </Button>
        <button
          onClick={onComplete}
          className="text-[var(--font-size-sm)] underline hover:no-underline"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Skip to exploration →
        </button>
      </div>
    </div>
      ) : (
        // 3D Universe Reveal
        <div className="space-y-[var(--space-6)]">
          <div className="text-center">
            <h2
              className="font-bold mb-[var(--space-2)]"
              style={{
                fontSize: 'var(--font-size-3xl)',
                color: 'var(--text-primary)',
              }}
            >
              Your Carbon Universe
            </h2>
            <p
              style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--text-secondary)',
              }}
            >
              Each sphere represents an activity. Larger = higher emissions. Explore your data in 3D!
            </p>
          </div>

          <div
            className="rounded-[var(--radius-lg)] overflow-hidden"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              height: '600px',
            }}
          >
            <React.Suspense
              fallback={
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: '#0a0e27', color: '#fff' }}
                >
                  Loading 3D Universe...
                </div>
              }
            >
              <DataUniverse
                totalEmissions={totalEmissions}
                activities={activities.map((a) => ({
                  id: a.id,
                  name: a.name,
                  annualEmissions: a.annualEmissions,
                  category: a.category ?? undefined,
                }))}
                onActivityClick={(activity) => {
                  console.log('Selected activity:', activity);
                }}
                enableIntroAnimation={true}
                enableClickToFly={true}
              />
            </React.Suspense>
          </div>

          <div className="flex justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={onComplete}
              icon={<ArrowRight className="w-5 h-5" />}
            >
              Continue to Full Exploration
            </Button>
          </div>
        </div>
      )}
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
