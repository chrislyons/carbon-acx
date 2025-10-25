/**
 * TransitionWrapper - Tier 2 Canvas Component
 *
 * Reusable animation wrapper for smooth transitions between UI states.
 * Uses Framer Motion with design token timing and easing.
 */

import * as React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { cn } from '../../lib/cn';

export type TransitionType =
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale'
  | 'zoom' // Alias for scale with more dramatic effect
  | 'story'; // Custom story transition

export interface TransitionWrapperProps {
  /**
   * Type of transition animation
   */
  type?: TransitionType;
  /**
   * Custom transition duration (ms)
   */
  duration?: number;
  /**
   * Custom easing function
   */
  ease?: number[] | string;
  /**
   * Delay before animation starts (ms)
   */
  delay?: number;
  /**
   * Whether content is currently visible
   */
  show?: boolean;
  /**
   * Unique key for AnimatePresence
   */
  animKey?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Child content to animate
   */
  children: React.ReactNode;
}

// Predefined transition variants
const transitionVariants: Record<TransitionType, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  'slide-up': {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  'slide-down': {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  'slide-left': {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  'slide-right': {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
  },
  zoom: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.2 },
  },
  story: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 1.05, y: -20 },
  },
};

export const TransitionWrapper = React.forwardRef<
  HTMLDivElement,
  TransitionWrapperProps
>(
  (
    {
      type = 'fade',
      duration,
      ease,
      delay = 0,
      show = true,
      animKey,
      className,
      children,
    },
    ref
  ) => {
    // Default to design token values
    const transitionConfig = {
      duration: duration !== undefined ? duration / 1000 : 0.6, // Convert ms to seconds
      ease: ease || [0.43, 0.13, 0.23, 0.96], // Story easing by default
      delay: delay / 1000,
    };

    const variants = transitionVariants[type];

    return (
      <AnimatePresence mode="wait">
        {show && (
          <motion.div
            ref={ref}
            key={animKey}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            transition={transitionConfig}
            className={cn('w-full', className)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

TransitionWrapper.displayName = 'TransitionWrapper';

/**
 * Staggered children animation wrapper
 * Useful for lists or grids that should animate in sequence
 */
export interface StaggerWrapperProps {
  /**
   * Delay between each child animation (ms)
   */
  staggerDelay?: number;
  /**
   * Type of transition for children
   */
  childTransition?: TransitionType;
  /**
   * Whether to show children
   */
  show?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Child components
   */
  children: React.ReactNode;
}

export const StaggerWrapper: React.FC<StaggerWrapperProps> = ({
  staggerDelay = 50,
  childTransition = 'slide-up',
  show = true,
  className,
  children,
}) => {
  const containerVariants: Variants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: staggerDelay / 1000,
      },
    },
  };

  const childVariants = transitionVariants[childTransition];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={containerVariants}
          className={cn('w-full', className)}
        >
          {React.Children.map(children, (child, index) => (
            <motion.div key={index} variants={childVariants}>
              {child}
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

StaggerWrapper.displayName = 'StaggerWrapper';
