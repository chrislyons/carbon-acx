/**
 * ExploreScene - Domain Component
 *
 * Interactive exploration of carbon emissions by sector and time.
 * Maps to 'explore' state in XState journey machine.
 *
 * Features:
 * - Layer-based breakdown with TimelineViz
 * - Comparison mode (baseline vs current)
 * - Drill-down into specific activities
 * - Shareable insights
 */

import * as React from 'react';
import { StoryScene } from '../components/canvas/StoryScene';
import { CanvasZone } from '../components/canvas/CanvasZone';
import { TransitionWrapper } from '../components/canvas/TransitionWrapper';
import { Button } from '../components/system/Button';
import { TimelineViz, type TimelineDataPoint } from '../components/viz/TimelineViz';
import { ComparisonOverlay, type ComparisonData } from '../components/viz/ComparisonOverlay';
import { useJourneyMachine } from '../hooks/useJourneyMachine';
import { useAppStore } from '../hooks/useAppStore';
import { TrendingDown, Share2, Filter, Lightbulb } from 'lucide-react';
import type { EChartsOption } from 'echarts';

export interface ExploreSceneProps {
  /**
   * Show scene
   */
  show?: boolean;
  /**
   * Initial view mode
   */
  initialMode?: 'timeline' | 'comparison';
}

export const ExploreScene: React.FC<ExploreSceneProps> = ({
  show = true,
  initialMode = 'timeline',
}) => {
  const { viewInsights } = useJourneyMachine();
  const { activities, layers, getTotalEmissions } = useAppStore();

  const [viewMode, setViewMode] = React.useState<'timeline' | 'comparison'>(
    initialMode
  );
  const [selectedLayer, setSelectedLayer] = React.useState<string | null>(null);
  const [showComparison, setShowComparison] = React.useState(false);

  const totalEmissions = getTotalEmissions();

  // Generate mock timeline data (in production, this would come from actual data)
  const timelineData: TimelineDataPoint[] = React.useMemo(() => {
    const months = ['2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'];
    return months.map((month, index) => ({
      timestamp: `${month}-01`,
      value: 420 - index * 20, // Decreasing trend
      label: month,
    }));
  }, []);

  // Generate baseline data for comparison
  const baselineData: TimelineDataPoint[] = React.useMemo(() => {
    const months = ['2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'];
    return months.map((month) => ({
      timestamp: `${month}-01`,
      value: 420, // Flat baseline
      label: month,
    }));
  }, []);

  // Generate comparison chart data
  const comparisonChartData: {
    baseline: ComparisonData;
    current: ComparisonData;
  } = React.useMemo(() => {
    const createPieOption = (
      data: { name: string; value: number }[]
    ): EChartsOption => ({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} kg CO₂e ({d}%)',
      },
      series: [
        {
          name: 'Emissions',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 8,
            borderColor: 'var(--surface-bg)',
            borderWidth: 2,
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}\n{d}%',
            color: 'var(--text-primary)',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
            },
          },
          data,
        },
      ],
    });

    return {
      baseline: {
        label: 'Last Month',
        option: createPieOption([
          { name: 'Energy', value: 180 },
          { name: 'Transport', value: 120 },
          { name: 'Goods', value: 80 },
          { name: 'Waste', value: 40 },
        ]),
        summary: {
          value: 420,
          unit: 'kg CO₂e',
          change: 0,
        },
      },
      current: {
        label: 'This Month',
        option: createPieOption([
          { name: 'Energy', value: 150 },
          { name: 'Transport', value: 100 },
          { name: 'Goods', value: 60 },
          { name: 'Waste', value: 30 },
        ]),
        summary: {
          value: 340,
          unit: 'kg CO₂e',
          change: -19.0, // -19% improvement
        },
      },
    };
  }, []);

  const handleViewInsights = () => {
    viewInsights();
  };

  const handleShare = () => {
    // In production, this would open a share dialog
    alert('Share functionality coming soon!');
  };

  const availableLayers = [
    { id: null, name: 'All Layers', icon: '📊' },
    { id: 'energy', name: 'Energy', icon: '⚡' },
    { id: 'transport', name: 'Transport', icon: '🚗' },
    { id: 'goods', name: 'Goods', icon: '📦' },
    { id: 'waste', name: 'Waste', icon: '♻️' },
  ];

  return (
    <StoryScene
      scene="explore"
      title="Explore Your Emissions"
      description="Discover patterns and opportunities for reduction"
      layout="canvas"
    >
      {/* Hero Zone - Main Visualization */}
      <CanvasZone
        zoneId="explore-hero"
        zone="hero"
        padding="lg"
        interactionMode="explore"
      >
        <TransitionWrapper type="story" show={show}>
          <div className="h-full flex flex-col">
            {/* Header with view mode toggle */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[var(--font-size-3xl)] font-bold text-[var(--text-primary)]">
                  {viewMode === 'timeline'
                    ? 'Emissions Over Time'
                    : 'Layer Comparison'}
                </h2>
                <p className="text-[var(--text-secondary)] mt-1">
                  {viewMode === 'timeline'
                    ? '6-month historical view with baseline'
                    : 'Compare this month vs last month by sector'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'timeline' ? 'primary' : 'outline'}
                  onClick={() => setViewMode('timeline')}
                >
                  Timeline
                </Button>
                <Button
                  variant={viewMode === 'comparison' ? 'primary' : 'outline'}
                  onClick={() => setViewMode('comparison')}
                >
                  Comparison
                </Button>
              </div>
            </div>

            {/* Visualization */}
            {viewMode === 'timeline' ? (
              <TimelineViz
                data={timelineData}
                baselineData={baselineData}
                yAxisLabel="Emissions"
                unit="kg CO₂e"
                height="100%"
                enableZoom
                showArea
                smooth
                milestones={[
                  {
                    timestamp: '2024-09-01',
                    label: 'Started tracking',
                    type: 'info',
                  },
                  {
                    timestamp: '2024-11-01',
                    label: 'Goal set',
                    type: 'success',
                  },
                ]}
              />
            ) : (
              <ComparisonOverlay
                baseline={comparisonChartData.baseline}
                comparison={comparisonChartData.current}
                orientation="horizontal"
                showDifference
                height="100%"
              />
            )}
          </div>
        </TransitionWrapper>
      </CanvasZone>

      {/* Insight Zone - Quick Stats & Actions */}
      <CanvasZone
        zoneId="explore-insight"
        zone="insight"
        padding="md"
        interactionMode="compare"
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-8">
            {/* Current total */}
            <div className="text-center">
              <div className="text-[var(--font-size-2xl)] font-bold carbon-low">
                -19%
              </div>
              <div className="text-[var(--font-size-xs)] text-[var(--text-tertiary)] uppercase">
                vs Last Month
              </div>
            </div>

            {/* Total emissions */}
            <div className="text-center">
              <div className="text-[var(--font-size-2xl)] font-bold text-[var(--text-primary)]">
                {totalEmissions > 0
                  ? `${(totalEmissions / 1000).toFixed(1)}t`
                  : '340kg'}
              </div>
              <div className="text-[var(--font-size-xs)] text-[var(--text-tertiary)] uppercase">
                This Month
              </div>
            </div>

            {/* Activity count */}
            <div className="text-center">
              <div className="text-[var(--font-size-2xl)] font-bold text-[var(--text-primary)]">
                {activities.length}
              </div>
              <div className="text-[var(--font-size-xs)] text-[var(--text-tertiary)] uppercase">
                Activities
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="insight"
              onClick={handleViewInsights}
              rightIcon={<Lightbulb className="h-4 w-4" />}
            >
              View Insights
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              rightIcon={<Share2 className="h-4 w-4" />}
            >
              Share
            </Button>
          </div>
        </div>
      </CanvasZone>

      {/* Detail Zone - Layer Filters */}
      <CanvasZone
        zoneId="explore-detail"
        zone="detail"
        padding="sm"
        collapsible
        interactionMode="drill"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[var(--font-size-md)] font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter by Layer
            </h4>
            {selectedLayer && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedLayer(null)}
              >
                Clear
              </Button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {availableLayers.map((layer) => (
              <button
                key={layer.id || 'all'}
                onClick={() => setSelectedLayer(layer.id)}
                className="px-3 py-1.5 rounded-[var(--radius-md)] text-[var(--font-size-sm)] transition-all duration-200"
                style={{
                  backgroundColor:
                    selectedLayer === layer.id
                      ? 'var(--interactive-primary)'
                      : 'var(--surface-elevated)',
                  color:
                    selectedLayer === layer.id
                      ? 'white'
                      : 'var(--text-primary)',
                  border:
                    selectedLayer === layer.id
                      ? 'none'
                      : '1px solid var(--border-default)',
                }}
              >
                <span className="mr-1.5">{layer.icon}</span>
                {layer.name}
              </button>
            ))}
          </div>

          {selectedLayer && (
            <TransitionWrapper type="slide-up" show={!!selectedLayer}>
              <p className="text-[var(--font-size-sm)] text-[var(--text-secondary)]">
                Showing data for <strong>{availableLayers.find((l) => l.id === selectedLayer)?.name}</strong> layer
              </p>
            </TransitionWrapper>
          )}
        </div>
      </CanvasZone>
    </StoryScene>
  );
};

ExploreScene.displayName = 'ExploreScene';
