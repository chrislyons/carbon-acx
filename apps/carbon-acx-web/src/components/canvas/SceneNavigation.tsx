/**
 * SceneNavigation - Consistent navigation controls for story scenes
 *
 * Provides Back, Next, and Skip buttons with proper journey state transitions.
 * Integrates with XState journey machine for state management.
 *
 * Features:
 * - Contextual button visibility (back only when not first scene, etc.)
 * - Loading states for async transitions
 * - Phase 1 design tokens
 * - Keyboard navigation support
 * - ARIA labels for accessibility
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';
import { Button } from '../system/Button';

// ============================================================================
// Types
// ============================================================================

export interface SceneNavigationProps {
  /** Show back button */
  showBack?: boolean;
  /** Back button label */
  backLabel?: string;
  /** Back button handler */
  onBack?: () => void;

  /** Show next button */
  showNext?: boolean;
  /** Next button label */
  nextLabel?: string;
  /** Next button handler */
  onNext?: () => void;
  /** Disable next button */
  nextDisabled?: boolean;

  /** Show skip button */
  showSkip?: boolean;
  /** Skip button label */
  skipLabel?: string;
  /** Skip button handler */
  onSkip?: () => void;

  /** Loading state (disables all buttons) */
  loading?: boolean;

  /** Position: fixed at bottom or inline */
  position?: 'fixed' | 'inline';

  /** Align buttons */
  align?: 'left' | 'center' | 'right' | 'space-between';
}

// ============================================================================
// Component
// ============================================================================

export function SceneNavigation({
  showBack = false,
  backLabel = 'Back',
  onBack,
  showNext = false,
  nextLabel = 'Next',
  onNext,
  nextDisabled = false,
  showSkip = false,
  skipLabel = 'Skip',
  onSkip,
  loading = false,
  position = 'inline',
  align = 'space-between',
}: SceneNavigationProps) {
  // Don't render if no buttons visible
  if (!showBack && !showNext && !showSkip) {
    return null;
  }

  const containerClass =
    position === 'fixed'
      ? 'fixed bottom-0 left-0 right-0 z-50'
      : 'relative';

  const alignmentClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    'space-between': 'justify-between',
  }[align];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className={containerClass}
      style={{
        backgroundColor: position === 'fixed' ? 'var(--surface-bg)' : 'transparent',
        borderTop: position === 'fixed' ? '1px solid var(--border-subtle)' : 'none',
      }}
    >
      <div
        className={`flex items-center gap-[var(--space-4)] p-[var(--space-4)] ${alignmentClass}`}
      >
        {/* Back button */}
        {showBack && (
          <Button
            variant="secondary"
            size="lg"
            onClick={onBack}
            disabled={loading}
            icon={<ArrowLeft className="w-5 h-5" />}
            aria-label={backLabel}
          >
            {backLabel}
          </Button>
        )}

        {/* Skip button (usually in middle or left side) */}
        {showSkip && (
          <Button
            variant="ghost"
            size="md"
            onClick={onSkip}
            disabled={loading}
            icon={<SkipForward className="w-4 h-4" />}
            aria-label={skipLabel}
            style={{ marginLeft: showBack ? 'auto' : '0' }}
          >
            {skipLabel}
          </Button>
        )}

        {/* Next button */}
        {showNext && (
          <Button
            variant="primary"
            size="lg"
            onClick={onNext}
            disabled={loading || nextDisabled}
            icon={<ArrowRight className="w-5 h-5" />}
            iconPosition="right"
            aria-label={nextLabel}
            loading={loading}
            style={{ marginLeft: !showBack && !showSkip ? 'auto' : '0' }}
          >
            {nextLabel}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Preset Configurations
// ============================================================================

/**
 * Common navigation configurations for different scenes
 */
export const SceneNavigationPresets = {
  /** First scene - only next/skip */
  first: (onNext: () => void, onSkip?: () => void) => ({
    showNext: true,
    nextLabel: 'Get Started',
    onNext,
    showSkip: !!onSkip,
    skipLabel: 'Skip Onboarding',
    onSkip,
    align: 'right' as const,
  }),

  /** Middle scene - back and next */
  middle: (onBack: () => void, onNext: () => void, nextDisabled = false) => ({
    showBack: true,
    onBack,
    showNext: true,
    onNext,
    nextDisabled,
    align: 'space-between' as const,
  }),

  /** Last scene - only back and complete */
  last: (onBack: () => void, onComplete: () => void) => ({
    showBack: true,
    onBack,
    showNext: true,
    nextLabel: 'Complete',
    onNext: onComplete,
    align: 'space-between' as const,
  }),

  /** Optional scene - back, skip, next */
  optional: (onBack: () => void, onNext: () => void, onSkip: () => void) => ({
    showBack: true,
    onBack,
    showNext: true,
    onNext,
    showSkip: true,
    onSkip,
    align: 'space-between' as const,
  }),
};
