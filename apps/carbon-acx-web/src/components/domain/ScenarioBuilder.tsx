/**
 * ScenarioBuilder - What-if modeling for emissions reduction
 *
 * Features:
 * - Create/edit/delete scenarios
 * - Modify activity quantities or add/remove activities
 * - Side-by-side baseline vs scenario comparison
 * - Impact calculations with visual diff
 * - Save scenarios for later comparison
 * - Design token consistency
 *
 * Phase 2 Week 5 implementation
 */

import * as React from 'react';
import { Button } from '../system/Button';
import { Input } from '../system/Input';
import { ComparisonOverlay } from '../viz/ComparisonOverlay';
import { TransitionWrapper } from '../canvas/TransitionWrapper';
import { Plus, Minus, Save, X, RefreshCw, TrendingDown } from 'lucide-react';
import type { EChartsOption } from 'echarts';

// ============================================================================
// Types
// ============================================================================

export interface ActivityChange {
  activityId: string;
  activityName: string;
  originalQuantity: number;
  newQuantity: number;
  quantityDiff: number;
  emissionsDiff: number;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  changes: ActivityChange[];
  totalImpact: number; // kg CO₂ saved (positive) or added (negative)
  percentageChange: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioBuilderProps {
  baselineEmissions: number;
  activities: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    carbonIntensity: number;
    annualEmissions: number;
  }>;
  onSave: (scenario: Scenario) => void;
  onCancel?: () => void;
  existingScenario?: Scenario;
}

// ============================================================================
// Component
// ============================================================================

export function ScenarioBuilder({
  baselineEmissions,
  activities,
  onSave,
  onCancel,
  existingScenario,
}: ScenarioBuilderProps) {
  const [scenarioName, setScenarioName] = React.useState(
    existingScenario?.name || `Scenario ${new Date().toLocaleDateString()}`
  );
  const [scenarioDescription, setScenarioDescription] = React.useState(
    existingScenario?.description || ''
  );
  const [activityQuantities, setActivityQuantities] = React.useState<Record<string, number>>(
    () => {
      const initial: Record<string, number> = {};
      activities.forEach((a) => {
        const existingChange = existingScenario?.changes.find((c) => c.activityId === a.id);
        initial[a.id] = existingChange?.newQuantity ?? a.quantity;
      });
      return initial;
    }
  );

  // Calculate scenario impact
  const scenarioData = React.useMemo(() => {
    const changes: ActivityChange[] = [];
    let scenarioTotal = 0;

    activities.forEach((activity) => {
      const newQuantity = activityQuantities[activity.id] ?? activity.quantity;
      const newEmissions = newQuantity * activity.carbonIntensity;
      scenarioTotal += newEmissions;

      if (newQuantity !== activity.quantity) {
        changes.push({
          activityId: activity.id,
          activityName: activity.name,
          originalQuantity: activity.quantity,
          newQuantity,
          quantityDiff: newQuantity - activity.quantity,
          emissionsDiff: newEmissions - activity.annualEmissions,
        });
      }
    });

    const totalImpact = baselineEmissions - scenarioTotal;
    const percentageChange = (totalImpact / baselineEmissions) * 100;

    return {
      changes,
      scenarioTotal,
      totalImpact,
      percentageChange,
    };
  }, [activities, activityQuantities, baselineEmissions]);

  const handleQuantityChange = (activityId: string, newQuantity: number) => {
    setActivityQuantities((prev) => ({
      ...prev,
      [activityId]: Math.max(0, newQuantity),
    }));
  };

  const handleReset = () => {
    const initial: Record<string, number> = {};
    activities.forEach((a) => {
      initial[a.id] = a.quantity;
    });
    setActivityQuantities(initial);
  };

  const handleSave = () => {
    const scenario: Scenario = {
      id: existingScenario?.id || `scenario-${Date.now()}`,
      name: scenarioName,
      description: scenarioDescription,
      changes: scenarioData.changes,
      totalImpact: scenarioData.totalImpact,
      percentageChange: scenarioData.percentageChange,
      createdAt: existingScenario?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(scenario);
  };

  // Chart data for comparison
  const comparisonCharts = React.useMemo(() => {
    const baselineData = activities.map((a) => ({
      name: a.name,
      value: a.annualEmissions,
    }));

    const scenarioActivityData = activities.map((a) => {
      const newQuantity = activityQuantities[a.id] ?? a.quantity;
      return {
        name: a.name,
        value: newQuantity * a.carbonIntensity,
      };
    });

    const leftOption: EChartsOption = {
      title: {
        text: 'Baseline',
        left: 'center',
        top: 10,
        textStyle: {
          color: 'var(--text-primary)',
          fontSize: 16,
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} kg CO₂',
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: baselineData,
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          color: [
            'var(--carbon-high)',
            'var(--carbon-moderate)',
            'var(--carbon-low)',
            'var(--carbon-neutral)',
          ],
        },
      ],
    };

    const rightOption: EChartsOption = {
      title: {
        text: 'Scenario',
        left: 'center',
        top: 10,
        textStyle: {
          color: 'var(--text-primary)',
          fontSize: 16,
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} kg CO₂',
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: scenarioActivityData,
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
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
  }, [activities, activityQuantities]);

  const hasChanges = scenarioData.changes.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-[var(--space-6)]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-[var(--space-2)]">
          <Input
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            placeholder="Scenario name"
            className="text-[var(--font-size-2xl)] font-bold"
            style={{
              border: 'none',
              padding: 0,
              backgroundColor: 'transparent',
            }}
          />
          <Input
            value={scenarioDescription}
            onChange={(e) => setScenarioDescription(e.target.value)}
            placeholder="Description (optional)"
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
              border: 'none',
              padding: 0,
              backgroundColor: 'transparent',
            }}
          />
        </div>

        <div className="flex items-center gap-[var(--space-2)]">
          <Button variant="ghost" size="sm" onClick={handleReset} icon={<RefreshCw className="w-4 h-4" />}>
            Reset
          </Button>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} icon={<X className="w-4 h-4" />}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Impact Summary */}
      <TransitionWrapper type="slide-up" show={true} delay={100}>
        <div
          className="p-[var(--space-6)] rounded-[var(--radius-xl)]"
          style={{
            background: hasChanges && scenarioData.totalImpact > 0
              ? 'linear-gradient(135deg, var(--carbon-low-bg) 0%, var(--color-improvement-bg) 100%)'
              : 'var(--surface-elevated)',
            border: `2px solid ${hasChanges && scenarioData.totalImpact > 0 ? 'var(--carbon-low)' : 'var(--border-default)'}`,
          }}
        >
          <div className="grid grid-cols-3 gap-[var(--space-6)]">
            <div>
              <div
                className="mb-[var(--space-1)]"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                Baseline Emissions
              </div>
              <div
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-3xl)',
                  color: 'var(--text-primary)',
                }}
              >
                {(baselineEmissions / 1000).toFixed(1)}t
              </div>
            </div>

            <div>
              <div
                className="mb-[var(--space-1)]"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                Scenario Emissions
              </div>
              <div
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-3xl)',
                  color: 'var(--text-primary)',
                }}
              >
                {(scenarioData.scenarioTotal / 1000).toFixed(1)}t
              </div>
            </div>

            <div>
              <div
                className="mb-[var(--space-1)]"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                Impact
              </div>
              <div className="flex items-center gap-[var(--space-2)]">
                <div
                  className="font-bold"
                  style={{
                    fontSize: 'var(--font-size-3xl)',
                    color: scenarioData.totalImpact > 0 ? 'var(--carbon-low)' : 'var(--carbon-high)',
                  }}
                >
                  {scenarioData.totalImpact > 0 ? '-' : '+'}{Math.abs(scenarioData.totalImpact / 1000).toFixed(1)}t
                </div>
                {scenarioData.totalImpact > 0 && (
                  <TrendingDown className="w-6 h-6" style={{ color: 'var(--carbon-low)' }} />
                )}
              </div>
              <div
                className="font-medium"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: scenarioData.totalImpact > 0 ? 'var(--carbon-low)' : 'var(--carbon-high)',
                }}
              >
                {Math.abs(scenarioData.percentageChange).toFixed(1)}% {scenarioData.totalImpact > 0 ? 'reduction' : 'increase'}
              </div>
            </div>
          </div>
        </div>
      </TransitionWrapper>

      {/* Visual Comparison */}
      <TransitionWrapper type="fade" show={true} delay={200}>
        <ComparisonOverlay
          baseline={{ label: 'Baseline', option: comparisonCharts.leftOption }}
          comparison={{ label: 'Scenario', option: comparisonCharts.rightOption }}
          height="400px"
        />
      </TransitionWrapper>

      {/* Activity Adjustments */}
      <TransitionWrapper type="slide-up" show={true} delay={300}>
        <div
          className="p-[var(--space-6)] rounded-[var(--radius-lg)]"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-default)',
          }}
        >
          <h3
            className="font-semibold mb-[var(--space-4)]"
            style={{
              fontSize: 'var(--font-size-lg)',
              color: 'var(--text-primary)',
            }}
          >
            Adjust Activities
          </h3>

          <div className="space-y-[var(--space-3)]">
            {activities.map((activity) => {
              const currentQuantity = activityQuantities[activity.id] ?? activity.quantity;
              const hasChanged = currentQuantity !== activity.quantity;
              const change = scenarioData.changes.find((c) => c.activityId === activity.id);

              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-[var(--space-4)] p-[var(--space-3)] rounded-[var(--radius-md)]"
                  style={{
                    backgroundColor: hasChanged ? 'var(--color-baseline-bg)' : 'var(--surface-bg)',
                    border: `1px solid ${hasChanged ? 'var(--color-baseline)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {/* Activity info */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-medium truncate"
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {activity.name}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {activity.carbonIntensity.toFixed(2)} kg CO₂/{activity.unit}
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-[var(--space-2)]">
                    <button
                      onClick={() => handleQuantityChange(activity.id, currentQuantity - 1)}
                      className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-colors"
                      disabled={currentQuantity === 0}
                      aria-label={`Decrease ${activity.name} quantity`}
                    >
                      <Minus className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>

                    <Input
                      type="number"
                      value={currentQuantity}
                      onChange={(e) => handleQuantityChange(activity.id, parseFloat(e.target.value) || 0)}
                      className="w-20 text-center"
                      min={0}
                      step={1}
                    />

                    <button
                      onClick={() => handleQuantityChange(activity.id, currentQuantity + 1)}
                      className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-colors"
                      aria-label={`Increase ${activity.name} quantity`}
                    >
                      <Plus className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>

                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {activity.unit}/year
                    </span>
                  </div>

                  {/* Change indicator */}
                  {change && (
                    <div
                      className="text-right"
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: change.emissionsDiff < 0 ? 'var(--carbon-low)' : 'var(--carbon-high)',
                        minWidth: '100px',
                      }}
                    >
                      {change.emissionsDiff < 0 ? '-' : '+'}{Math.abs(change.emissionsDiff / 1000).toFixed(2)}t
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </TransitionWrapper>

      {/* Actions */}
      <div className="flex items-center justify-end gap-[var(--space-3)] pt-[var(--space-4)]">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={!hasChanges}
          icon={<Save className="w-5 h-5" />}
        >
          Save Scenario
        </Button>
      </div>
    </div>
  );
}
