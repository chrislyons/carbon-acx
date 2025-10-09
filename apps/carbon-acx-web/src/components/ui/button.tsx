import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-default ease-[var(--motion-ease)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-accent-500 text-white hover:bg-accent-600',
        secondary:
          'bg-surface text-foreground border-border shadow-sm hover:bg-neutral-50/80 dark:hover:bg-neutral-800/70',
        ghost: 'bg-transparent text-foreground hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70',
        outline:
          'bg-transparent border-border text-foreground hover:border-accent-400 hover:text-accent-500',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-11 px-5 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';
