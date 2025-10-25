/**
 * ComparisonOverlay - Tier 3 Visualization Component
 *
 * Side-by-side comparison visualization using Apache ECharts.
 * Allows users to compare two scenarios, time periods, or datasets.
 *
 * Features:
 * - Dual chart rendering with synchronized axes
 * - Difference highlighting
 * - Percentage change indicators
 * - Theme-aware styling
 */

import * as React from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { cn } from '../../lib/cn';

export interface ComparisonData {
  /**
   * Label for this dataset
   */
  label: string;
  /**
   * ECharts configuration for this chart
   */
  option: EChartsOption;
  /**
   * Optional summary statistic
   */
  summary?: {
    value: number;
    unit: string;
    change?: number; // Percentage change from baseline
  };
}

export interface ComparisonOverlayProps {
  /**
   * First dataset (baseline)
   */
  baseline: ComparisonData;
  /**
   * Second dataset (comparison)
   */
  comparison: ComparisonData;
  /**
   * Chart height (default: 400px)
   */
  height?: string | number;
  /**
   * Layout orientation
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Show difference indicator
   */
  showDifference?: boolean;
  /**
   * Theme (auto-detects from CSS if not specified)
   */
  theme?: 'light' | 'dark';
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ComparisonOverlay = React.forwardRef<
  HTMLDivElement,
  ComparisonOverlayProps
>(
  (
    {
      baseline,
      comparison,
      height = '400px',
      orientation = 'horizontal',
      showDifference = true,
      theme,
      loading = false,
      className,
    },
    ref
  ) => {
    const baselineChartRef = React.useRef<HTMLDivElement>(null);
    const comparisonChartRef = React.useRef<HTMLDivElement>(null);
    const baselineInstanceRef = React.useRef<echarts.ECharts | null>(null);
    const comparisonInstanceRef = React.useRef<echarts.ECharts | null>(null);

    // Detect theme
    const detectedTheme = React.useMemo(() => {
      if (theme) return theme;
      if (typeof window !== 'undefined') {
        const isDark =
          document.documentElement.dataset.theme === 'dark' ||
          document.documentElement.classList.contains('dark');
        return isDark ? 'dark' : 'light';
      }
      return 'light';
    }, [theme]);

    // Initialize charts
    React.useEffect(() => {
      if (!baselineChartRef.current || !comparisonChartRef.current) return;

      const baselineChart = echarts.init(
        baselineChartRef.current,
        detectedTheme,
        { renderer: 'canvas' }
      );
      const comparisonChart = echarts.init(
        comparisonChartRef.current,
        detectedTheme,
        { renderer: 'canvas' }
      );

      baselineInstanceRef.current = baselineChart;
      comparisonInstanceRef.current = comparisonChart;

      // Connect charts for synchronized interactions
      echarts.connect([baselineChart, comparisonChart]);

      return () => {
        echarts.disconnect([baselineChart, comparisonChart]);
        baselineChart.dispose();
        comparisonChart.dispose();
        baselineInstanceRef.current = null;
        comparisonInstanceRef.current = null;
      };
    }, [detectedTheme]);

    // Update chart options
    React.useEffect(() => {
      if (!baselineInstanceRef.current || !comparisonInstanceRef.current)
        return;

      baselineInstanceRef.current.setOption(baseline.option);
      comparisonInstanceRef.current.setOption(comparison.option);
    }, [baseline.option, comparison.option]);

    // Handle loading state
    React.useEffect(() => {
      if (!baselineInstanceRef.current || !comparisonInstanceRef.current)
        return;

      if (loading) {
        baselineInstanceRef.current.showLoading();
        comparisonInstanceRef.current.showLoading();
      } else {
        baselineInstanceRef.current.hideLoading();
        comparisonInstanceRef.current.hideLoading();
      }
    }, [loading]);

    // Handle resize
    React.useEffect(() => {
      const handleResize = () => {
        baselineInstanceRef.current?.resize();
        comparisonInstanceRef.current?.resize();
      };

      window.addEventListener('resize', handleResize);

      const baselineObserver = new ResizeObserver(handleResize);
      const comparisonObserver = new ResizeObserver(handleResize);

      if (baselineChartRef.current) {
        baselineObserver.observe(baselineChartRef.current);
      }
      if (comparisonChartRef.current) {
        comparisonObserver.observe(comparisonChartRef.current);
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        baselineObserver.disconnect();
        comparisonObserver.disconnect();
      };
    }, []);

    // Calculate difference
    const difference = React.useMemo(() => {
      if (
        !showDifference ||
        !baseline.summary ||
        !comparison.summary ||
        baseline.summary.change === undefined
      ) {
        return null;
      }

      const change = comparison.summary.change;
      const isPositive = change > 0;
      const isNeutral = change === 0;

      return {
        change,
        isPositive,
        isNeutral,
        label: isNeutral
          ? 'No change'
          : `${isPositive ? '+' : ''}${change.toFixed(1)}%`,
        color: isNeutral
          ? 'var(--carbon-neutral)'
          : isPositive
            ? 'var(--carbon-high)'
            : 'var(--carbon-low)',
      };
    }, [baseline.summary, comparison.summary, showDifference]);

    const containerStyle = React.useMemo(
      () => ({
        height: typeof height === 'number' ? `${height}px` : height,
      }),
      [height]
    );

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex',
          orientation === 'horizontal' ? 'flex-row gap-4' : 'flex-col gap-6',
          className
        )}
        style={containerStyle}
      >
        {/* Baseline Chart */}
        <div className="flex-1 flex flex-col">
          <div className="mb-2">
            <h3 className="text-[var(--font-size-lg)] font-semibold text-[var(--text-primary)]">
              {baseline.label}
            </h3>
            {baseline.summary && (
              <p className="text-[var(--font-size-2xl)] font-bold text-[var(--text-primary)] mt-1">
                {baseline.summary.value.toLocaleString()} {baseline.summary.unit}
              </p>
            )}
          </div>
          <div ref={baselineChartRef} className="flex-1" />
        </div>

        {/* Difference Indicator */}
        {difference && orientation === 'horizontal' && (
          <div className="flex items-center justify-center px-4">
            <div className="text-center">
              <div
                className="text-[var(--font-size-3xl)] font-bold"
                style={{ color: difference.color }}
              >
                {difference.label}
              </div>
              <div className="text-[var(--font-size-xs)] text-[var(--text-tertiary)] uppercase mt-1">
                Change
              </div>
            </div>
          </div>
        )}

        {/* Comparison Chart */}
        <div className="flex-1 flex flex-col">
          <div className="mb-2">
            <h3 className="text-[var(--font-size-lg)] font-semibold text-[var(--text-primary)]">
              {comparison.label}
            </h3>
            {comparison.summary && (
              <p className="text-[var(--font-size-2xl)] font-bold text-[var(--text-primary)] mt-1">
                {comparison.summary.value.toLocaleString()}{' '}
                {comparison.summary.unit}
              </p>
            )}
          </div>
          <div ref={comparisonChartRef} className="flex-1" />
        </div>

        {/* Difference Indicator (vertical orientation) */}
        {difference && orientation === 'vertical' && (
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <div
                className="text-[var(--font-size-3xl)] font-bold"
                style={{ color: difference.color }}
              >
                {difference.label}
              </div>
              <div className="text-[var(--font-size-xs)] text-[var(--text-tertiary)] uppercase mt-1">
                Change
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ComparisonOverlay.displayName = 'ComparisonOverlay';
