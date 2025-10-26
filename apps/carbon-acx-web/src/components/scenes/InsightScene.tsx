/**
 * InsightScene - Insights, scenarios, and goals orchestration
 *
 * Features:
 * - Automated insight cards grid
 * - Scenario builder integration
 * - Goal tracker integration
 * - Shareable exports
 * - Canvas-first layout with zone switching
 * - Design token consistency
 *
 * Phase 2 Week 6 implementation
 */

import * as React from 'react';
import { CanvasZone } from '../canvas/CanvasZone';
import { StoryScene } from '../canvas/StoryScene';
import { TransitionWrapper, StaggerWrapper } from '../canvas/TransitionWrapper';
import { Button } from '../system/Button';
import { InsightCard, detectInsights, type Insight } from '../domain/InsightCard';
import { ScenarioBuilder } from '../domain/ScenarioBuilder';
import { GoalTracker } from '../domain/GoalTracker';
import {
  BaselineShareableCard,
  GoalShareableCard,
  AchievementShareableCard,
} from '../domain/ShareableCard';
import { useAppStore } from '../../hooks/useAppStore';
import { useJourneyMachine } from '../../hooks/useJourneyMachine';
import { Lightbulb, Target, GitCompare, Share2, X, ArrowLeft } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface InsightSceneProps {
  show: boolean;
}

type ActiveView = 'insights' | 'scenarios' | 'goals' | 'share';

// ============================================================================
// Component
// ============================================================================

export function InsightScene({ show }: InsightSceneProps) {
  const [activeView, setActiveView] = React.useState<ActiveView>('insights');
  const [selectedInsight, setSelectedInsight] = React.useState<Insight | null>(null);

  const { exploreSectors } = useJourneyMachine();

  const {
    activities,
    goals,
    scenarios,
    getTotalEmissions,
    addGoal,
    updateGoal,
    removeGoal,
    addScenario,
  } = useAppStore();

  const totalEmissions = getTotalEmissions();
  const currentGoal = goals.length > 0 ? goals[0] : undefined;

  // Generate insights from current data
  const insights = React.useMemo(() => {
    // Category breakdown
    const breakdown: Record<string, number> = {};
    activities.forEach((activity) => {
      const category = activity.category || 'Other';
      breakdown[category] = (breakdown[category] || 0) + activity.annualEmissions;
    });

    // Mock history data (in production, would track over time)
    const history = [
      { date: '2024-01-01', value: totalEmissions * 1.1 },
      { date: '2024-02-01', value: totalEmissions * 1.05 },
      { date: '2024-03-01', value: totalEmissions },
    ];

    return detectInsights({
      total: totalEmissions,
      breakdown,
      history,
      activities: activities.map((a) => ({
        id: a.id,
        name: a.name,
        emissions: a.annualEmissions,
        category: a.category || 'Other',
      })),
    });
  }, [activities, totalEmissions]);

  const handleScenarioSave = (scenario: any) => {
    addScenario(scenario);
    setActiveView('insights');
  };

  const handleGoalSave = (goal: any) => {
    addGoal(goal);
  };

  // Calculate goal progress if goal exists
  const goalProgress = currentGoal
    ? Math.min(
        100,
        Math.max(
          0,
          ((currentGoal.currentEmissions - totalEmissions) /
            (currentGoal.currentEmissions - currentGoal.targetEmissions)) *
            100
        )
      )
    : 0;

  if (!show) return null;

  return (
    <StoryScene scene="insight" layout="canvas" title="Insights & Goals">
      <CanvasZone zone="hero" zoneId="insight-hero" padding="lg" interactionMode="explore">
        {/* Header navigation */}
        <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-10">
          {/* Back to Explore button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={exploreSectors}
            icon={<ArrowLeft className="w-4 h-4" />}
            aria-label="Back to Explore"
          >
            Back to Explore
          </Button>

          {/* View toggle */}
          <div
            className="inline-flex rounded-[var(--radius-md)] p-1"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
            <button
              onClick={() => setActiveView('insights')}
              className="px-4 py-2 rounded-[var(--radius-sm)] flex items-center gap-2 transition-colors"
              style={{
                backgroundColor:
                  activeView === 'insights' ? 'var(--interactive-primary)' : 'transparent',
                color: activeView === 'insights' ? 'white' : 'var(--text-secondary)',
              }}
            >
              <Lightbulb className="w-4 h-4" />
              <span style={{ fontSize: 'var(--font-size-sm)' }}>Insights</span>
            </button>
            <button
              onClick={() => setActiveView('scenarios')}
              className="px-4 py-2 rounded-[var(--radius-sm)] flex items-center gap-2 transition-colors"
              style={{
                backgroundColor:
                  activeView === 'scenarios' ? 'var(--interactive-primary)' : 'transparent',
                color: activeView === 'scenarios' ? 'white' : 'var(--text-secondary)',
              }}
            >
              <GitCompare className="w-4 h-4" />
              <span style={{ fontSize: 'var(--font-size-sm)' }}>Scenarios</span>
            </button>
            <button
              onClick={() => setActiveView('goals')}
              className="px-4 py-2 rounded-[var(--radius-sm)] flex items-center gap-2 transition-colors"
              style={{
                backgroundColor:
                  activeView === 'goals' ? 'var(--interactive-primary)' : 'transparent',
                color: activeView === 'goals' ? 'white' : 'var(--text-secondary)',
              }}
            >
              <Target className="w-4 h-4" />
              <span style={{ fontSize: 'var(--font-size-sm)' }}>Goals</span>
            </button>
            <button
              onClick={() => setActiveView('share')}
              className="px-4 py-2 rounded-[var(--radius-sm)] flex items-center gap-2 transition-colors"
              style={{
                backgroundColor:
                  activeView === 'share' ? 'var(--interactive-primary)' : 'transparent',
                color: activeView === 'share' ? 'white' : 'var(--text-secondary)',
              }}
            >
              <Share2 className="w-4 h-4" />
              <span style={{ fontSize: 'var(--font-size-sm)' }}>Share</span>
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="min-h-[80vh] flex items-center justify-center px-[var(--space-8)] pt-24">
          {/* Insights view */}
          {activeView === 'insights' && (
            <TransitionWrapper type="fade" show={true}>
              <div className="w-full max-w-6xl">
                <h2
                  className="font-bold mb-[var(--space-6)]"
                  style={{
                    fontSize: 'var(--font-size-3xl)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Your Carbon Insights
                </h2>

                {insights.length > 0 ? (
                  <StaggerWrapper staggerDelay={50} childTransition="slide-up">
                    <div className="grid grid-cols-2 gap-[var(--space-4)]">
                      {insights.map((insight) => (
                        <InsightCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </StaggerWrapper>
                ) : (
                  <div
                    className="text-center py-12"
                    style={{
                      fontSize: 'var(--font-size-lg)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Add activities to your baseline to generate insights
                  </div>
                )}

                {/* Quick actions */}
                <div className="flex items-center gap-[var(--space-3)] mt-[var(--space-8)]">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setActiveView('scenarios')}
                    icon={<GitCompare className="w-5 h-5" />}
                  >
                    Build Scenario
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setActiveView('goals')}
                    icon={<Target className="w-5 h-5" />}
                  >
                    {currentGoal ? 'View Goal' : 'Set Goal'}
                  </Button>
                </div>
              </div>
            </TransitionWrapper>
          )}

          {/* Scenarios view */}
          {activeView === 'scenarios' && (
            <TransitionWrapper type="fade" show={true}>
              <div className="w-full">
                <div className="flex items-center justify-between mb-[var(--space-6)]">
                  <h2
                    className="font-bold"
                    style={{
                      fontSize: 'var(--font-size-3xl)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    What-If Scenarios
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView('insights')}
                    icon={<X className="w-4 h-4" />}
                  >
                    Close
                  </Button>
                </div>

                <ScenarioBuilder
                  baselineEmissions={totalEmissions}
                  activities={activities.map((a) => ({
                    id: a.id,
                    name: a.name,
                    quantity: a.quantity,
                    unit: a.unit,
                    carbonIntensity: a.carbonIntensity,
                    annualEmissions: a.annualEmissions,
                  }))}
                  onSave={handleScenarioSave}
                  onCancel={() => setActiveView('insights')}
                />
              </div>
            </TransitionWrapper>
          )}

          {/* Goals view */}
          {activeView === 'goals' && (
            <TransitionWrapper type="fade" show={true}>
              <div className="w-full">
                <div className="flex items-center justify-between mb-[var(--space-6)]">
                  <h2
                    className="font-bold"
                    style={{
                      fontSize: 'var(--font-size-3xl)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Carbon Reduction Goals
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView('insights')}
                    icon={<X className="w-4 h-4" />}
                  >
                    Close
                  </Button>
                </div>

                <GoalTracker
                  goal={currentGoal}
                  currentEmissions={totalEmissions}
                  onSaveGoal={handleGoalSave}
                  onUpdateGoal={updateGoal}
                  onDeleteGoal={removeGoal}
                />
              </div>
            </TransitionWrapper>
          )}

          {/* Share view */}
          {activeView === 'share' && (
            <TransitionWrapper type="fade" show={true}>
              <div className="w-full max-w-4xl">
                <div className="flex items-center justify-between mb-[var(--space-6)]">
                  <h2
                    className="font-bold"
                    style={{
                      fontSize: 'var(--font-size-3xl)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Share Your Progress
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView('insights')}
                    icon={<X className="w-4 h-4" />}
                  >
                    Close
                  </Button>
                </div>

                <div className="space-y-[var(--space-8)]">
                  {/* Baseline card */}
                  <div>
                    <h3
                      className="font-semibold mb-[var(--space-4)]"
                      style={{
                        fontSize: 'var(--font-size-lg)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Baseline Summary
                    </h3>
                    <BaselineShareableCard
                      emissions={totalEmissions}
                      activityCount={activities.length}
                      topCategory={
                        activities.length > 0
                          ? activities.sort((a, b) => b.annualEmissions - a.annualEmissions)[0]
                              ?.category || undefined
                          : undefined
                      }
                    />
                  </div>

                  {/* Goal card (if goal exists) */}
                  {currentGoal && (
                    <div>
                      <h3
                        className="font-semibold mb-[var(--space-4)]"
                        style={{
                          fontSize: 'var(--font-size-lg)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        Goal Progress
                      </h3>
                      <GoalShareableCard
                        currentEmissions={totalEmissions}
                        targetEmissions={currentGoal.targetEmissions}
                        progress={goalProgress}
                        deadline={currentGoal.deadline}
                      />
                    </div>
                  )}

                  {/* Achievement card (if goal achieved) */}
                  {currentGoal && totalEmissions <= currentGoal.targetEmissions && (
                    <div>
                      <h3
                        className="font-semibold mb-[var(--space-4)]"
                        style={{
                          fontSize: 'var(--font-size-lg)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        Achievement
                      </h3>
                      <AchievementShareableCard
                        emissions={totalEmissions}
                        reductionAmount={currentGoal.currentEmissions - totalEmissions}
                        reductionPercent={
                          ((currentGoal.currentEmissions - totalEmissions) /
                            currentGoal.currentEmissions) *
                          100
                        }
                        milestoneName={currentGoal.name}
                      />
                    </div>
                  )}
                </div>
              </div>
            </TransitionWrapper>
          )}
        </div>
      </CanvasZone>

      {/* Insight bar */}
      <CanvasZone zone="insight" zoneId="insight-insight" padding="md" interactionMode="compare">
        <div className="flex items-center justify-between">
          <div>
            <div
              className="font-semibold mb-1"
              style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--text-primary)',
              }}
            >
              {activeView === 'insights' && 'Active Insights'}
              {activeView === 'scenarios' && 'Scenario Builder'}
              {activeView === 'goals' && 'Goal Tracker'}
              {activeView === 'share' && 'Export & Share'}
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              {activeView === 'insights' && `${insights.length} insights detected`}
              {activeView === 'scenarios' && `${scenarios.length} scenarios saved`}
              {activeView === 'goals' && currentGoal && `${goalProgress.toFixed(0)}% progress`}
              {activeView === 'share' && 'Download or share your carbon journey'}
            </div>
          </div>

          {currentGoal && activeView !== 'goals' && (
            <div className="text-right">
              <div
                className="mb-1"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                Goal Progress
              </div>
              <div
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-xl)',
                  color: 'var(--color-goal)',
                }}
              >
                {goalProgress.toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      </CanvasZone>
    </StoryScene>
  );
}
