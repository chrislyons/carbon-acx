/**
 * GaugeProgress - Tier 3 Visualization Component
 *
 * Circular gauge for goal tracking and progress visualization.
 * Shows current value, target, and percentage completion.
 *
 * Features:
 * - Animated circular gauge using ECharts
 * - Color coding based on carbon intensity
 * - Target indicators and thresholds
 * - Responsive sizing
 * - Theme-aware styling
 */

import * as React from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { cn } from '../../lib/cn';

export type GaugeColorScheme = 'carbon' | 'progress' | 'neutral';

export interface GaugeProgressProps {
  /**
   * Current value
   */
  value: number;
  /**
   * Maximum value (gauge endpoint)
   */
  max: number;
  /**
   * Target value to achieve
   */
  target?: number;
  /**
   * Label for the gauge
   */
  label: string;
  /**
   * Unit of measurement
   */
  unit?: string;
  /**
   * Color scheme
   * - carbon: Green (low) → Amber (moderate) → Red (high)
   * - progress: Blue gradient for completion tracking
   * - neutral: Single gray color
   */
  colorScheme?: GaugeColorScheme;
  /**
   * Size (width and height)
   */
  size?: number;
  /**
   * Show percentage instead of raw value
   */
  showPercentage?: boolean;
  /**
   * Theme
   */
  theme?: 'light' | 'dark';
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Callback when chart is ready
   */
  onChartReady?: (chart: echarts.ECharts) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const GaugeProgress = React.forwardRef<HTMLDivElement, GaugeProgressProps>(
  (
    {
      value,
      max,
      target,
      label,
      unit = '',
      colorScheme = 'progress',
      size = 300,
      showPercentage = false,
      theme,
      loading = false,
      onChartReady,
      className,
    },
    ref
  ) => {
    const chartRef = React.useRef<HTMLDivElement>(null);
    const chartInstanceRef = React.useRef<echarts.ECharts | null>(null);

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

    // Calculate percentage
    const percentage = React.useMemo(() => {
      return Math.min((value / max) * 100, 100);
    }, [value, max]);

    // Determine color based on scheme
    const gaugeColor = React.useMemo(() => {
      if (colorScheme === 'carbon') {
        // Carbon intensity: inverted (lower is better)
        const targetPercent = target ? (target / max) * 100 : 50;

        if (percentage <= targetPercent * 0.5) {
          return 'var(--carbon-low)'; // Excellent
        } else if (percentage <= targetPercent) {
          return 'var(--carbon-moderate)'; // Good
        } else {
          return 'var(--carbon-high)'; // Needs improvement
        }
      } else if (colorScheme === 'progress') {
        // Progress: higher is better
        if (percentage >= 90) {
          return 'var(--carbon-low)'; // Excellent
        } else if (percentage >= 50) {
          return 'var(--interactive-primary)'; // Good
        } else {
          return 'var(--carbon-moderate)'; // In progress
        }
      } else {
        return 'var(--carbon-neutral)';
      }
    }, [colorScheme, percentage, target, max]);

    // Build ECharts option
    const chartOption: EChartsOption = React.useMemo(() => {
      const displayValue = showPercentage
        ? percentage.toFixed(1)
        : value.toFixed(0);
      const displayUnit = showPercentage ? '%' : unit;

      const option: EChartsOption = {
        series: [
          {
            type: 'gauge',
            startAngle: 200,
            endAngle: -20,
            min: 0,
            max,
            splitNumber: 8,
            radius: '85%',
            center: ['50%', '55%'],
            progress: {
              show: true,
              width: 18,
              itemStyle: {
                color: gaugeColor,
              },
            },
            axisLine: {
              lineStyle: {
                width: 18,
                color: [[1, 'var(--border-subtle)']],
              },
            },
            axisTick: {
              show: false,
            },
            splitLine: {
              show: true,
              length: 10,
              distance: -12,
              lineStyle: {
                width: 2,
                color: 'var(--border-default)',
              },
            },
            axisLabel: {
              show: false,
            },
            pointer: {
              show: false,
            },
            anchor: {
              show: false,
            },
            title: {
              show: true,
              offsetCenter: [0, '85%'],
              fontSize: 14,
              color: 'var(--text-secondary)',
            },
            detail: {
              valueAnimation: true,
              width: '100%',
              lineHeight: 40,
              borderRadius: 8,
              offsetCenter: [0, '10%'],
              fontSize: 40,
              fontWeight: 'bold',
              formatter: `{value}${displayUnit ? ' ' + displayUnit : ''}`,
              color: gaugeColor,
            },
            data: [
              {
                value: showPercentage ? percentage : value,
                name: label,
              },
            ],
          },
        ],
      };

      // Add target indicator if provided
      if (target !== undefined) {
        const targetPercent = (target / max) * 100;

        // Add target line as separate series
        if (option.series) {
          (option.series as any[]).push({
            type: 'gauge',
            startAngle: 200,
            endAngle: -20,
            min: 0,
            max,
            radius: '85%',
            center: ['50%', '55%'],
            axisLine: {
              show: false,
            },
            axisTick: {
              show: false,
            },
            splitLine: {
              show: false,
            },
            axisLabel: {
              show: false,
            },
            pointer: {
              show: true,
              length: '95%',
              width: 3,
              itemStyle: {
                color: 'var(--color-goal)',
              },
            },
            anchor: {
              show: true,
              showAbove: true,
              size: 8,
              itemStyle: {
                borderWidth: 2,
                borderColor: 'var(--color-goal)',
                color: 'var(--surface-elevated)',
              },
            },
            title: {
              show: false,
            },
            detail: {
              show: false,
            },
            data: [
              {
                value: target,
              },
            ],
          });
        }
      }

      return option;
    }, [
      value,
      max,
      target,
      label,
      unit,
      showPercentage,
      percentage,
      gaugeColor,
    ]);

    // Initialize chart
    React.useEffect(() => {
      if (!chartRef.current) return;

      const chart = echarts.init(chartRef.current, detectedTheme, {
        renderer: 'canvas',
      });

      chartInstanceRef.current = chart;

      if (onChartReady) {
        onChartReady(chart);
      }

      return () => {
        chart.dispose();
        chartInstanceRef.current = null;
      };
    }, [detectedTheme, onChartReady]);

    // Update chart option
    React.useEffect(() => {
      const chart = chartInstanceRef.current;
      if (!chart) return;

      chart.setOption(chartOption, {
        notMerge: false,
        lazyUpdate: false,
      });
    }, [chartOption]);

    // Handle loading state
    React.useEffect(() => {
      const chart = chartInstanceRef.current;
      if (!chart) return;

      if (loading) {
        chart.showLoading('default', {
          text: 'Loading gauge...',
          color: 'var(--interactive-primary)',
          textColor: 'var(--text-primary)',
          maskColor: 'var(--surface-bg)',
        });
      } else {
        chart.hideLoading();
      }
    }, [loading]);

    // Handle resize
    React.useEffect(() => {
      const chart = chartInstanceRef.current;
      if (!chart) return;

      const handleResize = () => {
        chart.resize();
      };

      window.addEventListener('resize', handleResize);

      const resizeObserver = new ResizeObserver(handleResize);
      if (chartRef.current) {
        resizeObserver.observe(chartRef.current);
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <div
        ref={ref}
        className={cn('flex flex-col items-center', className)}
      >
        <div
          ref={chartRef}
          style={{
            width: `${size}px`,
            height: `${size}px`,
          }}
          role="img"
          aria-label={`Gauge showing ${label}: ${value} ${unit}`}
        />
        {target !== undefined && (
          <div className="mt-2 text-center">
            <p className="text-[var(--font-size-sm)] text-[var(--text-secondary)]">
              Target: {target.toLocaleString()} {unit}
            </p>
          </div>
        )}
      </div>
    );
  }
);

GaugeProgress.displayName = 'GaugeProgress';

/**
 * Utility hook for managing gauge state
 */
export function useGaugeProgress(initialValue: number, max: number) {
  const [value, setValue] = React.useState(initialValue);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const updateValue = React.useCallback(
    (newValue: number, animated = true) => {
      if (animated) {
        setIsAnimating(true);
        // ECharts handles the animation
        setValue(newValue);
        setTimeout(() => setIsAnimating(false), 1000);
      } else {
        setValue(newValue);
      }
    },
    []
  );

  const percentage = React.useMemo(() => {
    return Math.min((value / max) * 100, 100);
  }, [value, max]);

  return {
    value,
    percentage,
    isAnimating,
    updateValue,
    reset: () => setValue(0),
    setToMax: () => setValue(max),
  };
}
