/**
 * Button - Tier 1 Design System Primitive
 *
 * Enhanced button component using design tokens for the canvas-first interface.
 * Supports multiple variants, sizes, and states with proper accessibility.
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { tapAnimation, hoverScale } from '../../utils/microInteractions';
import { useReducedMotion } from '../../hooks/useAccessibility';

const buttonVariants = cva(
  // Base styles using design tokens
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-bg)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--interactive-primary)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--interactive-primary-hover)] active:bg-[var(--interactive-primary-active)]',
        secondary:
          'bg-[var(--interactive-secondary)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-[var(--shadow-xs)] hover:bg-[var(--interactive-secondary-hover)]',
        ghost:
          'bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
        outline:
          'bg-transparent border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--border-accent)] hover:text-[var(--text-accent)] hover:bg-[var(--surface-hover)]',
        success:
          'bg-[var(--color-success)] text-white shadow-[var(--shadow-sm)] hover:opacity-90',
        warning:
          'bg-[var(--color-warning)] text-white shadow-[var(--shadow-sm)] hover:opacity-90',
        danger:
          'bg-[var(--color-error)] text-white shadow-[var(--shadow-sm)] hover:opacity-90',
        goal:
          'bg-[var(--color-goal)] text-white shadow-[var(--shadow-sm)] hover:opacity-90',
        insight:
          'bg-[var(--color-insight)] text-white shadow-[var(--shadow-sm)] hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-[var(--font-size-sm)]',
        md: 'h-10 px-4 text-[var(--font-size-base)]',
        lg: 'h-12 px-6 text-[var(--font-size-lg)]',
        xl: 'h-14 px-8 text-[var(--font-size-xl)]',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-12 w-12 p-0',
      },
      rounded: {
        default: 'rounded-[var(--radius-md)]',
        sm: 'rounded-[var(--radius-sm)]',
        lg: 'rounded-[var(--radius-lg)]',
        xl: 'rounded-[var(--radius-xl)]',
        full: 'rounded-[var(--radius-full)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      rounded: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render as child component (for composition with Link, etc.)
   */
  asChild?: boolean;
  /**
   * Loading state - shows spinner and disables interaction
   */
  loading?: boolean;
  /**
   * Icon element to display (defaults to left position)
   * Alias for leftIcon
   */
  icon?: React.ReactNode;
  /**
   * Icon element to display before children
   */
  leftIcon?: React.ReactNode;
  /**
   * Icon element to display after children
   */
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      rounded,
      asChild = false,
      loading = false,
      icon,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const Comp = asChild ? Slot : motion.button;

    // icon prop is an alias for leftIcon
    const resolvedLeftIcon = leftIcon || icon;

    // Only apply micro-interactions if motion is not reduced and button is not disabled/loading
    const motionProps =
      !prefersReducedMotion && !disabled && !loading
        ? {
            whileHover: hoverScale.hover,
            whileTap: tapAnimation.tap,
            initial: 'rest',
          }
        : {};

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, rounded, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...motionProps}
        {...(props as any)}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && resolvedLeftIcon && <span aria-hidden="true">{resolvedLeftIcon}</span>}
        {children}
        {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
      </Comp>
    );
  }
);

Button.displayName = 'Button';
