/**
 * GoalTracker - Set and track carbon reduction goals
 *
 * Features:
 * - Set carbon budget/target with deadline
 * - Progress tracking with visual gauge
 * - Milestone celebrations (10%, 25%, 50%, 75%, 100%)
 * - Timeline projection
 * - Motivational messaging
 * - Design token consistency
 *
 * Phase 2 Week 6 implementation
 */

import * as React from 'react';
import { Button } from '../system/Button';
import { Input } from '../system/Input';
import { GaugeProgress } from '../viz/GaugeProgress';
import { TransitionWrapper } from '../canvas/TransitionWrapper';
import { Target, Calendar, TrendingDown, Award, Sparkles, Edit2, Check, X } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface CarbonGoal {
  id: string;
  name: string;
  targetEmissions: number; // kg CO₂/year
  currentEmissions: number; // kg CO₂/year
  deadline?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
  milestones: {
    percent: number;
    achieved: boolean;
    achievedAt?: string;
  }[];
}

export interface GoalTrackerProps {
  goal?: CarbonGoal;
  currentEmissions: number;
  onSaveGoal: (goal: Omit<CarbonGoal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateGoal?: (goalId: string, updates: Partial<CarbonGoal>) => void;
  onDeleteGoal?: (goalId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function GoalTracker({
  goal,
  currentEmissions,
  onSaveGoal,
  onUpdateGoal,
  onDeleteGoal,
}: GoalTrackerProps) {
  const [isEditing, setIsEditing] = React.useState(!goal);
  const [editForm, setEditForm] = React.useState({
    name: goal?.name || 'My Carbon Reduction Goal',
    targetEmissions: goal?.targetEmissions || Math.round(currentEmissions * 0.5),
    deadline: goal?.deadline || getDefaultDeadline(),
  });
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [newMilestone, setNewMilestone] = React.useState<number | null>(null);

  // Calculate progress
  const progress = React.useMemo(() => {
    if (!goal) return 0;
    const reductionTarget = goal.currentEmissions - goal.targetEmissions;
    const reductionAchieved = goal.currentEmissions - currentEmissions;
    return Math.min(100, Math.max(0, (reductionAchieved / reductionTarget) * 100));
  }, [goal, currentEmissions]);

  // Check for milestone achievements
  React.useEffect(() => {
    if (!goal || !onUpdateGoal) return;

    const currentMilestones = goal.milestones || getDefaultMilestones();
    const nextMilestone = currentMilestones.find(
      (m) => !m.achieved && progress >= m.percent
    );

    if (nextMilestone) {
      // Mark milestone as achieved
      const updatedMilestones = currentMilestones.map((m) =>
        m.percent === nextMilestone.percent
          ? { ...m, achieved: true, achievedAt: new Date().toISOString() }
          : m
      );

      onUpdateGoal(goal.id, { milestones: updatedMilestones });

      // Show celebration
      setNewMilestone(nextMilestone.percent);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4000);
    }
  }, [progress, goal, onUpdateGoal]);

  const handleSave = () => {
    const goalData = {
      name: editForm.name,
      targetEmissions: editForm.targetEmissions,
      currentEmissions,
      deadline: editForm.deadline,
      milestones: getDefaultMilestones(),
    };

    onSaveGoal(goalData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (goal) {
      setEditForm({
        name: goal.name,
        targetEmissions: goal.targetEmissions,
        deadline: goal.deadline || '',
      });
      setIsEditing(false);
    }
  };

  // Editing mode
  if (isEditing) {
    return (
      <div
        className="max-w-2xl mx-auto p-[var(--space-6)] rounded-[var(--radius-xl)]"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-center gap-[var(--space-3)] mb-[var(--space-6)]">
          <div
            className="p-[var(--space-3)] rounded-[var(--radius-md)]"
            style={{
              backgroundColor: 'var(--color-goal-bg)',
            }}
          >
            <Target className="w-6 h-6" style={{ color: 'var(--color-goal)' }} />
          </div>
          <h2
            className="font-bold"
            style={{
              fontSize: 'var(--font-size-2xl)',
              color: 'var(--text-primary)',
            }}
          >
            {goal ? 'Edit Goal' : 'Set Your Carbon Goal'}
          </h2>
        </div>

        <div className="space-y-[var(--space-5)]">
          {/* Goal name */}
          <div>
            <label
              className="block mb-[var(--space-2)] font-medium"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              Goal Name
            </label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="e.g., Reduce emissions by 50%"
            />
          </div>

          {/* Current emissions (read-only) */}
          <div>
            <label
              className="block mb-[var(--space-2)] font-medium"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              Current Annual Emissions
            </label>
            <div
              className="px-[var(--space-4)] py-[var(--space-3)] rounded-[var(--radius-md)]"
              style={{
                backgroundColor: 'var(--surface-bg)',
                border: '1px solid var(--border-subtle)',
                fontSize: 'var(--font-size-base)',
                color: 'var(--text-primary)',
              }}
            >
              {(currentEmissions / 1000).toFixed(1)} tonnes CO₂/year
            </div>
          </div>

          {/* Target emissions */}
          <div>
            <label
              className="block mb-[var(--space-2)] font-medium"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              Target Annual Emissions
            </label>
            <Input
              type="number"
              value={editForm.targetEmissions}
              onChange={(e) =>
                setEditForm({ ...editForm, targetEmissions: parseFloat(e.target.value) || 0 })
              }
              min={0}
              step={100}
            />
            <div
              className="mt-[var(--space-2)]"
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-tertiary)',
              }}
            >
              {((1 - editForm.targetEmissions / currentEmissions) * 100).toFixed(0)}% reduction from
              current
            </div>
          </div>

          {/* Deadline (optional) */}
          <div>
            <label
              className="block mb-[var(--space-2)] font-medium"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              Target Date (optional)
            </label>
            <Input
              type="date"
              value={editForm.deadline}
              onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-[var(--space-3)] pt-[var(--space-4)]">
            <Button variant="primary" size="lg" onClick={handleSave} icon={<Check className="w-5 h-5" />}>
              {goal ? 'Update Goal' : 'Set Goal'}
            </Button>
            {goal && (
              <Button variant="ghost" size="lg" onClick={handleCancel} icon={<X className="w-5 h-5" />}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Display mode (with goal set)
  if (!goal) {
    return null;
  }

  const reductionAmount = goal.currentEmissions - goal.targetEmissions;
  const reductionPercent = ((reductionAmount / goal.currentEmissions) * 100).toFixed(0);
  const achieved = currentEmissions <= goal.targetEmissions;
  const daysRemaining = goal.deadline ? getDaysRemaining(goal.deadline) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-[var(--space-6)]">
      {/* Milestone celebration overlay */}
      {showCelebration && newMilestone && (
        <TransitionWrapper type="story" show={true}>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
            }}
          >
            <div className="text-center space-y-[var(--space-6)] animate-bounce-in">
              <Sparkles
                className="w-24 h-24 mx-auto animate-pulse"
                style={{ color: 'var(--color-goal)' }}
              />
              <div>
                <h2
                  className="font-bold mb-[var(--space-2)]"
                  style={{
                    fontSize: 'var(--font-size-4xl)',
                    color: 'var(--color-goal)',
                  }}
                >
                  {newMilestone}% Complete! 🎉
                </h2>
                <p
                  style={{
                    fontSize: 'var(--font-size-lg)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {getMilestoneMessage(newMilestone)}
                </p>
              </div>
            </div>
          </div>
        </TransitionWrapper>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-[var(--space-2)]">
          <div className="flex items-center gap-[var(--space-3)]">
            <div
              className="p-[var(--space-2)] rounded-[var(--radius-md)]"
              style={{
                backgroundColor: 'var(--color-goal-bg)',
              }}
            >
              <Target className="w-5 h-5" style={{ color: 'var(--color-goal)' }} />
            </div>
            <h2
              className="font-bold"
              style={{
                fontSize: 'var(--font-size-2xl)',
                color: 'var(--text-primary)',
              }}
            >
              {goal.name}
            </h2>
          </div>
          {goal.deadline && (
            <div className="flex items-center gap-[var(--space-2)] ml-[52px]">
              <Calendar className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                }}
              >
                Target: {new Date(goal.deadline).toLocaleDateString()}
                {daysRemaining !== null && (
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {' '}
                    ({daysRemaining} days {daysRemaining < 0 ? 'overdue' : 'remaining'})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-[var(--space-2)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            icon={<Edit2 className="w-4 h-4" />}
          >
            Edit
          </Button>
          {onDeleteGoal && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteGoal(goal.id)}
              icon={<X className="w-4 h-4" />}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Progress gauge */}
      <TransitionWrapper type="slide-up" show={true} delay={100}>
        <div
          className="p-[var(--space-6)] rounded-[var(--radius-xl)]"
          style={{
            background: achieved
              ? 'linear-gradient(135deg, var(--carbon-low-bg) 0%, var(--color-goal-bg) 100%)'
              : 'var(--surface-elevated)',
            border: `2px solid ${achieved ? 'var(--carbon-low)' : 'var(--border-default)'}`,
          }}
        >
          <GaugeProgress
            value={progress}
            max={100}
            label={achieved ? 'Goal Achieved!' : 'Progress'}
            size="lg"
            showValue={true}
            color={achieved ? 'var(--carbon-low)' : 'var(--color-goal)'}
          />

          {achieved && (
            <div className="text-center mt-[var(--space-4)]">
              <Award className="w-12 h-12 mx-auto mb-[var(--space-3)]" style={{ color: 'var(--carbon-low)' }} />
              <p
                className="font-semibold"
                style={{
                  fontSize: 'var(--font-size-lg)',
                  color: 'var(--carbon-low)',
                }}
              >
                Congratulations! You've reached your carbon goal! 🌍
              </p>
            </div>
          )}
        </div>
      </TransitionWrapper>

      {/* Stats grid */}
      <TransitionWrapper type="fade" show={true} delay={200}>
        <div className="grid grid-cols-3 gap-[var(--space-4)]">
          {/* Current emissions */}
          <div
            className="p-[var(--space-4)] rounded-[var(--radius-lg)]"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div
              className="mb-[var(--space-1)]"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              Current
            </div>
            <div
              className="font-bold"
              style={{
                fontSize: 'var(--font-size-2xl)',
                color: 'var(--text-primary)',
              }}
            >
              {(currentEmissions / 1000).toFixed(1)}t
            </div>
          </div>

          {/* Target emissions */}
          <div
            className="p-[var(--space-4)] rounded-[var(--radius-lg)]"
            style={{
              backgroundColor: 'var(--color-goal-bg)',
              border: '1px solid var(--color-goal)',
            }}
          >
            <div
              className="mb-[var(--space-1)]"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              Target
            </div>
            <div
              className="font-bold"
              style={{
                fontSize: 'var(--font-size-2xl)',
                color: 'var(--color-goal)',
              }}
            >
              {(goal.targetEmissions / 1000).toFixed(1)}t
            </div>
          </div>

          {/* Reduction needed/achieved */}
          <div
            className="p-[var(--space-4)] rounded-[var(--radius-lg)]"
            style={{
              backgroundColor: achieved ? 'var(--carbon-low-bg)' : 'var(--surface-elevated)',
              border: `1px solid ${achieved ? 'var(--carbon-low)' : 'var(--border-default)'}`,
            }}
          >
            <div
              className="mb-[var(--space-1)]"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              {achieved ? 'Reduced' : 'To Go'}
            </div>
            <div className="flex items-center gap-[var(--space-2)]">
              <div
                className="font-bold"
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  color: achieved ? 'var(--carbon-low)' : 'var(--text-primary)',
                }}
              >
                {achieved ? '-' : ''}{((goal.currentEmissions - currentEmissions) / 1000).toFixed(1)}t
              </div>
              {!achieved && <TrendingDown className="w-5 h-5" style={{ color: 'var(--color-goal)' }} />}
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-tertiary)',
              }}
            >
              {reductionPercent}% reduction
            </div>
          </div>
        </div>
      </TransitionWrapper>

      {/* Milestones */}
      <TransitionWrapper type="slide-up" show={true} delay={300}>
        <div
          className="p-[var(--space-5)] rounded-[var(--radius-lg)]"
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
            Milestones
          </h3>

          <div className="space-y-[var(--space-3)]">
            {goal.milestones.map((milestone) => (
              <div
                key={milestone.percent}
                className="flex items-center gap-[var(--space-3)]"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`}
                  style={{
                    backgroundColor: milestone.achieved ? 'var(--carbon-low)' : 'var(--surface-bg)',
                    border: `2px solid ${milestone.achieved ? 'var(--carbon-low)' : 'var(--border-default)'}`,
                  }}
                >
                  {milestone.achieved && <Check className="w-4 h-4" style={{ color: 'white' }} />}
                </div>
                <div className="flex-1">
                  <div
                    className="font-medium"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: milestone.achieved ? 'var(--carbon-low)' : 'var(--text-primary)',
                    }}
                  >
                    {milestone.percent}% Complete
                  </div>
                  {milestone.achieved && milestone.achievedAt && (
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      Achieved {new Date(milestone.achievedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {((goal.currentEmissions - (milestone.percent / 100) * reductionAmount) / 1000).toFixed(1)}t
                </div>
              </div>
            ))}
          </div>
        </div>
      </TransitionWrapper>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getDefaultMilestones() {
  return [
    { percent: 10, achieved: false },
    { percent: 25, achieved: false },
    { percent: 50, achieved: false },
    { percent: 75, achieved: false },
    { percent: 100, achieved: false },
  ];
}

function getDefaultDeadline(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split('T')[0];
}

function getDaysRemaining(deadline: string): number {
  const now = new Date();
  const target = new Date(deadline);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getMilestoneMessage(percent: number): string {
  switch (percent) {
    case 10:
      return 'Great start! Every journey begins with a single step.';
    case 25:
      return "You're making real progress! Keep up the momentum.";
    case 50:
      return 'Halfway there! Your efforts are making a difference.';
    case 75:
      return "You're in the home stretch! Almost at your goal.";
    case 100:
      return "You did it! Time to celebrate and set a new goal!";
    default:
      return 'Another milestone achieved!';
  }
}
