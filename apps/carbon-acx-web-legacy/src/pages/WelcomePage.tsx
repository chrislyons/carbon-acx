/**
 * WelcomePage - Onboarding experience
 *
 * Simplified from OnboardingScene - removed XState, CanvasZone complexity.
 * Uses React Router navigation instead of journey state machine.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { TransitionWrapper } from '../components/system/Transition';
import { Button } from '../components/system/Button';
import { DataSummaryCard } from '../components/domain/DataSummaryCard';
import { Calculator, FileText, ArrowRight, Sparkles } from 'lucide-react';

type OnboardingStep = 1 | 2 | 3;

interface PathChoice {
  id: 'calculator' | 'manual';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  duration: string;
  benefits: string[];
  recommended?: boolean;
}

const PATH_CHOICES: PathChoice[] = [
  {
    id: 'calculator',
    icon: Calculator,
    title: 'Quick Calculator',
    description: 'Answer 4 simple questions for an instant baseline estimate',
    duration: '~2 minutes',
    benefits: [
      'Instant results with common activities',
      'No prior knowledge needed',
      'Can refine later with detailed analysis',
    ],
    recommended: false,
  },
  {
    id: 'manual',
    icon: FileText,
    title: 'Manual Entry',
    description: 'Build your profile by selecting specific emission sources',
    duration: '~10 minutes',
    benefits: [
      'Audit-ready reports with full provenance',
      'Activity-level tracking and scenarios',
      'Most accurate emissions profile',
    ],
    recommended: true,
  },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState<OnboardingStep>(1);
  const [selectedPath, setSelectedPath] = React.useState<'calculator' | 'manual' | null>(null);

  const handlePathSelect = (pathId: 'calculator' | 'manual') => {
    setSelectedPath(pathId);
    setStep(3);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as OnboardingStep);
      if (step === 3) {
        setSelectedPath(null);
      }
    }
  };

  const handleComplete = () => {
    // Navigate to calculator page based on selected path
    navigate('/calculator', { state: { mode: selectedPath } });
  };

  const handleSkip = () => {
    navigate('/explore');
  };

  return (
    <div className="canvas-hero">
      {/* Progress indicator */}
      <div className="absolute top-8 left-0 right-0 flex justify-center gap-[var(--space-2)] z-10">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 w-16 rounded-full transition-colors duration-300"
            style={{
              backgroundColor:
                i <= step ? 'var(--interactive-primary)' : 'var(--border-subtle)',
            }}
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={3}
          />
        ))}
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-8 right-8 text-[var(--font-size-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors z-10"
        aria-label="Skip onboarding"
      >
        Skip for now →
      </button>

      {/* Step content */}
      <div className="flex items-center justify-center min-h-[80vh] px-[var(--space-8)]">
        <TransitionWrapper type="story" show={step === 1} delay={0}>
          <WelcomeStep onNext={() => setStep(2)} />
        </TransitionWrapper>

        <TransitionWrapper type="story" show={step === 2} delay={0}>
          <PathSelectionStep paths={PATH_CHOICES} onSelect={handlePathSelect} onBack={handleBack} />
        </TransitionWrapper>

        <TransitionWrapper type="story" show={step === 3} delay={0}>
          <GettingStartedStep
            selectedPath={selectedPath}
            paths={PATH_CHOICES}
            onBack={handleBack}
            onComplete={handleComplete}
          />
        </TransitionWrapper>
      </div>
    </div>
  );
}

// ============================================================================
// Step Components
// ============================================================================

interface WelcomeStepProps {
  onNext: () => void;
}

function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="max-w-3xl mx-auto text-center space-y-[var(--space-8)]">
      <div
        className="mx-auto w-24 h-24 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-baseline-bg)' }}
      >
        <Sparkles className="w-12 h-12" style={{ color: 'var(--color-baseline)' }} />
      </div>

      <div className="space-y-[var(--space-4)]">
        <h1
          className="font-bold"
          style={{ fontSize: 'var(--font-size-4xl)', color: 'var(--text-primary)' }}
        >
          Welcome to Carbon ACX
        </h1>
        <p
          className="max-w-2xl mx-auto"
          style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-secondary)' }}
        >
          A literacy tool for carbon accounting. Compare emissions across activities, understand
          data at every scale, and build audit-ready reports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-6)] max-w-4xl mx-auto">
        <ValueProp
          emoji="📊"
          title="Understand Carbon Data"
          description="From individual activities to global averages"
        />
        <ValueProp
          emoji="🔍"
          title="Full Transparency"
          description="Peer-reviewed emission factors with citations"
        />
        <ValueProp
          emoji="📈"
          title="Track Progress"
          description="Set goals, model scenarios, export reports"
        />
      </div>

      {/* Data showcase */}
      <div className="max-w-4xl mx-auto">
        <DataSummaryCard />
      </div>

      <div className="pt-[var(--space-4)]">
        <Button variant="primary" size="lg" onClick={onNext} icon={<ArrowRight className="w-5 h-5" />}>
          Get Started
        </Button>
      </div>
    </div>
  );
}

interface ValuePropProps {
  emoji: string;
  title: string;
  description: string;
}

function ValueProp({ emoji, title, description }: ValuePropProps) {
  return (
    <div className="text-center space-y-[var(--space-2)]">
      <div className="text-4xl mb-[var(--space-3)]">{emoji}</div>
      <h3
        className="font-semibold"
        style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
        {description}
      </p>
    </div>
  );
}

interface PathSelectionStepProps {
  paths: PathChoice[];
  onSelect: (pathId: 'calculator' | 'manual') => void;
  onBack: () => void;
}

function PathSelectionStep({ paths, onSelect, onBack }: PathSelectionStepProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-[var(--space-8)]">
      <div className="text-center space-y-[var(--space-4)]">
        <h2
          className="font-bold"
          style={{ fontSize: 'var(--font-size-3xl)', color: 'var(--text-primary)' }}
        >
          Choose Your Starting Point
        </h2>
        <p
          className="max-w-2xl mx-auto"
          style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)' }}
        >
          Don't worry — you can always switch methods later
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-6)]">
        {paths.map((path) => (
          <PathCard key={path.id} path={path} onSelect={() => onSelect(path.id)} />
        ))}
      </div>

      <div className="flex justify-center pt-[var(--space-4)]">
        <Button variant="ghost" size="md" onClick={onBack}>
          ← Back
        </Button>
      </div>
    </div>
  );
}

interface PathCardProps {
  path: PathChoice;
  onSelect: () => void;
}

function PathCard({ path, onSelect }: PathCardProps) {
  const Icon = path.icon;

  return (
    <button
      onClick={onSelect}
      className="text-left p-[var(--space-6)] rounded-[var(--radius-xl)] border-2 transition-all hover:scale-[1.02]"
      style={{
        borderColor: path.recommended ? 'var(--interactive-primary)' : 'var(--border-default)',
        backgroundColor: path.recommended
          ? 'var(--color-baseline-bg)'
          : 'var(--surface-elevated)',
      }}
    >
      <div className="flex items-start justify-between mb-[var(--space-4)]">
        <div
          className="p-[var(--space-3)] rounded-[var(--radius-lg)]"
          style={{ backgroundColor: 'var(--surface-bg)' }}
        >
          <Icon className="w-6 h-6 text-[var(--interactive-primary)]" />
        </div>
        {path.recommended && (
          <span
            className="px-[var(--space-2)] py-[var(--space-1)] rounded-full text-white font-medium"
            style={{
              fontSize: 'var(--font-size-xs)',
              backgroundColor: 'var(--interactive-primary)',
            }}
          >
            Recommended
          </span>
        )}
      </div>

      <div className="space-y-[var(--space-2)] mb-[var(--space-4)]">
        <h3
          className="font-bold"
          style={{ fontSize: 'var(--font-size-xl)', color: 'var(--text-primary)' }}
        >
          {path.title}
        </h3>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          {path.description}
        </p>
        <p
          className="font-medium"
          style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}
        >
          {path.duration}
        </p>
      </div>

      <ul className="space-y-[var(--space-2)]">
        {path.benefits.map((benefit, index) => (
          <li
            key={index}
            className="flex items-start gap-[var(--space-2)]"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}
          >
            <span style={{ color: 'var(--carbon-low)' }}>✓</span>
            {benefit}
          </li>
        ))}
      </ul>

      <div className="mt-[var(--space-6)] flex items-center gap-[var(--space-2)] font-medium" style={{ color: 'var(--interactive-primary)' }}>
        Choose this path
        <ArrowRight className="w-4 h-4" />
      </div>
    </button>
  );
}

interface GettingStartedStepProps {
  selectedPath: 'calculator' | 'manual' | null;
  paths: PathChoice[];
  onBack: () => void;
  onComplete: () => void;
}

function GettingStartedStep({ selectedPath, paths, onBack, onComplete }: GettingStartedStepProps) {
  const path = paths.find((p) => p.id === selectedPath);
  const Icon = path?.icon || Calculator;

  if (!path) {
    return (
      <div className="text-center">
        <p style={{ color: 'var(--text-secondary)' }}>No path selected</p>
        <Button variant="ghost" size="md" onClick={onBack}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto text-center space-y-[var(--space-8)]">
      <div
        className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--carbon-low-bg)' }}
      >
        <Icon className="w-10 h-10" style={{ color: 'var(--carbon-low)' }} />
      </div>

      <div className="space-y-[var(--space-4)]">
        <h2
          className="font-bold"
          style={{ fontSize: 'var(--font-size-3xl)', color: 'var(--text-primary)' }}
        >
          You're Ready!
        </h2>
        <p
          className="max-w-2xl mx-auto"
          style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)' }}
        >
          {path.id === 'calculator'
            ? 'Answer 4 simple questions to get your baseline emissions estimate.'
            : 'Browse activities by sector and build your custom carbon profile.'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-[var(--space-4)] pt-[var(--space-4)]">
        <Button variant="ghost" size="md" onClick={onBack}>
          ← Change path
        </Button>
        <Button variant="primary" size="lg" onClick={onComplete} icon={<ArrowRight className="w-5 h-5" />}>
          {path.id === 'calculator' ? 'Start Calculator' : 'Browse Activities'}
        </Button>
      </div>

      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
        💡 Tip: Your progress is saved automatically as you go
      </p>
    </div>
  );
}
