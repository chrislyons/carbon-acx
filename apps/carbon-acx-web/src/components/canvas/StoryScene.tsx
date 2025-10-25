/**
 * StoryScene - Tier 2 Canvas Component
 *
 * Wrapper for narrative sections in the carbon literacy journey.
 * Handles scene transitions, progress tracking, and context-specific layouts.
 *
 * Scenes map to XState journey states:
 * - onboarding, baseline, explore, insight, act, share
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/cn';

export type SceneType =
  | 'onboarding'
  | 'baseline'
  | 'explore'
  | 'insight'
  | 'act'
  | 'share';

export interface StorySceneProps {
  /**
   * Scene identifier (maps to journey state)
   */
  scene: SceneType;
  /**
   * Whether this scene is currently active
   */
  active?: boolean;
  /**
   * Scene title (for accessibility)
   */
  title: string;
  /**
   * Scene description (for accessibility)
   */
  description?: string;
  /**
   * Progress through this scene (0-1)
   */
  progress?: number;
  /**
   * Callback when scene enters viewport
   */
  onEnter?: () => void;
  /**
   * Callback when scene exits viewport
   */
  onExit?: () => void;
  /**
   * Custom transition configuration
   */
  transition?: {
    duration?: number;
    ease?: string;
  };
  /**
   * Background style for scene
   */
  background?: 'default' | 'elevated' | 'gradient' | 'transparent';
  /**
   * Layout mode for scene content
   */
  layout?: 'stack' | 'grid' | 'canvas' | 'fullscreen';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Child components
   */
  children: React.ReactNode;
}

// Scene-specific visual configurations
const sceneConfigs: Record<
  SceneType,
  {
    bgClass: string;
    accentColor: string;
  }
> = {
  onboarding: {
    bgClass: 'bg-gradient-to-br from-[var(--accent-50)] to-[var(--surface-bg)]',
    accentColor: 'var(--interactive-primary)',
  },
  baseline: {
    bgClass: 'bg-[var(--surface-bg)]',
    accentColor: 'var(--color-baseline)',
  },
  explore: {
    bgClass: 'bg-[var(--surface-bg)]',
    accentColor: 'var(--interactive-primary)',
  },
  insight: {
    bgClass: 'bg-gradient-to-br from-[var(--surface-bg)] to-[var(--surface-elevated)]',
    accentColor: 'var(--color-insight)',
  },
  act: {
    bgClass: 'bg-[var(--surface-bg)]',
    accentColor: 'var(--color-goal)',
  },
  share: {
    bgClass: 'bg-gradient-to-br from-[var(--color-success)]/10 to-[var(--surface-bg)]',
    accentColor: 'var(--color-improvement)',
  },
};

const layoutClasses = {
  stack: 'flex flex-col gap-6',
  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
  canvas: 'relative',
  fullscreen: 'min-h-screen flex items-center justify-center',
};

const backgroundClasses = {
  default: 'bg-[var(--surface-bg)]',
  elevated: 'bg-[var(--surface-elevated)]',
  gradient: '', // Handled by scene-specific config
  transparent: 'bg-transparent',
};

export const StoryScene = React.forwardRef<HTMLDivElement, StorySceneProps>(
  (
    {
      scene,
      active = true,
      title,
      description,
      progress = 0,
      onEnter,
      onExit,
      transition,
      background = 'gradient',
      layout = 'stack',
      className,
      children,
    },
    ref
  ) => {
    const config = sceneConfigs[scene];
    const sceneRef = React.useRef<HTMLDivElement>(null);

    // Merge refs
    React.useImperativeHandle(ref, () => sceneRef.current!);

    // Intersection observer for enter/exit callbacks
    React.useEffect(() => {
      const element = sceneRef.current;
      if (!element || (!onEnter && !onExit)) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && onEnter) {
              onEnter();
            } else if (!entry.isIntersecting && onExit) {
              onExit();
            }
          });
        },
        {
          threshold: 0.5, // Trigger when 50% visible
        }
      );

      observer.observe(element);

      return () => observer.disconnect();
    }, [onEnter, onExit]);

    const transitionConfig = {
      duration: transition?.duration || 0.6,
      ease: transition?.ease || [0.43, 0.13, 0.23, 0.96],
    };

    const bgClass =
      background === 'gradient' ? config.bgClass : backgroundClasses[background];

    return (
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            ref={sceneRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={transitionConfig}
            data-scene={scene}
            data-active={active}
            className={cn(
              'relative w-full min-h-[50vh]',
              bgClass,
              layoutClasses[layout],
              className
            )}
            role="region"
            aria-labelledby={`scene-${scene}-title`}
            aria-describedby={description ? `scene-${scene}-description` : undefined}
          >
            {/* Scene header (visually hidden for screen readers) */}
            <h2 id={`scene-${scene}-title`} className="sr-only">
              {title}
            </h2>
            {description && (
              <p id={`scene-${scene}-description`} className="sr-only">
                {description}
              </p>
            )}

            {/* Progress indicator */}
            {progress > 0 && progress < 1 && (
              <div
                className="absolute top-0 left-0 right-0 h-1 bg-[var(--surface-elevated)]"
                role="progressbar"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Scene progress: ${Math.round(progress * 100)}%`}
              >
                <motion.div
                  className="h-full"
                  style={{
                    background: config.accentColor,
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Scene content */}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

StoryScene.displayName = 'StoryScene';
