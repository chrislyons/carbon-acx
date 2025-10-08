import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface ResizableDividerProps extends HTMLAttributes<HTMLDivElement> {
  onResizeStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeBy?: (delta: number) => void;
  label?: string;
}

export const ResizableDivider = forwardRef<HTMLDivElement, ResizableDividerProps>(
  ({ className, onResizeStart, onResizeBy, label = 'Resize panels', ...props }, ref) => {
    return (
      <div
        {...props}
        ref={ref}
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        aria-label={label}
        onPointerDown={(event) => {
          props.onPointerDown?.(event);
          onResizeStart?.(event);
        }}
        onKeyDown={(event) => {
          props.onKeyDown?.(event);
          const key = event.key.toLowerCase();
          if (!onResizeBy) {
            return;
          }
          if (key === 'arrowleft') {
            event.preventDefault();
            onResizeBy(-16);
          } else if (key === 'arrowright') {
            event.preventDefault();
            onResizeBy(16);
          }
        }}
        className={cn(
          'group relative z-10 flex w-2 shrink-0 items-center justify-center px-1 outline-none transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background touch-none',
          className
        )}
      >
        <span className="pointer-events-none h-full w-px rounded-full bg-border/60 transition group-hover:bg-primary group-focus-visible:bg-primary" />
      </div>
    );
  }
);

ResizableDivider.displayName = 'ResizableDivider';
