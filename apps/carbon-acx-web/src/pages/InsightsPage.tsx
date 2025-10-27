/**
 * InsightsPage - Insights, scenarios, and goals
 *
 * Simplified from InsightScene - removed CanvasZone, StoryScene, TransitionWrapper, use JourneyMachine.
 * Clean page layout with tabbed interface for different views.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/system/Button';
import { InsightCard, detectInsights, type Insight } from '../components/domain/InsightCard';
import { ScenarioBuilder } from '../components/domain/ScenarioBuilder';
import { GoalTracker } from '../components/domain/GoalTracker';
import {
  BaselineShareableCard,
  GoalShareableCard,
  AchievementShareableCard,
} from '../components/domain/ShareableCard';
import { useAppStore } from '../hooks/useAppStore';
import { Lightbulb, Target, GitCompare, Share2, X, ArrowLeft, Globe, List } from 'lucide-react';

// Lazy load DataUniverse to avoid SSR issues with Three.js
const DataUniverse = React.lazy(() =>
  import('../components/viz/DataUniverse').then((module) => ({
    default: module.DataUniverse,
  }))
);

type ActiveView = 'insights' | 'scenarios' | 'goals' | 'share';
type InsightDisplayMode = 'cards' | 'universe';

export default function InsightsPage() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = React.useState<ActiveView>('insights');
  const [displayMode, setDisplayMode] = React.useState<InsightDisplayMode>('cards');
  const [selectedActivity, setSelectedActivity] = React.useState<any>(null);

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
    const breakdown: Record<string, number> = {};
    activities.forEach((activity) => {
      const category = activity.category || 'Other';
      breakdown[category] = (breakdown[category] || 0) + activity.annualEmissions;
    });

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

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] p-[var(--space-8)]">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-[var(--space-8)]">
        <div className="flex items-center justify-between mb-[var(--space-6)]">
          <div className="flex items-center gap-[var(--space-4)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/explore')}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Explore
            </Button>
            <h1
              className="font-bold"
              style={{
                fontSize: 'var(--font-size-3xl)',
                color: 'var(--text-primary)',
              }}
            >
              Insights & Goals
            </h1>
          </div>

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
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto">
        {/* Insights view */}
        {activeView === 'insights' && (
          <div>
            <div className="flex items-center justify-between mb-[var(--space-6)]">
              <h2
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  color: 'var(--text-primary)',
                }}
              >
                Your Carbon Insights
              </h2>

              {/* Display mode toggle */}
              {activities.length > 0 && (
                <div
                  className="inline-flex rounded-[var(--radius-md)] p-1"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <button
                    onClick={() => setDisplayMode('cards')}
                    className="px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-2 transition-colors"
                    style={{
                      backgroundColor: displayMode === 'cards' ? 'var(--interactive-primary)' : 'transparent',
                      color: displayMode === 'cards' ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    <List className="w-4 h-4" />
                    <span style={{ fontSize: 'var(--font-size-sm)' }}>Cards</span>
                  </button>
                  <button
                    onClick={() => setDisplayMode('universe')}
                    className="px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-2 transition-colors"
                    style={{
                      backgroundColor: displayMode === 'universe' ? 'var(--interactive-primary)' : 'transparent',
                      color: displayMode === 'universe' ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    <Globe className="w-4 h-4" />
                    <span style={{ fontSize: 'var(--font-size-sm)' }}>3D View</span>
                  </button>
                </div>
              )}
            </div>

            {activities.length === 0 ? (
              <div
                className="text-center py-12 rounded-[var(--radius-lg)]"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  fontSize: 'var(--font-size-lg)',
                  color: 'var(--text-secondary)',
                }}
              >
                Add activities to your baseline to generate insights
              </div>
            ) : displayMode === 'cards' ? (
              <>
                {insights.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--space-4)]">
                    {insights.map((insight) => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                ) : (
                  <div
                    className="text-center py-12 rounded-[var(--radius-lg)]"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      fontSize: 'var(--font-size-lg)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    No insights detected yet. Add more activities to unlock insights.
                  </div>
                )}
              </>
            ) : (
              // 3D Universe Mode with Sidebar
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[var(--space-6)]">
                {/* 3D Universe */}
                <div
                  className="rounded-[var(--radius-lg)] overflow-hidden"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border-default)',
                    height: '600px',
                  }}
                >
                  <React.Suspense
                    fallback={
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: '#0a0e27', color: '#fff' }}
                      >
                        Loading 3D Universe...
                      </div>
                    }
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
                  </React.Suspense>
                </div>

                {/* Insights Sidebar */}
                <div className="space-y-[var(--space-4)]">
                  {selectedActivity ? (
                    // Activity Detail
                    <div
                      className="p-[var(--space-4)] rounded-[var(--radius-lg)]"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      <h4
                        className="font-semibold mb-[var(--space-2)]"
                        style={{
                          fontSize: 'var(--font-size-base)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        Selected Activity
                      </h4>
                      <h3
                        className="font-bold mb-[var(--space-3)]"
                        style={{
                          fontSize: 'var(--font-size-lg)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {selectedActivity.name}
                      </h3>
                      <div className="flex items-baseline gap-[var(--space-2)] mb-[var(--space-3)]">
                        <span
                          className="font-bold"
                          style={{
                            fontSize: 'var(--font-size-2xl)',
                            color: 'var(--color-baseline)',
                          }}
                        >
                          {(selectedActivity.annualEmissions / 1000).toFixed(2)}
                        </span>
                        <span
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          tonnes CO₂/year
                        </span>
                      </div>
                      {selectedActivity.category && (
                        <div
                          className="inline-block px-[var(--space-2)] py-[var(--space-1)] rounded-full"
                          style={{
                            backgroundColor: 'var(--surface-bg)',
                            color: 'var(--text-tertiary)',
                            fontSize: 'var(--font-size-xs)',
                          }}
                        >
                          {selectedActivity.category}
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedActivity(null)}
                        className="mt-[var(--space-4)] w-full text-center text-[var(--font-size-sm)] underline hover:no-underline"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        Clear selection
                      </button>
                    </div>
                  ) : (
                    // Insights List
                    <div
                      className="p-[var(--space-4)] rounded-[var(--radius-lg)]"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      <h4
                        className="font-semibold mb-[var(--space-3)]"
                        style={{
                          fontSize: 'var(--font-size-base)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        Key Insights
                      </h4>
                      <p
                        className="mb-[var(--space-3)]"
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Click a sphere to view details, or explore insights below
                      </p>
                    </div>
                  )}

                  {/* Compact Insights List */}
                  {insights.length > 0 && (
                    <div className="space-y-[var(--space-2)]">
                      {insights.slice(0, 3).map((insight) => (
                        <div
                          key={insight.id}
                          className="p-[var(--space-3)] rounded-[var(--radius-md)]"
                          style={{
                            backgroundColor: 'var(--color-insight-bg)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div
                            className="font-medium mb-[var(--space-1)]"
                            style={{
                              fontSize: 'var(--font-size-sm)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {insight.title}
                          </div>
                          <p
                            style={{
                              fontSize: 'var(--font-size-xs)',
                              color: 'var(--text-secondary)',
                              lineHeight: 1.4,
                            }}
                          >
                            {insight.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
        )}

        {/* Scenarios view */}
        {activeView === 'scenarios' && (
          <div>
            <div className="flex items-center justify-between mb-[var(--space-6)]">
              <h2
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-2xl)',
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
        )}

        {/* Goals view */}
        {activeView === 'goals' && (
          <div>
            <div className="flex items-center justify-between mb-[var(--space-6)]">
              <h2
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-2xl)',
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
        )}

        {/* Share view */}
        {activeView === 'share' && (
          <div>
            <div className="flex items-center justify-between mb-[var(--space-6)]">
              <h2
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-2xl)',
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
        )}

        {/* Stats bar */}
        <div
          className="mt-[var(--space-8)] p-[var(--space-6)] rounded-[var(--radius-lg)]"
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
        </div>
      </div>
    </div>
  );
}
