import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
}

interface WizardProps {
  steps: WizardStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  initialStep?: number;
  finishLabel?: string;
}

export function Wizard({
  steps,
  onComplete,
  onSkip,
  initialStep = 0,
  finishLabel = 'Finish'
}: WizardProps): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(initialStep, 0), Math.max(steps.length - 1, 0))
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  const totalSteps = steps.length;
  const currentStep = steps[currentIndex];
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;

  useEffect(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, [currentIndex]);

  const goToStep = useCallback(
    (index: number) => {
      setCurrentIndex((previous) => {
        const nextIndex = Math.min(Math.max(index, 0), totalSteps - 1);
        return previous === nextIndex ? previous : nextIndex;
      });
    },
    [totalSteps]
  );

  const handleBack = useCallback(() => {
    if (isFirstStep) {
      return;
    }
    goToStep(currentIndex - 1);
  }, [currentIndex, goToStep, isFirstStep]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete?.();
      return;
    }
    goToStep(currentIndex + 1);
  }, [currentIndex, goToStep, isLastStep, onComplete]);

  const progress = useMemo(() => {
    if (totalSteps === 0) {
      return 0;
    }
    return ((currentIndex + 1) / totalSteps) * 100;
  }, [currentIndex, totalSteps]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented || event.target !== containerRef.current) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleBack();
      }
    },
    [handleBack, handleNext]
  );

  if (totalSteps === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300">
        No steps configured.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-slate-100 shadow-xl focus:outline-none"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      role="region"
      aria-labelledby={`wizard-step-${currentStep.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-400">
            Step {currentIndex + 1} of {totalSteps}
          </p>
          <h2 id={`wizard-step-${currentStep.id}`} className="mt-2 text-lg font-semibold">
            {currentStep.title}
          </h2>
          {currentStep.description ? (
            <p className="mt-2 text-sm text-slate-400">{currentStep.description}</p>
          ) : null}
        </div>
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Skip
          </button>
        ) : null}
      </div>
      <div className="mt-5 h-1 w-full rounded-full bg-slate-800">
        <span
          className="block h-1 rounded-full bg-sky-500 transition-all"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-valuenow={currentIndex + 1}
          aria-valuetext={`Step ${currentIndex + 1} of ${totalSteps}`}
        />
      </div>
      <div className="mt-8 flex-1 text-sm text-slate-300">{currentStep.content}</div>
      <div className="mt-8 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={isFirstStep}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-600 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-100 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-400"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-sky-500 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-900 shadow transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          {isLastStep ? finishLabel : 'Next'}
        </button>
      </div>
    </div>
  );
}
