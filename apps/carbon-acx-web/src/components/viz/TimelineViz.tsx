/**
 * TimelineViz - Tier 3 Visualization Component
 *
 * Interactive timeline visualization for historical carbon data.
 * Shows emissions trends over time with annotations and milestones.
 *
 * Features:
 * - Time-based data series with multiple granularities
 * - Milestone annotations for key events
 * - Brushing/zooming for detailed exploration
 * - Comparison overlays (baseline vs actual)
 * - Theme-aware styling
 */

import * as React from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { cn } from '../../lib/cn';

export interface TimelineDataPoint {
  /**
   * ISO timestamp or date string
   */
  timestamp: string;
  /**
   * Value at this point in time
   */
  value: number;
  /**
   * Optional label for this point
   */
  label?: string;
}

export interface TimelineMilestone {
  /**
   * ISO timestamp for milestone
   */
  timestamp: string;
  /**
   * Milestone label
   */
  label: string;
  /**
   * Description
   */
  description?: string;
  /**
   * Visual style
   */
  type?: 'success' | 'warning' | 'info';
}

export interface TimelineVizProps {
  /**
   * Primary data series
   */
  data: TimelineDataPoint[];
  /**
   * Optional baseline/comparison data
   */
  baselineData?: TimelineDataPoint[];
  /**
   * Milestones to annotate
   */
  milestones?: TimelineMilestone[];
  /**
   * Y-axis label
   */
  yAxisLabel?: string;
  /**
   * Y-axis unit
   */
  unit?: string;
  /**
   * Chart height
   */
  height?: string | number;
  /**
   * Enable zoom/brush
   */
  enableZoom?: boolean;
  /**
   * Show area fill
   */
  showArea?: boolean;
  /**
   * Smooth curve
   */
  smooth?: boolean;
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

export const TimelineViz = React.forwardRef<HTMLDivElement, TimelineVizProps>(
  (
    {
      data,
      baselineData,
      milestones = [],
      yAxisLabel = 'Emissions',
      unit = 'kg CO₂e',
      height = '500px',
      enableZoom = true,
      showArea = true,
      smooth = true,
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

    // Build ECharts option
    const chartOption: EChartsOption = React.useMemo(() => {
      // Prepare series data
      const series: any[] = [
        {
          name: 'Actual',
          type: 'line',
          smooth,
          data: data.map((d) => [d.timestamp, d.value]),
          itemStyle: {
            color: 'var(--color-baseline)',
          },
          lineStyle: {
            width: 3,
          },
          areaStyle: showArea
            ? {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                    { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
                  ],
                },
              }
            : undefined,
          emphasis: {
            focus: 'series',
          },
        },
      ];

      // Add baseline if provided
      if (baselineData && baselineData.length > 0) {
        series.push({
          name: 'Baseline',
          type: 'line',
          smooth,
          data: baselineData.map((d) => [d.timestamp, d.value]),
          itemStyle: {
            color: 'var(--carbon-neutral)',
          },
          lineStyle: {
            type: 'dashed',
            width: 2,
          },
          emphasis: {
            focus: 'series',
          },
        });
      }

      // Build milestone mark points
      const milestoneMarkPoints = milestones.map((m) => {
        const typeColors = {
          success: 'var(--carbon-low)',
          warning: 'var(--carbon-moderate)',
          info: 'var(--interactive-primary)',
        };

        return {
          name: m.label,
          coord: [m.timestamp, 0], // Will be positioned at x-axis
          value: m.label,
          itemStyle: {
            color: typeColors[m.type || 'info'],
          },
          label: {
            show: true,
            position: 'top',
            formatter: m.label,
            fontSize: 11,
            color: 'var(--text-secondary)',
          },
        };
      });

      const option: EChartsOption = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: 'var(--surface-elevated)',
            },
          },
          formatter: (params: any) => {
            if (!Array.isArray(params)) return '';

            const date = new Date(params[0].value[0]).toLocaleDateString();
            let tooltip = `<strong>${date}</strong><br/>`;

            params.forEach((p: any) => {
              const value = p.value[1].toFixed(2);
              tooltip += `${p.marker} ${p.seriesName}: ${value} ${unit}<br/>`;
            });

            return tooltip;
          },
        },
        legend: {
          data: baselineData ? ['Actual', 'Baseline'] : ['Actual'],
          top: 10,
          textStyle: {
            color: 'var(--text-primary)',
          },
        },
        grid: {
          left: '10%',
          right: '10%',
          bottom: enableZoom ? '20%' : '10%',
          top: '15%',
          containLabel: true,
        },
        xAxis: {
          type: 'time',
          boundaryGap: false,
          axisLine: {
            lineStyle: {
              color: 'var(--border-default)',
            },
          },
          axisLabel: {
            color: 'var(--text-secondary)',
            formatter: (value: number) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              });
            },
          },
          splitLine: {
            show: false,
          },
        },
        yAxis: {
          type: 'value',
          name: `${yAxisLabel} (${unit})`,
          nameLocation: 'middle',
          nameGap: 50,
          nameTextStyle: {
            color: 'var(--text-secondary)',
            fontSize: 12,
          },
          axisLine: {
            lineStyle: {
              color: 'var(--border-default)',
            },
          },
          axisLabel: {
            color: 'var(--text-secondary)',
            formatter: (value: number) => {
              if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}k`;
              }
              return value.toString();
            },
          },
          splitLine: {
            lineStyle: {
              color: 'var(--border-subtle)',
            },
          },
        },
        series,
        animation: true,
        animationDuration: 1000,
        animationEasing: 'cubicOut',
      };

      // Add data zoom if enabled
      if (enableZoom) {
        option.dataZoom = [
          {
            type: 'slider',
            show: true,
            xAxisIndex: 0,
            start: 0,
            end: 100,
            height: 30,
            bottom: 10,
            borderColor: 'var(--border-default)',
            fillerColor: 'rgba(59, 130, 246, 0.2)',
            handleStyle: {
              color: 'var(--interactive-primary)',
            },
            textStyle: {
              color: 'var(--text-secondary)',
            },
          },
          {
            type: 'inside',
            xAxisIndex: 0,
            start: 0,
            end: 100,
          },
        ];
      }

      // Add milestones as mark points on first series
      if (milestones.length > 0 && series.length > 0) {
        series[0].markPoint = {
          data: milestoneMarkPoints,
          symbol: 'pin',
          symbolSize: 50,
        };
      }

      return option;
    }, [
      data,
      baselineData,
      milestones,
      yAxisLabel,
      unit,
      enableZoom,
      showArea,
      smooth,
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
          text: 'Loading timeline...',
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

    const styleObject = React.useMemo(
      () => ({
        height: typeof height === 'number' ? `${height}px` : height,
      }),
      [height]
    );

    return (
      <div
        ref={chartRef}
        style={styleObject}
        className={cn('relative', className)}
        role="img"
        aria-label="Timeline visualization showing historical carbon emissions"
      />
    );
  }
);

TimelineViz.displayName = 'TimelineViz';
