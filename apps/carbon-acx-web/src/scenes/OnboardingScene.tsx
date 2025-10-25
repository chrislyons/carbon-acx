/**
 * OnboardingScene - Domain Component
 *
 * Welcome flow introducing users to Carbon ACX's literacy-first approach.
 * Maps to 'onboarding' state in XState journey machine.
 *
 * Features:
 * - Multi-step introduction with story transitions
 * - Clear value proposition and navigation
 * - Skip option for returning users
 * - Accessible keyboard navigation
 */

import * as React from 'react';
import { StoryScene } from '../components/canvas/StoryScene';
import { TransitionWrapper } from '../components/canvas/TransitionWrapper';
import { Button } from '../components/system/Button';
import { useJourneyMachine } from '../hooks/useJourneyMachine';
import { ArrowRight, BarChart3, Lightbulb, Target } from 'lucide-react';

export interface OnboardingSceneProps {
  /**
   * Show scene
   */
  show?: boolean;
  /**
   * Callback when onboarding is completed
   */
  onComplete?: () => void;
  /**
   * Callback when onboarding is skipped
   */
  onSkip?: () => void;
}

export const OnboardingScene: React.FC<OnboardingSceneProps> = ({
  show = true,
  onComplete,
  onSkip,
}) => {
  const { completeOnboarding, skipOnboarding } = useJourneyMachine();
  const [currentStep, setCurrentStep] = React.useState(0);

  const steps = [
    {
      icon: <BarChart3 className="w-16 h-16" />,
      title: 'Welcome to Carbon ACX',
      description:
        'Transform abstract carbon data into actionable insights with our immersive analytics platform.',
      cta: 'Get Started',
    },
    {
      icon: <Lightbulb className="w-16 h-16" />,
      title: 'Build Carbon Literacy',
      description:
        'Not a guilt machine—a literacy tool. Understand your emissions through relatable comparisons and beautiful visualizations.',
      cta: 'Continue',
    },
    {
      icon: <Target className="w-16 h-16" />,
      title: 'Set Meaningful Goals',
      description:
        'Create scenarios, track progress, and share your journey. Make data tangible and decisions confident.',
      cta: 'Start Exploring',
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
      onComplete?.();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    skipOnboarding();
    onSkip?.();
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  // Reset to first step when scene shows
  React.useEffect(() => {
    if (show) {
      setCurrentStep(0);
    }
  }, [show]);

  return (
    <StoryScene
      scene="onboarding"
      title="Welcome"
      description="Get started with Carbon ACX"
      layout="fullscreen"
      showProgress
      currentStep={currentStep}
      totalSteps={steps.length}
    >
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-3xl w-full">
          {/* Step Content */}
          <TransitionWrapper
            type="story"
            animKey={`step-${currentStep}`}
            show={show}
            className="text-center space-y-8"
          >
            {/* Icon */}
            <div className="flex justify-center">
              <div
                className="p-6 rounded-full"
                style={{
                  backgroundColor: 'var(--accent-100)',
                  color: 'var(--interactive-primary)',
                }}
              >
                {currentStepData.icon}
              </div>
            </div>

            {/* Title */}
            <h1 className="text-[var(--font-size-5xl)] font-bold text-[var(--text-primary)]">
              {currentStepData.title}
            </h1>

            {/* Description */}
            <p className="text-[var(--font-size-xl)] text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
              {currentStepData.description}
            </p>

            {/* Step Indicators */}
            <div className="flex justify-center gap-2 py-4">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className="transition-all duration-300"
                  style={{
                    width: currentStep === index ? '32px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor:
                      currentStep === index
                        ? 'var(--interactive-primary)'
                        : 'var(--border-default)',
                  }}
                  aria-label={`Go to step ${index + 1}`}
                  aria-current={currentStep === index ? 'step' : undefined}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              {currentStep > 0 && (
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={handlePrevious}
                  className="min-w-[160px]"
                >
                  Previous
                </Button>
              )}

              <Button
                size="lg"
                variant="primary"
                onClick={handleNext}
                rightIcon={<ArrowRight className="h-5 w-5" />}
                className="min-w-[200px]"
              >
                {currentStepData.cta}
              </Button>

              {currentStep === 0 && (
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={handleSkip}
                  className="min-w-[160px]"
                >
                  Skip Intro
                </Button>
              )}
            </div>
          </TransitionWrapper>

          {/* Keyboard Hints */}
          <TransitionWrapper type="fade" delay={1000} show={show}>
            <div className="mt-12 text-center">
              <p className="text-[var(--font-size-sm)] text-[var(--text-tertiary)]">
                Use{' '}
                <kbd className="px-2 py-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded text-[var(--text-secondary)]">
                  ←
                </kbd>{' '}
                <kbd className="px-2 py-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded text-[var(--text-secondary)]">
                  →
                </kbd>{' '}
                arrow keys to navigate
              </p>
            </div>
          </TransitionWrapper>
        </div>
      </div>
    </StoryScene>
  );
};

OnboardingScene.displayName = 'OnboardingScene';

/**
 * Keyboard navigation hook for onboarding
 */
export function useOnboardingKeyboard(
  onNext: () => void,
  onPrevious: () => void,
  onSkip: () => void,
  enabled = true
) {
  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'Enter':
          event.preventDefault();
          onNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onPrevious();
          break;
        case 'Escape':
          event.preventDefault();
          onSkip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNext, onPrevious, onSkip, enabled]);
}
