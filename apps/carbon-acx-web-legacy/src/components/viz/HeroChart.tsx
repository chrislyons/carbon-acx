/**
 * HeroChart - Tier 3 Visualization Component
 *
 * Full-viewport canvas chart using Apache ECharts.
 * Primary visualization component for immersive data experience.
 *
 * Features:
 * - Canvas rendering for smooth 60fps animations
 * - Responsive to viewport changes
 * - Supports multiple chart types
 * - Theme-aware (light/dark mode)
 */

import * as React from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { cn } from '../../lib/cn';

export interface HeroChartProps {
  /**
   * ECharts configuration object
   */
  option: EChartsOption;
  /**
   * Chart height (default: 100% of container)
   */
  height?: string | number;
  /**
   * Chart width (default: 100%)
   */
  width?: string | number;
  /**
   * Enable automatic resize on window resize
   */
  autoResize?: boolean;
  /**
   * Theme (auto-detects from CSS if not specified)
   */
  theme?: 'light' | 'dark';
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Loading text
   */
  loadingText?: string;
  /**
   * Callback when chart is ready
   */
  onChartReady?: (chart: echarts.ECharts) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const HeroChart = React.forwardRef<HTMLDivElement, HeroChartProps>(
  (
    {
      option,
      height = '100%',
      width = '100%',
      autoResize = true,
      theme,
      loading = false,
      loadingText = 'Loading visualization...',
      onChartReady,
      className,
    },
    ref
  ) => {
    const chartRef = React.useRef<HTMLDivElement>(null);
    const chartInstanceRef = React.useRef<echarts.ECharts | null>(null);

    // Merge refs
    React.useImperativeHandle(ref, () => chartRef.current!);

    // Detect theme from CSS if not specified
    const detectedTheme = React.useMemo(() => {
      if (theme) return theme;

      // Check if dark mode is active
      if (typeof window !== 'undefined') {
        const isDark =
          document.documentElement.dataset.theme === 'dark' ||
          document.documentElement.classList.contains('dark');
        return isDark ? 'dark' : 'light';
      }
      return 'light';
    }, [theme]);

    // Initialize chart
    React.useEffect(() => {
      if (!chartRef.current) return;

      // Create chart instance
      const chart = echarts.init(chartRef.current, detectedTheme, {
        renderer: 'canvas', // Use canvas for better performance
      });

      chartInstanceRef.current = chart;

      // Notify parent component
      if (onChartReady) {
        onChartReady(chart);
      }

      // Cleanup
      return () => {
        chart.dispose();
        chartInstanceRef.current = null;
      };
    }, [detectedTheme, onChartReady]);

    // Update chart option
    React.useEffect(() => {
      const chart = chartInstanceRef.current;
      if (!chart) return;

      chart.setOption(option, {
        notMerge: false, // Merge with previous option
        lazyUpdate: false,
        silent: false,
      });
    }, [option]);

    // Handle loading state
    React.useEffect(() => {
      const chart = chartInstanceRef.current;
      if (!chart) return;

      if (loading) {
        chart.showLoading('default', {
          text: loadingText,
          color: 'var(--interactive-primary)',
          textColor: 'var(--text-primary)',
          maskColor: 'var(--surface-bg)',
          zlevel: 0,
        });
      } else {
        chart.hideLoading();
      }
    }, [loading, loadingText]);

    // Handle window resize
    React.useEffect(() => {
      if (!autoResize) return;

      const chart = chartInstanceRef.current;
      if (!chart) return;

      const handleResize = () => {
        chart.resize();
      };

      window.addEventListener('resize', handleResize);

      // Also observe container size changes
      const resizeObserver = new ResizeObserver(handleResize);
      if (chartRef.current) {
        resizeObserver.observe(chartRef.current);
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
      };
    }, [autoResize]);

    const styleObject = React.useMemo(
      () => ({
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
      }),
      [height, width]
    );

    return (
      <div
        ref={chartRef}
        style={styleObject}
        className={cn('relative', className)}
        role="img"
        aria-label="Data visualization chart"
      />
    );
  }
);

HeroChart.displayName = 'HeroChart';

/**
 * Utility hook for accessing chart instance
 */
export function useHeroChart() {
  const chartRef = React.useRef<echarts.ECharts | null>(null);

  const setChart = React.useCallback((chart: echarts.ECharts) => {
    chartRef.current = chart;
  }, []);

  return {
    chart: chartRef.current,
    setChart,
    isReady: chartRef.current !== null,
  };
}
