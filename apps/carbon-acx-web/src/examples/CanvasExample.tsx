/**
 * Canvas Example - Demonstration of new architecture
 *
 * Shows how all components work together:
 * - CanvasZone layout system
 * - StoryScene narrative flow
 * - HeroChart visualization
 * - Zustand state management
 * - XState journey orchestration
 */

import * as React from 'react';
import type { EChartsOption } from 'echarts';
import { CanvasZone } from '../components/canvas/CanvasZone';
import { StoryScene } from '../components/canvas/StoryScene';
import { HeroChart } from '../components/viz/HeroChart';
import { Button } from '../components/system/Button';
import { useJourneyMachine } from '../hooks/useJourneyMachine';
import { useAppStore } from '../hooks/useAppStore';
import { ArrowRight, TrendingDown } from 'lucide-react';

export default function CanvasExample() {
  const {
    currentScene,
    isOnboarding,
    isExplore,
    completeOnboarding,
    viewInsights,
  } = useJourneyMachine();

  const totalEmissions = useAppStore((state) => state.getTotalEmissions());

  // Sample ECharts configuration
  const chartOption: EChartsOption = React.useMemo(
    () => ({
      title: {
        text: 'Carbon Emissions Overview',
        left: 'center',
        top: 20,
        textStyle: {
          fontSize: 24,
          fontWeight: 600,
          color: 'var(--text-primary)',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        axisLine: {
          lineStyle: {
            color: 'var(--border-default)',
          },
        },
        axisLabel: {
          color: 'var(--text-secondary)',
        },
      },
      yAxis: {
        type: 'value',
        name: 'kg CO₂e',
        nameTextStyle: {
          color: 'var(--text-secondary)',
        },
        axisLine: {
          lineStyle: {
            color: 'var(--border-default)',
          },
        },
        axisLabel: {
          color: 'var(--text-secondary)',
        },
        splitLine: {
          lineStyle: {
            color: 'var(--border-subtle)',
          },
        },
      },
      series: [
        {
          name: 'Actual Emissions',
          type: 'line',
          smooth: true,
          data: [420, 380, 350, 340, 320, 300],
          itemStyle: {
            color: 'var(--color-baseline)',
          },
          areaStyle: {
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
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: 'var(--carbon-moderate)',
              type: 'dashed',
            },
            label: {
              position: 'end',
              formatter: 'Target: 250 kg',
            },
            data: [{ yAxis: 250 }],
          },
        },
        {
          name: 'Goal',
          type: 'line',
          smooth: true,
          data: [420, 380, 340, 300, 280, 250],
          itemStyle: {
            color: 'var(--color-goal)',
          },
          lineStyle: {
            type: 'dashed',
          },
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    }),
    []
  );

  return (
    <div className="min-h-screen">
      {/* Onboarding Scene */}
      {isOnboarding && (
        <StoryScene
          scene="onboarding"
          title="Welcome to Carbon ACX"
          description="Get started with your carbon literacy journey"
          layout="fullscreen"
        >
          <div className="max-w-2xl mx-auto text-center space-y-6 p-8">
            <h1 className="text-hero text-[var(--text-primary)]">
              Welcome to Carbon ACX
            </h1>
            <p className="text-[var(--font-size-lg)] text-[var(--text-secondary)]">
              Transform abstract carbon data into actionable insights with our
              immersive analytics platform.
            </p>
            <div className="flex gap-4 justify-center mt-8">
              <Button
                size="lg"
                onClick={completeOnboarding}
                rightIcon={<ArrowRight className="h-5 w-5" />}
              >
                Get Started
              </Button>
              <Button size="lg" variant="outline">
                Take Tour
              </Button>
            </div>
          </div>
        </StoryScene>
      )}

      {/* Explore Scene with Canvas Layout */}
      {isExplore && (
        <StoryScene
          scene="explore"
          title="Explore Your Emissions"
          description="Discover patterns and opportunities for reduction"
          layout="canvas"
        >
          {/* Hero Zone - Primary Visualization */}
          <CanvasZone
            zoneId="hero"
            zone="hero"
            padding="lg"
            interactionMode="explore"
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[var(--font-size-3xl)] font-bold text-[var(--text-primary)]">
                    Emissions Trend
                  </h2>
                  <p className="text-[var(--text-secondary)] mt-1">
                    6-month historical view with goal tracking
                  </p>
                </div>
                <Button
                  variant="insight"
                  onClick={viewInsights}
                  rightIcon={<TrendingDown className="h-4 w-4" />}
                >
                  View Insights
                </Button>
              </div>
              <HeroChart option={chartOption} height="500px" />
            </div>
          </CanvasZone>

          {/* Insight Zone - Supporting Context */}
          <CanvasZone
            zoneId="insight"
            zone="insight"
            padding="md"
            interactionMode="compare"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[var(--font-size-lg)] font-semibold text-[var(--text-primary)]">
                  Quick Stats
                </h3>
                <p className="text-[var(--font-size-sm)] text-[var(--text-secondary)] mt-1">
                  Current month performance
                </p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-[var(--font-size-2xl)] font-bold carbon-low">
                    -28%
                  </div>
                  <div className="text-[var(--font-size-xs)] text-[var(--text-tertiary)] uppercase">
                    vs Last Month
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[var(--font-size-2xl)] font-bold text-[var(--text-primary)]">
                    {totalEmissions > 0
                      ? `${(totalEmissions / 1000).toFixed(1)}t`
                      : '0t'}
                  </div>
                  <div className="text-[var(--font-size-xs)] text-[var(--text-tertiary)] uppercase">
                    Total CO₂e
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[var(--font-size-2xl)] font-bold carbon-moderate">
                    250kg
                  </div>
                  <div className="text-[var(--font-size-xs)] text-[var(--text-tertiary)] uppercase">
                    Monthly Goal
                  </div>
                </div>
              </div>
            </div>
          </CanvasZone>

          {/* Detail Zone - Collapsible Drill-down */}
          <CanvasZone
            zoneId="detail"
            zone="detail"
            padding="sm"
            collapsible
            interactionMode="drill"
          >
            <div className="text-[var(--font-size-sm)] text-[var(--text-secondary)]">
              <p>Click on chart elements for detailed breakdowns and source attribution.</p>
            </div>
          </CanvasZone>
        </StoryScene>
      )}

      {/* Dev Info */}
      <div className="fixed bottom-4 right-4 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-lg)] p-3 shadow-[var(--shadow-lg)] text-[var(--font-size-xs)]">
        <div className="font-mono">
          <div className="font-semibold mb-1">Journey State:</div>
          <div className="text-[var(--text-secondary)]">{currentScene}</div>
        </div>
      </div>
    </div>
  );
}
