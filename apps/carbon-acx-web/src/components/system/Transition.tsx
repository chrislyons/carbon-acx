/**
 * Transition - Simple transition wrapper for UI elements
 * Simplified replacement for the deleted canvas/TransitionWrapper
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TransitionWrapperProps {
  children: React.ReactNode;
  show?: boolean;
  type?: 'fade' | 'slide-up' | 'zoom' | 'story';
  delay?: number;
}

export function TransitionWrapper({
  children,
  show = true,
  type = 'fade',
  delay = 0,
}: TransitionWrapperProps) {
  const variants = {
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
    zoom: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.8 },
    },
    story: {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
    },
  };

  const variant = variants[type];

  if (!show) return null;

  return (
    <motion.div
      initial={variant.initial}
      animate={variant.animate}
      exit={variant.exit}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerWrapperProps {
  children: React.ReactNode;
  staggerDelay?: number;
  childTransition?: 'fade' | 'slide-up' | 'zoom';
}

export function StaggerWrapper({
  children,
  staggerDelay = 50,
  childTransition = 'slide-up',
}: StaggerWrapperProps) {
  return <div>{children}</div>;
}
