/**
 * BaselineScene - Domain Component
 *
 * Guided flow for establishing user's carbon baseline.
 * Maps to 'baseline' state in XState journey machine.
 *
 * Features:
 * - Activity entry with real-time emission calculation
 * - Layer-based organization (energy, transport, goods, waste)
 * - Progress tracking toward baseline establishment
 * - Visual feedback with GaugeProgress
 */

import * as React from 'react';
import { StoryScene } from '../components/canvas/StoryScene';
import { CanvasZone } from '../components/canvas/CanvasZone';
import { TransitionWrapper, StaggerWrapper } from '../components/canvas/TransitionWrapper';
import { Button } from '../components/system/Button';
import { Input } from '../components/system/Input';
import { GaugeProgress } from '../components/viz/GaugeProgress';
import { useJourneyMachine } from '../hooks/useJourneyMachine';
import { useAppStore } from '../hooks/useAppStore';
import { Plus, CheckCircle, ArrowRight } from 'lucide-react';

export interface BaselineSceneProps {
  /**
   * Show scene
   */
  show?: boolean;
  /**
   * Callback when baseline is established
   */
  onComplete?: () => void;
}

export const BaselineScene: React.FC<BaselineSceneProps> = ({
  show = true,
  onComplete,
}) => {
  const { baselineComplete, addActivities } = useJourneyMachine();
  const {
    activities,
    addActivity,
    removeActivity,
    getTotalEmissions,
  } = useAppStore();

  const [newActivityName, setNewActivityName] = React.useState('');
  const [newActivityQuantity, setNewActivityQuantity] = React.useState('');
  const [selectedLayer, setSelectedLayer] = React.useState<string>('energy');

  const totalEmissions = getTotalEmissions();
  const activityCount = activities.length;

  // Baseline targets
  const MIN_ACTIVITIES = 5; // Minimum activities for meaningful baseline
  const MIN_EMISSIONS = 100; // Minimum kg CO₂e for baseline

  const isBaselineReady =
    activityCount >= MIN_ACTIVITIES && totalEmissions >= MIN_EMISSIONS;

  const handleAddActivity = () => {
    if (!newActivityName.trim() || !newActivityQuantity) return;

    const quantity = parseFloat(newActivityQuantity);
    if (isNaN(quantity) || quantity <= 0) return;

    addActivity({
      id: `activity-${Date.now()}`,
      name: newActivityName.trim(),
      layer: selectedLayer,
      quantity,
      unit: 'kWh', // Simplified for example
      emissionFactor: 0.5, // Simplified for example
      timestamp: new Date().toISOString(),
    });

    addActivities(); // Update journey machine context

    // Reset form
    setNewActivityName('');
    setNewActivityQuantity('');
  };

  const handleComplete = () => {
    if (isBaselineReady) {
      baselineComplete();
      onComplete?.();
    }
  };

  const layers = [
    { id: 'energy', name: 'Energy', icon: '⚡' },
    { id: 'transport', name: 'Transport', icon: '🚗' },
    { id: 'goods', name: 'Goods & Services', icon: '📦' },
    { id: 'waste', name: 'Waste', icon: '♻️' },
  ];

  return (
    <StoryScene
      scene="baseline"
      title="Establish Your Baseline"
      description="Add activities to understand your starting point"
      layout="canvas"
    >
      {/* Hero Zone - Progress Gauge */}
      <CanvasZone
        zoneId="baseline-hero"
        zone="hero"
        padding="lg"
        interactionMode="explore"
      >
        <TransitionWrapper type="story" show={show}>
          <div className="text-center space-y-6">
            <h2 className="text-[var(--font-size-4xl)] font-bold text-[var(--text-primary)]">
              Build Your Carbon Profile
            </h2>
            <p className="text-[var(--font-size-lg)] text-[var(--text-secondary)] max-w-2xl mx-auto">
              Add your daily activities across energy, transport, goods, and
              waste to establish your baseline emissions.
            </p>

            {/* Gauge showing total emissions */}
            <div className="py-8">
              <GaugeProgress
                value={totalEmissions}
                max={1000}
                target={MIN_EMISSIONS}
                label="Total Emissions"
                unit="kg CO₂e"
                colorScheme="carbon"
                size={320}
              />
            </div>

            {/* Progress indicators */}
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  {activityCount >= MIN_ACTIVITIES ? (
                    <CheckCircle className="h-5 w-5 text-[var(--carbon-low)]" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-[var(--border-default)]" />
                  )}
                  <span className="text-[var(--font-size-2xl)] font-bold text-[var(--text-primary)]">
                    {activityCount}
                  </span>
                </div>
                <p className="text-[var(--font-size-sm)] text-[var(--text-tertiary)] mt-1">
                  Activities ({MIN_ACTIVITIES} min)
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  {totalEmissions >= MIN_EMISSIONS ? (
                    <CheckCircle className="h-5 w-5 text-[var(--carbon-low)]" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-[var(--border-default)]" />
                  )}
                  <span className="text-[var(--font-size-2xl)] font-bold text-[var(--text-primary)]">
                    {totalEmissions.toFixed(0)}
                  </span>
                </div>
                <p className="text-[var(--font-size-sm)] text-[var(--text-tertiary)] mt-1">
                  kg CO₂e ({MIN_EMISSIONS} min)
                </p>
              </div>
            </div>

            {/* Complete button */}
            {isBaselineReady && (
              <TransitionWrapper type="slide-up" delay={300} show={show}>
                <Button
                  size="lg"
                  variant="success"
                  onClick={handleComplete}
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                  className="mt-6"
                >
                  Baseline Established - Continue
                </Button>
              </TransitionWrapper>
            )}
          </div>
        </TransitionWrapper>
      </CanvasZone>

      {/* Insight Zone - Activity Entry */}
      <CanvasZone
        zoneId="baseline-insight"
        zone="insight"
        padding="md"
        interactionMode="explore"
      >
        <div className="space-y-4">
          <h3 className="text-[var(--font-size-xl)] font-semibold text-[var(--text-primary)]">
            Add Activity
          </h3>

          {/* Layer selection */}
          <div className="flex gap-2 flex-wrap">
            {layers.map((layer) => (
              <button
                key={layer.id}
                onClick={() => setSelectedLayer(layer.id)}
                className="px-4 py-2 rounded-[var(--radius-md)] transition-all duration-200"
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
                <span className="mr-2">{layer.icon}</span>
                {layer.name}
              </button>
            ))}
          </div>

          {/* Activity form */}
          <div className="flex gap-3">
            <Input
              placeholder="Activity name (e.g., 'Office heating')"
              value={newActivityName}
              onChange={(e) => setNewActivityName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddActivity();
              }}
            />
            <Input
              type="number"
              placeholder="Quantity"
              value={newActivityQuantity}
              onChange={(e) => setNewActivityQuantity(e.target.value)}
              className="w-32"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddActivity();
              }}
            />
            <Button
              variant="primary"
              onClick={handleAddActivity}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add
            </Button>
          </div>
        </div>
      </CanvasZone>

      {/* Detail Zone - Activity List */}
      <CanvasZone
        zoneId="baseline-detail"
        zone="detail"
        padding="sm"
        collapsible
        interactionMode="drill"
      >
        <div className="space-y-2">
          <h4 className="text-[var(--font-size-md)] font-semibold text-[var(--text-primary)]">
            Recent Activities ({activityCount})
          </h4>

          {activities.length === 0 ? (
            <p className="text-[var(--font-size-sm)] text-[var(--text-secondary)]">
              No activities yet. Add your first activity above to get started.
            </p>
          ) : (
            <StaggerWrapper staggerDelay={50} show={show}>
              {activities.slice(-5).reverse().map((activity) => {
                const emissions = (activity.quantity * activity.emissionFactor).toFixed(1);
                return (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-[var(--surface-elevated)] rounded-[var(--radius-md)] border border-[var(--border-default)]"
                  >
                    <div className="flex-1">
                      <p className="text-[var(--font-size-sm)] font-medium text-[var(--text-primary)]">
                        {activity.name}
                      </p>
                      <p className="text-[var(--font-size-xs)] text-[var(--text-secondary)]">
                        {activity.layer} • {activity.quantity} {activity.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--font-size-sm)] font-bold text-[var(--text-primary)]">
                        {emissions} kg CO₂e
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeActivity(activity.id)}
                      className="ml-3"
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </StaggerWrapper>
          )}
        </div>
      </CanvasZone>
    </StoryScene>
  );
};

BaselineScene.displayName = 'BaselineScene';
