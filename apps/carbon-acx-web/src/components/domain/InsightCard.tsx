/**
 * InsightCard - Display automated insights about emissions data
 *
 * Features:
 * - Multiple insight types (trend, anomaly, comparison, recommendation)
 * - Visual indicators (icons, colors)
 * - Action buttons for further exploration
 * - Design token consistency
 * - Accessible markup
 *
 * Phase 2 Week 5 implementation
 */

import * as React from 'react';
import { Button } from '../system/Button';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Target, ArrowRight } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type InsightType = 'trend' | 'anomaly' | 'comparison' | 'recommendation' | 'achievement';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  value?: number | string;
  change?: number; // Percentage change
  severity?: 'low' | 'medium' | 'high';
  action?: {
    label: string;
    onClick: () => void;
  };
  metadata?: {
    dataPoints?: number;
    confidence?: number;
    timeRange?: string;
  };
}

export interface InsightCardProps {
  insight: Insight;
  compact?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function InsightCard({ insight, compact = false }: InsightCardProps) {
  const config = getInsightConfig(insight.type);
  const Icon = config.icon;

  return (
    <div
      className={`rounded-[var(--radius-lg)] p-[var(--space-${compact ? '4' : '6'})] transition-all hover:scale-[1.01]`}
      style={{
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
      }}
      role="article"
      aria-labelledby={`insight-${insight.id}-title`}
    >
      {/* Header */}
      <div className="flex items-start gap-[var(--space-3)] mb-[var(--space-3)]">
        <div
          className={`p-[var(--space-2)] rounded-[var(--radius-md)] flex-shrink-0`}
          style={{
            backgroundColor: config.iconBg,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: config.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            id={`insight-${insight.id}-title`}
            className="font-semibold mb-[var(--space-1)]"
            style={{
              fontSize: compact ? 'var(--font-size-sm)' : 'var(--font-size-base)',
              color: 'var(--text-primary)',
            }}
          >
            {insight.title}
          </h3>
          {!compact && insight.metadata && (
            <div
              className="flex items-center gap-[var(--space-2)]"
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-tertiary)',
              }}
            >
              {insight.metadata.timeRange && <span>{insight.metadata.timeRange}</span>}
              {insight.metadata.confidence && (
                <>
                  <span>•</span>
                  <span>{Math.round(insight.metadata.confidence * 100)}% confidence</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Value & Change */}
      {insight.value !== undefined && (
        <div className="mb-[var(--space-3)]">
          <div className="flex items-baseline gap-[var(--space-2)]">
            <span
              className="font-bold"
              style={{
                fontSize: compact ? 'var(--font-size-2xl)' : 'var(--font-size-3xl)',
                color: 'var(--text-primary)',
              }}
            >
              {insight.value}
            </span>
            {insight.change !== undefined && (
              <span
                className="flex items-center gap-[var(--space-1)] font-medium"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: insight.change > 0 ? 'var(--carbon-high)' : 'var(--carbon-low)',
                }}
              >
                {insight.change > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(insight.change).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      <p
        className="mb-[var(--space-4)]"
        style={{
          fontSize: compact ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
          color: 'var(--text-secondary)',
          lineHeight: '1.5',
        }}
      >
        {insight.description}
      </p>

      {/* Action */}
      {insight.action && !compact && (
        <Button
          variant="ghost"
          size="sm"
          onClick={insight.action.onClick}
          icon={<ArrowRight className="w-4 h-4" />}
          style={{
            color: config.iconColor,
          }}
        >
          {insight.action.label}
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

interface InsightConfig {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  bgColor: string;
  borderColor: string;
}

function getInsightConfig(type: InsightType): InsightConfig {
  switch (type) {
    case 'trend':
      return {
        icon: TrendingUp,
        iconColor: 'var(--color-baseline)',
        iconBg: 'var(--color-baseline-bg)',
        bgColor: 'var(--surface-elevated)',
        borderColor: 'var(--border-default)',
      };

    case 'anomaly':
      return {
        icon: AlertTriangle,
        iconColor: 'var(--carbon-high)',
        iconBg: 'var(--carbon-high-bg)',
        bgColor: 'var(--surface-elevated)',
        borderColor: 'var(--border-default)',
      };

    case 'comparison':
      return {
        icon: Target,
        iconColor: 'var(--color-goal)',
        iconBg: 'var(--color-goal-bg)',
        bgColor: 'var(--surface-elevated)',
        borderColor: 'var(--border-default)',
      };

    case 'recommendation':
      return {
        icon: Lightbulb,
        iconColor: 'var(--color-improvement)',
        iconBg: 'var(--carbon-low-bg)',
        bgColor: 'var(--surface-elevated)',
        borderColor: 'var(--border-default)',
      };

    case 'achievement':
      return {
        icon: TrendingDown,
        iconColor: 'var(--carbon-low)',
        iconBg: 'var(--carbon-low-bg)',
        bgColor: 'var(--color-improvement-bg)',
        borderColor: 'var(--carbon-low)',
      };

    default:
      return {
        icon: Lightbulb,
        iconColor: 'var(--text-secondary)',
        iconBg: 'var(--surface-bg)',
        bgColor: 'var(--surface-elevated)',
        borderColor: 'var(--border-default)',
      };
  }
}

// ============================================================================
// Insight Generation Utilities
// ============================================================================

export interface EmissionsData {
  total: number;
  breakdown: Record<string, number>;
  history?: Array<{ date: string; value: number }>;
  activities: Array<{ id: string; name: string; emissions: number; category: string }>;
}

/**
 * Automatically detect insights from emissions data
 */
export function detectInsights(data: EmissionsData): Insight[] {
  const insights: Insight[] = [];

  // 1. Trend insights
  if (data.history && data.history.length >= 2) {
    const latest = data.history[data.history.length - 1].value;
    const previous = data.history[data.history.length - 2].value;
    const change = ((latest - previous) / previous) * 100;

    if (Math.abs(change) > 5) {
      insights.push({
        id: 'trend-monthly',
        type: change < 0 ? 'achievement' : 'trend',
        title: change < 0 ? 'Emissions Decreasing' : 'Emissions Increasing',
        description: change < 0
          ? `Your emissions decreased by ${Math.abs(change).toFixed(1)}% compared to last month. Keep up the great work!`
          : `Your emissions increased by ${change.toFixed(1)}% compared to last month. Consider reviewing recent activity changes.`,
        value: `${Math.abs(change).toFixed(1)}%`,
        change,
        metadata: {
          timeRange: 'Last month',
          confidence: 0.9,
        },
        action: {
          label: 'View timeline',
          onClick: () => console.log('Navigate to timeline'),
        },
      });
    }
  }

  // 2. Highest category insight
  const sortedCategories = Object.entries(data.breakdown).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length > 0) {
    const [category, amount] = sortedCategories[0];
    const percentage = (amount / data.total) * 100;

    insights.push({
      id: 'category-highest',
      type: 'comparison',
      title: `${category} is Your Largest Source`,
      description: `${category} accounts for ${percentage.toFixed(0)}% of your total emissions. This is your primary opportunity for reduction.`,
      value: `${percentage.toFixed(0)}%`,
      metadata: {
        confidence: 1.0,
      },
      action: {
        label: 'Explore alternatives',
        onClick: () => console.log('Navigate to category'),
      },
    });
  }

  // 3. Quick win recommendations
  const highImpactActivities = data.activities
    .sort((a, b) => b.emissions - a.emissions)
    .slice(0, 3);

  if (highImpactActivities.length > 0) {
    const topActivity = highImpactActivities[0];
    const potentialSavings = topActivity.emissions * 0.3; // Assume 30% reduction potential

    insights.push({
      id: 'recommendation-quickwin',
      type: 'recommendation',
      title: 'Quick Win Opportunity',
      description: `Reducing "${topActivity.name}" by just 30% could save ${(potentialSavings / 1000).toFixed(1)} tonnes CO₂ annually.`,
      value: `${(potentialSavings / 1000).toFixed(1)}t`,
      metadata: {
        confidence: 0.75,
      },
      action: {
        label: 'Create scenario',
        onClick: () => console.log('Open scenario builder'),
      },
    });
  }

  // 4. Anomaly detection (placeholder - would use statistical analysis)
  const avgEmission = data.activities.reduce((sum, a) => sum + a.emissions, 0) / data.activities.length;
  const outliers = data.activities.filter(a => a.emissions > avgEmission * 3);

  if (outliers.length > 0) {
    insights.push({
      id: 'anomaly-outlier',
      type: 'anomaly',
      title: 'Unusually High Activity Detected',
      description: `"${outliers[0].name}" has significantly higher emissions than your other activities. Double-check the quantity or consider alternatives.`,
      severity: 'high',
      metadata: {
        dataPoints: data.activities.length,
        confidence: 0.85,
      },
      action: {
        label: 'Review activity',
        onClick: () => console.log('Navigate to activity'),
      },
    });
  }

  return insights;
}
