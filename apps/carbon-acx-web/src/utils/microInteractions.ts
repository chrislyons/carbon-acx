/**
 * Micro-Interactions Utility
 *
 * Reusable Framer Motion animation variants for common UI micro-interactions.
 * All animations respect user's motion preferences.
 *
 * Phase 3 Week 8 - Polish & Performance
 */

import type { Variants, Transition } from 'framer-motion';

/**
 * Default transition respecting design tokens
 */
export const defaultTransition: Transition = {
  duration: 0.18, // --motion-duration
  ease: [0.16, 1, 0.3, 1], // --motion-ease
};

/**
 * Fast transition for immediate feedback
 */
export const fastTransition: Transition = {
  duration: 0.12, // --motion-duration-fast
  ease: [0.16, 1, 0.3, 1],
};

/**
 * Slow transition for dramatic effects
 */
export const slowTransition: Transition = {
  duration: 0.28, // --motion-duration-slow
  ease: [0.16, 1, 0.3, 1],
};

/**
 * Button tap animation
 * Subtle scale and opacity change on press
 */
export const tapAnimation: Variants = {
  tap: {
    scale: 0.97,
    opacity: 0.85,
  },
};

/**
 * Button hover animation
 * Slight scale up with shadow increase
 */
export const hoverScale: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: fastTransition,
  },
};

/**
 * Card hover animation
 * Lift effect with shadow
 */
export const cardHover: Variants = {
  rest: {
    y: 0,
    scale: 1,
  },
  hover: {
    y: -4,
    scale: 1.01,
    transition: defaultTransition,
  },
};

/**
 * Focus ring animation
 * Smooth ring appearance for keyboard navigation
 */
export const focusRing: Variants = {
  unfocused: {
    scale: 0.95,
    opacity: 0,
  },
  focused: {
    scale: 1,
    opacity: 1,
    transition: fastTransition,
  },
};

/**
 * Loading pulse animation
 * Continuous gentle pulse
 */
export const loadingPulse: Variants = {
  pulse: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Loading spinner animation
 * Rotating spinner
 */
export const spinnerRotate: Variants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Shake animation for errors
 * Subtle horizontal shake
 */
export const shake: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
      ease: 'easeInOut',
    },
  },
};

/**
 * Success bounce animation
 * Happy little bounce for positive feedback
 */
export const successBounce: Variants = {
  bounce: {
    scale: [1, 1.1, 0.95, 1.05, 1],
    transition: {
      duration: 0.6,
      ease: 'easeInOut',
    },
  },
};

/**
 * Badge appear animation
 * Pop in from corner
 */
export const badgePopIn: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 15,
    },
  },
};

/**
 * Tooltip appear animation
 * Fade in with slight movement
 */
export const tooltipAppear: Variants = {
  hidden: {
    opacity: 0,
    y: -4,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: fastTransition,
  },
};

/**
 * Dropdown slide down animation
 * Smooth slide from top
 */
export const dropdownSlide: Variants = {
  closed: {
    opacity: 0,
    y: -8,
    scale: 0.98,
  },
  open: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: defaultTransition,
  },
};

/**
 * Modal backdrop fade
 * Smooth backdrop appearance
 */
export const backdropFade: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: defaultTransition,
  },
};

/**
 * Modal scale animation
 * Dramatic entrance from center
 */
export const modalScale: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

/**
 * List item stagger animation
 * For use with Framer Motion's stagger children
 */
export const listItemStagger: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
};

/**
 * Number counter animation
 * Smooth number transitions
 */
export const numberCounter = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

/**
 * Progress bar fill animation
 * Smooth fill from left to right
 */
export const progressFill: Variants = {
  empty: {
    scaleX: 0,
    transformOrigin: 'left',
  },
  filled: (progress: number) => ({
    scaleX: progress,
    transformOrigin: 'left',
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

/**
 * Skeleton shimmer animation
 * Continuous shimmer effect for loading states
 */
export const skeletonShimmer = {
  initial: {
    backgroundPosition: '-200% 0',
  },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Celebration confetti burst
 * For milestone achievements
 */
export const confettiBurst: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: [0, 1.2, 1],
    opacity: [0, 1, 1],
    rotate: [0, 10, -10, 0],
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

/**
 * Helper function to create reduced motion variants
 * Simplifies complex animations for users who prefer reduced motion
 */
export function createReducedMotionVariant(
  variants: Variants
): Variants {
  const reducedVariants: Variants = {};

  for (const key in variants) {
    const originalVariant = variants[key];
    if (typeof originalVariant === 'object') {
      reducedVariants[key] = {
        opacity: originalVariant.opacity,
        transition: {
          duration: 0.001,
          ease: 'linear',
        },
      };
    }
  }

  return reducedVariants;
}
