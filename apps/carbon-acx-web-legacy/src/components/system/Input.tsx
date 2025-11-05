/**
 * Input - Tier 1 Design System Primitive
 *
 * Form input component with validation states and design token integration.
 * Supports various types, sizes, and semantic states (error, success, warning).
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

const inputVariants = cva(
  // Base styles using design tokens
  'flex w-full rounded-[var(--radius-md)] border bg-[var(--surface-bg)] px-3 py-2 text-[var(--font-size-base)] text-[var(--text-primary)] transition-all file:border-0 file:bg-transparent file:text-[var(--font-size-sm)] file:font-medium placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-bg)] disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      state: {
        default:
          'border-[var(--border-default)] focus-visible:ring-[var(--focus-color)] hover:border-[var(--border-strong)]',
        error:
          'border-[var(--color-error)] focus-visible:ring-[var(--color-error)] bg-red-50/50 dark:bg-red-900/10',
        success:
          'border-[var(--color-success)] focus-visible:ring-[var(--color-success)] bg-green-50/50 dark:bg-green-900/10',
        warning:
          'border-[var(--color-warning)] focus-visible:ring-[var(--color-warning)] bg-amber-50/50 dark:bg-amber-900/10',
      },
      inputSize: {
        sm: 'h-8 px-2 py-1 text-[var(--font-size-sm)]',
        md: 'h-10 px-3 py-2 text-[var(--font-size-base)]',
        lg: 'h-12 px-4 py-3 text-[var(--font-size-lg)]',
      },
    },
    defaultVariants: {
      state: 'default',
      inputSize: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /**
   * Label text for the input
   */
  label?: string;
  /**
   * Helper text or error message to display below input
   */
  helperText?: string;
  /**
   * Icon to display on the left side of input
   */
  leftIcon?: React.ReactNode;
  /**
   * Icon to display on the right side of input
   */
  rightIcon?: React.ReactNode;
  /**
   * Show validation icon based on state
   */
  showValidationIcon?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      state = 'default',
      inputSize,
      label,
      helperText,
      leftIcon,
      rightIcon,
      showValidationIcon = true,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const helperTextId = `${inputId}-helper`;

    // Determine validation icon
    const validationIcon = React.useMemo(() => {
      if (!showValidationIcon || state === 'default') return null;

      const iconClass = 'h-4 w-4';
      switch (state) {
        case 'error':
          return <AlertCircle className={iconClass} aria-hidden="true" />;
        case 'success':
          return <CheckCircle className={iconClass} aria-hidden="true" />;
        case 'warning':
          return <Info className={iconClass} aria-hidden="true" />;
        default:
          return null;
      }
    }, [showValidationIcon, state]);

    const hasLeftContent = leftIcon !== undefined;
    const hasRightContent = rightIcon !== undefined || validationIcon !== null;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[var(--font-size-sm)] font-medium text-[var(--text-primary)] mb-1.5"
          >
            {label}
            {props.required && (
              <span className="text-[var(--color-error)] ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          {hasLeftContent && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ state, inputSize, className }),
              hasLeftContent && 'pl-10',
              hasRightContent && 'pr-10'
            )}
            ref={ref}
            id={inputId}
            aria-invalid={state === 'error' ? 'true' : 'false'}
            aria-describedby={helperText ? helperTextId : undefined}
            {...props}
          />
          {hasRightContent && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {rightIcon || validationIcon}
            </div>
          )}
        </div>
        {helperText && (
          <p
            id={helperTextId}
            className={cn(
              'mt-1.5 text-[var(--font-size-sm)]',
              state === 'error' && 'text-[var(--color-error)]',
              state === 'success' && 'text-[var(--color-success)]',
              state === 'warning' && 'text-[var(--color-warning)]',
              state === 'default' && 'text-[var(--text-secondary)]'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
