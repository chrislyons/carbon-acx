/**
 * ExploreScene - Interactive emissions exploration
 *
 * Two visualization modes:
 * 1. Timeline - Historical emissions trends with milestones
 * 2. Comparison - Side-by-side layer comparison
 *
 * Features:
 * - Canvas-first layout with zone switching
 * - TimelineViz and ComparisonOverlay integration
 * - Layer filtering and toggling
 * - Design token consistency
 * - Responsive interactions
 *
 * Phase 2 Week 4 implementation (Phase 1 Week 3 foundation)
 */

import * as React from 'react';
import { CanvasZone } from '../canvas/CanvasZone';
import { StoryScene } from '../canvas/StoryScene';
import { TransitionWrapper } from '../canvas/TransitionWrapper';
import { TimelineViz } from '../viz/TimelineViz';
import { ComparisonOverlay } from '../viz/ComparisonOverlay';
import { Button } from '../system/Button';
import { useAppStore } from '../../hooks/useAppStore';
import { useJourneyMachine } from '../../hooks/useJourneyMachine';
import { TrendingUp, GitCompare, Filter, Download, Lightbulb } from 'lucide-react';
import type { EChartsOption } from 'echarts';

// ============================================================================
// Types
// ============================================================================

export interface ExploreSceneProps {
  show: boolean;
  initialMode?: 'timeline' | 'comparison';
}

type ExploreMode = 'timeline' | 'comparison';

interface Milestone {
  timestamp: string;
  label: string;
  value: number;
  description?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ExploreScene({ show, initialMode = 'timeline' }: ExploreSceneProps) {
  const [mode, setMode] = React.useState<ExploreMode>(initialMode);
  const [selectedLayers, setSelectedLayers] = React.useState<string[]>([]);
  const [showFilters, setShowFilters] = React.useState(false);

  const { viewInsights } = useJourneyMachine();

  const profile = useAppStore((state) => state.profile);
  const profileLayers = useAppStore((state) => state.profile.layers);
  const getTotalEmissions = useAppStore((state) => state.getTotalEmissions);

  const totalEmissions = getTotalEmissions();

  // Generate sample timeline data (in real app, would fetch from history)
  const timelineData = React.useMemo(() => {
    const now = new Date();
    const dataPoints = [];
    const milestones: Milestone[] = [];

    // Generate 12 months of data
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dateStr = date.toISOString().split('T')[0];

      // Simulate slight variation over time
      const variation = Math.sin(i / 2) * 500;
      const value = Math.max(0, totalEmissions + variation);

      dataPoints.push({
        timestamp: dateStr,
        value,
        breakdown: {
          commute: value * 0.25,
          diet: value * 0.35,
          energy: value * 0.25,
          shopping: value * 0.15,
        },
      });

      // Add milestone at baseline
      if (i === 11) {
        milestones.push({
          timestamp: dateStr,
          label: 'Baseline Established',
          value,
          description: 'Initial carbon footprint calculated',
        });
      }

      // Add goal milestone
      if (i === 0) {
        milestones.push({
          timestamp: dateStr,
          label: 'Current',
          value,
          description: 'Latest emissions data',
        });
      }
    }

    return { dataPoints, milestones };
  }, [totalEmissions]);

  // Generate comparison data
  const comparisonData = React.useMemo(() => {
    // If no layers selected, compare against global average
    if (selectedLayers.length === 0) {
      const globalAverage = 4500; // kg CO₂/year

      const leftOption: EChartsOption = {
        title: { text: 'Your Emissions', left: 'center', top: 10 },
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            data: [
              { value: totalEmissions * 0.25, name: 'Commute' },
              { value: totalEmissions * 0.35, name: 'Diet' },
              { value: totalEmissions * 0.25, name: 'Energy' },
              { value: totalEmissions * 0.15, name: 'Shopping' },
            ],
            color: ['var(--carbon-low)', 'var(--carbon-moderate)', 'var(--carbon-high)', 'var(--carbon-neutral)'],
          },
        ],
      };

      const rightOption: EChartsOption = {
        title: { text: 'Global Average', left: 'center', top: 10 },
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            data: [
              { value: globalAverage * 0.2, name: 'Commute' },
              { value: globalAverage * 0.3, name: 'Diet' },
              { value: globalAverage * 0.3, name: 'Energy' },
              { value: globalAverage * 0.2, name: 'Shopping' },
            ],
            color: ['var(--carbon-low)', 'var(--carbon-moderate)', 'var(--carbon-high)', 'var(--carbon-neutral)'],
          },
        ],
      };

      return { leftOption, rightOption };
    }

    // Compare selected layers
    const layer1 = profileLayers.find((l) => l.id === selectedLayers[0]);
    const layer2 = profileLayers.find((l) => l.id === selectedLayers[1]);

    if (!layer1 || !layer2) {
      return null;
    }

    const layer1Emissions = layer1.activities.reduce((sum, a) => sum + a.annualEmissions, 0);
    const layer2Emissions = layer2.activities.reduce((sum, a) => sum + a.annualEmissions, 0);

    const leftOption: EChartsOption = {
      title: { text: layer1.name, left: 'center', top: 10 },
      series: [
        {
          type: 'bar',
          data: layer1.activities.map((a) => ({
            value: a.annualEmissions,
            name: a.name,
          })),
          color: layer1.color,
        },
      ],
      xAxis: { type: 'category', data: layer1.activities.map((a) => a.name) },
      yAxis: { type: 'value' },
    };

    const rightOption: EChartsOption = {
      title: { text: layer2.name, left: 'center', top: 10 },
      series: [
        {
          type: 'bar',
          data: layer2.activities.map((a) => ({
            value: a.annualEmissions,
            name: a.name,
          })),
          color: layer2.color,
        },
      ],
      xAxis: { type: 'category', data: layer2.activities.map((a) => a.name) },
      yAxis: { type: 'value' },
    };

    return { leftOption, rightOption };
  }, [selectedLayers, profileLayers, totalEmissions]);

  const handleExport = () => {
    // Would trigger download of current visualization
    console.log('Exporting visualization...');
  };

  if (!show) return null;

  return (
    <StoryScene scene="explore" layout="canvas" title="Explore Emissions">
      <CanvasZone zone="hero" zoneId="explore-hero" padding="lg" interactionMode="explore">
        {/* Header controls */}
        <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-10">
          {/* Mode toggle */}
          <div
            className="inline-flex rounded-[var(--radius-md)] p-1"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
            <button
              onClick={() => setMode('timeline')}
              className="px-4 py-2 rounded-[var(--radius-sm)] flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: mode === 'timeline' ? 'var(--interactive-primary)' : 'transparent',
                color: mode === 'timeline' ? 'white' : 'var(--text-secondary)',
              }}
            >
              <TrendingUp className="w-4 h-4" />
              <span style={{ fontSize: 'var(--font-size-sm)' }}>Timeline</span>
            </button>
            <button
              onClick={() => setMode('comparison')}
              className="px-4 py-2 rounded-[var(--radius-sm)] flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: mode === 'comparison' ? 'var(--interactive-primary)' : 'transparent',
                color: mode === 'comparison' ? 'white' : 'var(--text-secondary)',
              }}
            >
              <GitCompare className="w-4 h-4" />
              <span style={{ fontSize: 'var(--font-size-sm)' }}>Compare</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              icon={<Filter className="w-4 h-4" />}
            >
              Filters
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              icon={<Download className="w-4 h-4" />}
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={viewInsights}
              icon={<Lightbulb className="w-4 h-4" />}
            >
              View Insights
            </Button>
          </div>
        </div>

        {/* Main visualization area */}
        <div className="min-h-[80vh] flex items-center justify-center px-[var(--space-8)] pt-24">
          {/* Timeline mode */}
          <TransitionWrapper type="fade" show={mode === 'timeline'}>
            <div className="w-full max-w-6xl">
              <TimelineViz
                data={timelineData.dataPoints}
                milestones={timelineData.milestones}
                height="500px"
                enableZoom={true}
              />
            </div>
          </TransitionWrapper>

          {/* Comparison mode */}
          <TransitionWrapper type="fade" show={mode === 'comparison'}>
            <div className="w-full max-w-6xl">
              {comparisonData ? (
                <ComparisonOverlay
                  baseline={{ label: 'Baseline', option: comparisonData.leftOption }}
                  comparison={{ label: 'Comparison', option: comparisonData.rightOption }}
                  height="500px"
                />
              ) : (
                <div className="text-center p-12">
                  <p
                    style={{
                      fontSize: 'var(--font-size-lg)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Select two layers to compare, or view comparison with global average
                  </p>
                </div>
              )}
            </div>
          </TransitionWrapper>
        </div>
      </CanvasZone>

      {/* Insight bar */}
      <CanvasZone zone="insight" zoneId="explore-insight" padding="md" interactionMode="compare">
        <div className="flex items-center justify-between">
          <div>
            <div
              className="font-semibold mb-1"
              style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--text-primary)',
              }}
            >
              Total Emissions
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-3xl)',
                  color: 'var(--text-primary)',
                }}
              >
                {(totalEmissions / 1000).toFixed(1)}
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-base)',
                  color: 'var(--text-secondary)',
                }}
              >
                tonnes CO₂/year
              </span>
            </div>
          </div>

          {mode === 'timeline' && timelineData.dataPoints.length > 1 && (
            <div className="text-right">
              <div
                className="mb-1"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                Change (12mo)
              </div>
              <div
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-xl)',
                  color: 'var(--carbon-low)',
                }}
              >
                -5.2%
              </div>
            </div>
          )}
        </div>
      </CanvasZone>

      {/* Detail drawer (collapsible) */}
      {showFilters && (
        <CanvasZone zone="detail" zoneId="explore-detail" padding="sm" collapsible interactionMode="drill">
          <div className="space-y-4">
            <h4
              className="font-semibold"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-primary)',
              }}
            >
              Filter Options
            </h4>

            {/* Layer selector for comparison mode */}
            {mode === 'comparison' && profileLayers.length > 0 && (
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Select layers to compare:
                </label>
                <div className="space-y-2">
                  {profileLayers.map((layer) => (
                    <label key={layer.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedLayers.includes(layer.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLayers((prev) => [...prev.slice(0, 1), layer.id]);
                          } else {
                            setSelectedLayers((prev) => prev.filter((id) => id !== layer.id));
                          }
                        }}
                        disabled={selectedLayers.length >= 2 && !selectedLayers.includes(layer.id)}
                      />
                      <span
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {layer.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Date range for timeline mode */}
            {mode === 'timeline' && (
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Date Range:
                </label>
                <select
                  className="w-full px-3 py-2 rounded-[var(--radius-md)]"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  <option>Last 12 months</option>
                  <option>Last 6 months</option>
                  <option>Last 3 months</option>
                  <option>All time</option>
                </select>
              </div>
            )}
          </div>
        </CanvasZone>
      )}
    </StoryScene>
  );
}
