/**
 * CanvasZone - Tier 2 Layout Component
 *
 * Viewport-aware container for the canvas-first layout system.
 * Replaces traditional grid/card layouts with fluid, responsive zones.
 *
 * Zones:
 * - hero: Primary visualization (70vh by default)
 * - insight: Supporting context (20vh by default)
 * - detail: Drill-down information (10vh by default, collapsible)
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const canvasZoneVariants = cva(
  // Base styles
  'relative w-full transition-all ease-[var(--motion-story-ease)] duration-[var(--motion-story-duration)]',
  {
    variants: {
      zone: {
        hero: 'min-h-[var(--zone-hero-height)] bg-[var(--surface-bg)]',
        insight: 'min-h-[var(--zone-insight-height)] bg-[var(--surface-elevated)] border-t border-[var(--border-subtle)]',
        detail: 'min-h-[var(--zone-detail-height)] bg-[var(--surface-elevated)] border-t border-[var(--border-default)]',
      },
      priority: {
        primary: 'z-[var(--z-base)]',
        secondary: 'z-[calc(var(--z-base)_+_1)]',
        overlay: 'z-[var(--z-fixed)]',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-12',
      },
      overflow: {
        visible: 'overflow-visible',
        hidden: 'overflow-hidden',
        scroll: 'overflow-auto',
        'scroll-y': 'overflow-y-auto overflow-x-hidden',
        'scroll-x': 'overflow-x-auto overflow-y-hidden',
      },
    },
    defaultVariants: {
      zone: 'hero',
      priority: 'primary',
      padding: 'md',
      overflow: 'visible',
    },
  }
);

export interface CanvasZoneProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof canvasZoneVariants> {
  /**
   * Unique identifier for this zone
   */
  zoneId: string;
  /**
   * Whether this zone is currently active/visible
   */
  active?: boolean;
  /**
   * Whether this zone can be collapsed
   */
  collapsible?: boolean;
  /**
   * Whether the zone is currently collapsed
   */
  collapsed?: boolean;
  /**
   * Callback when collapse state changes
   */
  onCollapsedChange?: (collapsed: boolean) => void;
  /**
   * Interaction mode for this zone
   */
  interactionMode?: 'explore' | 'compare' | 'drill';
}

export const CanvasZone = React.forwardRef<HTMLDivElement, CanvasZoneProps>(
  (
    {
      className,
      zone,
      priority,
      padding,
      overflow,
      zoneId,
      active = true,
      collapsible = false,
      collapsed = false,
      onCollapsedChange,
      interactionMode = 'explore',
      children,
      ...props
    },
    ref
  ) => {
    const handleToggleCollapse = React.useCallback(() => {
      if (collapsible && onCollapsedChange) {
        onCollapsedChange(!collapsed);
      }
    }, [collapsible, collapsed, onCollapsedChange]);

    return (
      <div
        ref={ref}
        id={`canvas-zone-${zoneId}`}
        data-zone={zone}
        data-active={active}
        data-collapsed={collapsed}
        data-interaction-mode={interactionMode}
        className={cn(
          canvasZoneVariants({ zone, priority, padding, overflow, className }),
          !active && 'opacity-50 pointer-events-none',
          collapsed && 'min-h-0 h-0 overflow-hidden'
        )}
        role="region"
        aria-label={`${zone} zone`}
        {...props}
      >
        {collapsible && (
          <button
            onClick={handleToggleCollapse}
            className="absolute top-2 right-2 z-10 p-2 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border-default)] hover:bg-[var(--surface-hover)] transition-colors"
            aria-label={collapsed ? `Expand ${zone} zone` : `Collapse ${zone} zone`}
            aria-expanded={!collapsed}
          >
            <svg
              className={cn(
                'h-4 w-4 transition-transform',
                collapsed && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
        )}
        {!collapsed && children}
      </div>
    );
  }
);

CanvasZone.displayName = 'CanvasZone';
