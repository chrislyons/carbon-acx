/**
 * SkeletonLoader - Loading placeholders for async content
 *
 * Features:
 * - Multiple skeleton types (text, card, chart, list)
 * - Shimmer animation effect
 * - Customizable dimensions
 * - Design token consistency
 * - Accessible loading states
 *
 * Phase 3 Week 7 implementation
 */

import * as React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface SkeletonLoaderProps {
  type?: 'text' | 'card' | 'chart' | 'circle' | 'custom';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
}

export interface SkeletonCardProps {
  showImage?: boolean;
  lines?: number;
}

export interface SkeletonChartProps {
  height?: string | number;
  showLegend?: boolean;
}

export interface SkeletonListProps {
  items?: number;
  itemHeight?: string | number;
}

// ============================================================================
// Base Skeleton Component
// ============================================================================

export function SkeletonLoader({
  type = 'text',
  width,
  height,
  count = 1,
  className = '',
}: SkeletonLoaderProps) {
  if (type === 'text') {
    return (
      <div className={`space-y-[var(--space-2)] ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={i}
            width={width || `${100 - (i % 3) * 10}%`}
            height={height || 'var(--space-4)'}
          />
        ))}
      </div>
    );
  }

  if (type === 'circle') {
    return <Skeleton width={width || '48px'} height={height || '48px'} className="rounded-full" />;
  }

  return <Skeleton width={width} height={height} className={className} />;
}

// ============================================================================
// Skeleton Primitive
// ============================================================================

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

function Skeleton({ width = '100%', height = '1rem', className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: 'var(--surface-elevated)',
        borderRadius: 'var(--radius-sm)',
        position: 'relative',
        overflow: 'hidden',
      }}
      role="status"
      aria-label="Loading"
      aria-busy="true"
    >
      <div
        className="skeleton-shimmer"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'linear-gradient(90deg, transparent 0%, var(--surface-hover) 50%, transparent 100%)',
          animation: 'skeleton-shimmer 2s infinite',
        }}
      />
    </div>
  );
}

// ============================================================================
// Composite Skeletons
// ============================================================================

/**
 * Skeleton for card components
 */
export function SkeletonCard({ showImage = true, lines = 3 }: SkeletonCardProps) {
  return (
    <div
      className="p-[var(--space-6)] rounded-[var(--radius-lg)]"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        border: '1px solid var(--border-default)',
      }}
      role="status"
      aria-label="Loading card"
    >
      {showImage && (
        <Skeleton width="100%" height="160px" className="mb-[var(--space-4)] rounded-[var(--radius-md)]" />
      )}

      {/* Title */}
      <Skeleton width="80%" height="var(--space-6)" className="mb-[var(--space-3)]" />

      {/* Lines */}
      <div className="space-y-[var(--space-2)]">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            width={i === lines - 1 ? '60%' : '100%'}
            height="var(--space-4)"
          />
        ))}
      </div>

      {/* Action button */}
      <Skeleton width="120px" height="40px" className="mt-[var(--space-4)] rounded-[var(--radius-md)]" />
    </div>
  );
}

/**
 * Skeleton for chart components
 */
export function SkeletonChart({ height = '400px', showLegend = true }: SkeletonChartProps) {
  return (
    <div role="status" aria-label="Loading chart">
      {/* Chart title */}
      <Skeleton width="200px" height="var(--space-5)" className="mb-[var(--space-4)]" />

      {/* Main chart area */}
      <Skeleton
        width="100%"
        height={height}
        className="rounded-[var(--radius-lg)] mb-[var(--space-4)]"
      />

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-[var(--space-4)] justify-center">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-[var(--space-2)]">
              <Skeleton width="12px" height="12px" className="rounded-full" />
              <Skeleton width="80px" height="var(--space-3)" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton for list items
 */
export function SkeletonList({ items = 5, itemHeight = '60px' }: SkeletonListProps) {
  return (
    <div className="space-y-[var(--space-3)]" role="status" aria-label="Loading list">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-[var(--space-3)] p-[var(--space-4)] rounded-[var(--radius-md)]"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Skeleton width="48px" height="48px" className="rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-[var(--space-2)]">
            <Skeleton width="70%" height="var(--space-4)" />
            <Skeleton width="40%" height="var(--space-3)" />
          </div>
          <Skeleton width="80px" height="32px" className="rounded-[var(--radius-sm)]" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for data table
 */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-lg)]"
      style={{
        border: '1px solid var(--border-default)',
      }}
      role="status"
      aria-label="Loading table"
    >
      {/* Header */}
      <div
        className="flex gap-[var(--space-4)] p-[var(--space-4)]"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width={`${100 / columns}%`} height="var(--space-4)" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-[var(--space-4)] p-[var(--space-4)]"
          style={{
            borderBottom:
              rowIndex < rows - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              width={`${100 / columns}%`}
              height="var(--space-3)"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for gauge/progress components
 */
export function SkeletonGauge({ size = '200px' }: { size?: string | number }) {
  const sizeValue = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className="flex flex-col items-center gap-[var(--space-4)]"
      role="status"
      aria-label="Loading gauge"
    >
      <Skeleton width={sizeValue} height={sizeValue} className="rounded-full" />
      <Skeleton width="120px" height="var(--space-5)" />
      <Skeleton width="80px" height="var(--space-3)" />
    </div>
  );
}

// ============================================================================
// Global CSS (should be added to global styles)
// ============================================================================

/*
Add to your global CSS file (e.g., src/styles/globals.css):

@keyframes skeleton-shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.skeleton-loader {
  --shimmer-color: var(--surface-hover);
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer {
    animation: none !important;
  }
}
*/
