/**
 * ExplorePage - Interactive emissions exploration
 *
 * Simplified from ExploreScene - removed CanvasZone, StoryScene, useJourneyMachine.
 * Will be enhanced with 3D DataUniverse visualization in Phase 2.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { TimelineViz } from '../components/viz/TimelineViz';
import { ComparisonOverlay } from '../components/viz/ComparisonOverlay';
import { Button } from '../components/system/Button';
import { useAppStore } from '../hooks/useAppStore';
import { TrendingUp, GitCompare, Filter, Download, Lightbulb, Globe } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { exportToCSV } from '../lib/exportUtils';

// Use wrapper that prevents Three.js imports during SSR/build
import { DataUniverse } from '../components/viz/DataUniverseWrapper';

type ExploreMode = 'timeline' | 'comparison' | 'universe';

interface Milestone {
  timestamp: string;
  label: string;
  value: number;
  description?: string;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<ExploreMode>('universe');
  const [selectedLayers, setSelectedLayers] = React.useState<string[]>([]);
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedActivity, setSelectedActivity] = React.useState<any>(null);

  const profile = useAppStore((state) => state.profile);
  const profileLayers = useAppStore((state) => state.profile.layers);
  const getTotalEmissions = useAppStore((state) => state.getTotalEmissions);
  const activities = useAppStore((state) => state.activities);
  const emissionsHistory = useAppStore((state) => state.profile.emissionsHistory);

  const totalEmissions = getTotalEmissions();

  // Use real emissions history or generate mock data if history is empty
  const timelineData = React.useMemo(() => {
    const milestones: Milestone[] = [];

    // If we have real history, use it
    if (emissionsHistory.length > 0) {
      const dataPoints = emissionsHistory.map((snapshot) => ({
        timestamp: snapshot.timestamp.split('T')[0],
        value: snapshot.totalEmissions,
        breakdown: snapshot.breakdown || {},
      }));

      // Add milestones for first and last entries
      if (dataPoints.length > 0) {
        milestones.push({
          timestamp: dataPoints[0].timestamp,
          label: 'Baseline Established',
          value: dataPoints[0].value,
          description: 'Initial carbon footprint calculated',
        });

        if (dataPoints.length > 1) {
          const lastPoint = dataPoints[dataPoints.length - 1];
          milestones.push({
            timestamp: lastPoint.timestamp,
            label: 'Current',
            value: lastPoint.value,
            description: 'Latest emissions data',
          });
        }
      }

      return { dataPoints, milestones };
    }

    // Fallback: Generate sample timeline data if no history
    const now = new Date();
    const dataPoints = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dateStr = date.toISOString().split('T')[0];

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

      if (i === 11) {
        milestones.push({
          timestamp: dateStr,
          label: 'Baseline Established',
          value,
          description: 'Initial carbon footprint calculated',
        });
      }

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
  }, [emissionsHistory, totalEmissions]);

  // Generate comparison data
  const comparisonData = React.useMemo(() => {
    if (selectedLayers.length === 0) {
      const globalAverage = 4500;

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
            color: [
              'var(--carbon-low)',
              'var(--carbon-moderate)',
              'var(--carbon-high)',
              'var(--carbon-neutral)',
            ],
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
            color: [
              'var(--carbon-low)',
              'var(--carbon-moderate)',
              'var(--carbon-high)',
              'var(--carbon-neutral)',
            ],
          },
        ],
      };

      return { leftOption, rightOption };
    }

    const layer1 = profileLayers.find((l) => l.id === selectedLayers[0]);
    const layer2 = profileLayers.find((l) => l.id === selectedLayers[1]);

    if (!layer1 || !layer2) {
      return null;
    }

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
    try {
      exportToCSV(activities, totalEmissions);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] p-[var(--space-8)]">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-[var(--space-8)]">
        <div className="flex items-center justify-between mb-[var(--space-6)]">
          <h1
            className="font-bold"
            style={{
              fontSize: 'var(--font-size-3xl)',
              color: 'var(--text-primary)',
            }}
          >
            Explore Emissions
          </h1>

          <div className="flex items-center gap-[var(--space-2)]">
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
              onClick={() => navigate('/insights')}
              icon={<Lightbulb className="w-4 h-4" />}
            >
              View Insights
            </Button>
          </div>
        </div>

        {/* Mode toggle */}
        <div
          className="inline-flex rounded-[var(--radius-md)] p-1"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
          }}
        >
          <button
            onClick={() => setMode('universe')}
            className="px-4 py-2 rounded-[var(--radius-sm)] flex items-center gap-2 transition-colors"
            style={{
              backgroundColor: mode === 'universe' ? 'var(--interactive-primary)' : 'transparent',
              color: mode === 'universe' ? 'white' : 'var(--text-secondary)',
            }}
          >
            <Globe className="w-4 h-4" />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>3D Universe</span>
          </button>
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
              backgroundColor:
                mode === 'comparison' ? 'var(--interactive-primary)' : 'transparent',
              color: mode === 'comparison' ? 'white' : 'var(--text-secondary)',
            }}
          >
            <GitCompare className="w-4 h-4" />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>Compare</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto">
        {/* 3D Universe mode */}
        {mode === 'universe' && (
          <div
            className="rounded-[var(--radius-lg)] overflow-hidden"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
              height: '600px',
            }}
          >
            <DataUniverse
              totalEmissions={totalEmissions}
              activities={activities.map((a) => ({
                id: a.id,
                name: a.name,
                annualEmissions: a.annualEmissions,
                category: a.category ?? undefined,
              }))}
              onActivityClick={setSelectedActivity}
            />
          </div>
        )}

        {/* Timeline mode */}
        {mode === 'timeline' && (
          <div
            className="p-[var(--space-6)] rounded-[var(--radius-lg)]"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
            <TimelineViz
              data={timelineData.dataPoints}
              milestones={timelineData.milestones}
              height="500px"
              enableZoom={true}
            />
          </div>
        )}

        {/* Comparison mode */}
        {mode === 'comparison' && (
          <div
            className="p-[var(--space-6)] rounded-[var(--radius-lg)]"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
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
        )}

        {/* Stats bar */}
        <div
          className="mt-[var(--space-6)] p-[var(--space-6)] rounded-[var(--radius-lg)]"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className="font-semibold mb-1"
                style={{
                  fontSize: 'var(--font-size-base)',
                  color: 'var(--text-primary)',
                }}
              >
                {mode === 'universe' && selectedActivity
                  ? selectedActivity.name
                  : 'Total Emissions'}
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-bold"
                  style={{
                    fontSize: 'var(--font-size-3xl)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {mode === 'universe' && selectedActivity
                    ? (selectedActivity.annualEmissions / 1000).toFixed(2)
                    : (totalEmissions / 1000).toFixed(1)}
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

            {mode === 'universe' && (
              <div className="text-right">
                <div
                  className="mb-1"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Activities
                </div>
                <div
                  className="font-bold"
                  style={{
                    fontSize: 'var(--font-size-xl)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {activities.length}
                </div>
              </div>
            )}

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
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div
            className="mt-[var(--space-4)] p-[var(--space-6)] rounded-[var(--radius-lg)]"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h4
              className="font-semibold mb-[var(--space-4)]"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-primary)',
              }}
            >
              Filter Options
            </h4>

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
        )}
      </div>
    </div>
  );
}
