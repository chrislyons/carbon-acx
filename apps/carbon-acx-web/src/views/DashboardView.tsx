import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Activity, Trash2, Edit2, Calculator, Users, BarChart2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';

import { useProfile, type SelectedActivity } from '../contexts/ProfileContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import ExportButton from '../components/ExportButton';
import ComparativeBarChart from '../components/charts/ComparativeBarChart';
import TimeSeriesChart from '../components/charts/TimeSeriesChart';
import FullscreenChart from '../components/FullscreenChart';
import LayerManager from '../components/LayerManager';
import { formatTonnes, formatKg, formatPercent } from '../lib/formatCarbon';
import type { ComparativeDataPoint } from '../components/charts/ComparativeBarChart';
import type { TimeSeriesDataPoint } from '../components/charts/TimeSeriesChart';

/**
 * DashboardView - Personal carbon footprint dashboard
 *
 * Features:
 * - Real-time emissions total
 * - Breakdown by source (activities vs calculator)
 * - Comparison to global average (4.5t CO₂/year)
 * - Sector breakdown
 * - Activity management (edit quantities, remove)
 */

const GLOBAL_AVERAGE_KG = 4500; // 4.5 tonnes per year

export default function DashboardView() {
  const {
    profile,
    totalEmissions,
    removeActivity,
    updateActivityQuantity,
    getTimeSeriesData,
    history,
    toggleLayerVisibility,
    removeLayer,
    renameLayer,
  } = useProfile();

  // Edit dialog state
  const [editingActivity, setEditingActivity] = useState<SelectedActivity | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');

  // Handle edit activity
  const handleEditActivity = () => {
    if (!editingActivity) return;

    const parsedQuantity = parseFloat(editQuantity);
    if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
      updateActivityQuantity(editingActivity.id, parsedQuantity);
      setEditingActivity(null);
      setEditQuantity('');
    }
  };

  // Aggregate all activities from visible layers AND legacy activities
  const allActivities = useMemo(() => {
    const layerActivities = profile.layers
      .filter(layer => layer.visible)
      .flatMap(layer => layer.activities);
    return [...profile.activities, ...layerActivities];
  }, [profile.activities, profile.layers]);

  const activityEmissions = allActivities.reduce((sum, a) => sum + a.annualEmissions, 0);
  const calculatorEmissions = profile.calculatorResults.reduce((sum, r) => sum + r.annualEmissions, 0);

  const percentOfGlobalAvg = (totalEmissions / GLOBAL_AVERAGE_KG) * 100;
  const isBelowAverage = totalEmissions < GLOBAL_AVERAGE_KG;

  // Group activities by sector
  const activityBySector = allActivities.reduce((acc, activity) => {
    if (!acc[activity.sectorId]) {
      acc[activity.sectorId] = {
        sectorId: activity.sectorId,
        activities: [],
        total: 0,
      };
    }
    acc[activity.sectorId].activities.push(activity);
    acc[activity.sectorId].total += activity.annualEmissions;
    return acc;
  }, {} as Record<string, { sectorId: string; activities: typeof allActivities; total: number }>);

  const sectorBreakdown = Object.values(activityBySector).sort((a, b) => b.total - a.total);

  // Dashboard is empty only if there are NO activities/layers at all (not just hidden)
  const hasAnyData = profile.activities.length > 0 ||
                     profile.calculatorResults.length > 0 ||
                     profile.layers.length > 0;
  const isEmpty = !hasAnyData;

  // Prepare data for visualizations
  const comparativeData: ComparativeDataPoint[] = useMemo(() => {
    return allActivities
      .map((activity) => ({
        category: activity.name,
        value: activity.annualEmissions,
        baseline: totalEmissions / allActivities.length, // Average per activity
        label: `${activity.quantity} ${activity.unit}/year`,
        color: undefined,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 activities
  }, [allActivities, totalEmissions]);

  // Use real historical tracking data
  const timeSeriesData: TimeSeriesDataPoint[] = useMemo(() => {
    // If we have historical data, use it
    if (history.length > 0) {
      return getTimeSeriesData();
    }

    // Fallback: If no history yet, show current snapshot
    if (totalEmissions > 0) {
      return [
        {
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          value: totalEmissions,
          label: formatKg(totalEmissions),
        },
      ];
    }

    return [];
  }, [history, getTimeSeriesData, totalEmissions]);

  if (isEmpty) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Hero - Total Footprint - COMPACT */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl bg-gradient-to-br from-accent-500/10 via-surface to-accent-600/5 p-4 md:p-6 overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-accent-400/30 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent-600/20 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">Your Carbon Footprint</h2>
            <ExportButton />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total emissions */}
            <div className="p-4 rounded-xl bg-surface/80 border border-border/50">
              <p className="text-xs uppercase tracking-wide text-text-muted mb-1">
                Annual Emissions
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">
                  {formatTonnes(totalEmissions, false).split(' ')[0]}
                </span>
                <span className="text-lg text-text-muted">tonnes CO₂</span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                {formatKg(totalEmissions)} per year
              </p>
            </div>

            {/* Comparison to global average */}
            <div
              className={`p-4 rounded-xl border ${
                isBelowAverage
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30'
                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isBelowAverage ? (
                  <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                )}
                <p className="text-xs uppercase tracking-wide font-semibold">
                  vs Global Average
                </p>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  className={`text-4xl font-bold ${
                    isBelowAverage ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                  }`}
                >
                  {formatPercent(percentOfGlobalAvg)}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {isBelowAverage ? (
                  <>You're {formatPercent(100 - percentOfGlobalAvg)} below the global average of 4.5t CO₂/year</>
                ) : (
                  <>You're {formatPercent(percentOfGlobalAvg - 100)} above the global average of 4.5t CO₂/year</>
                )}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* VISUALIZATIONS - PRIME REAL ESTATE */}
      {allActivities.length > 0 && (
        <>
          {/* Emissions Trend */}
          {timeSeriesData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart2 className="h-5 w-5 text-accent-500" />
                    Emissions Trend
                  </CardTitle>
                  <p className="text-xs text-text-muted mt-1">
                    {history.length > 1
                      ? `Tracking ${history.length} snapshots over time`
                      : 'Historical tracking starts automatically (snapshots taken daily)'}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <FullscreenChart title="Emissions Trend" description="Track your carbon footprint over time">
                    <TimeSeriesChart
                      data={timeSeriesData}
                      valueKey="value"
                      variant="area"
                      showTrend={true}
                      referenceLines={[
                        {
                          value: GLOBAL_AVERAGE_KG,
                          label: 'Global Average (4.5t/year)',
                          color: '#ff7a45',
                        },
                      ]}
                      height={400}
                      animated={true}
                    />
                  </FullscreenChart>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Top Activities Comparison */}
          {comparativeData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart2 className="h-5 w-5 text-accent-500" />
                    Top Activities by Impact
                  </CardTitle>
                  <p className="text-xs text-text-muted mt-1">
                    Compare your highest-emission activities
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <FullscreenChart title="Top Activities by Impact" description="Compare your highest-emission activities">
                    <ComparativeBarChart
                      data={comparativeData}
                      orientation="horizontal"
                      showDelta={true}
                      sortBy="value"
                      sortDirection="desc"
                      axisLabel="Annual Emissions (kg CO₂)"
                      height={Math.max(400, comparativeData.length * 50)}
                      animated={true}
                    />
                  </FullscreenChart>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}

      {/* Breakdown - COMPACT */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {/* Sources breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-accent-500" />
              Emissions by Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {activityEmissions > 0 && (
              <SourceBreakdownItem
                label="Selected Activities"
                emissions={activityEmissions}
                total={totalEmissions}
                icon={<Activity className="h-3.5 w-3.5" />}
              />
            )}
            {calculatorEmissions > 0 && (
              <SourceBreakdownItem
                label="Quick Calculator"
                emissions={calculatorEmissions}
                total={totalEmissions}
                icon={<Calculator className="h-3.5 w-3.5" />}
              />
            )}
          </CardContent>
        </Card>

        {/* Sector breakdown */}
        {sectorBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-accent-500" />
                Emissions by Sector
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {sectorBreakdown.map((sector) => (
                <SourceBreakdownItem
                  key={sector.sectorId}
                  label={sector.sectorId}
                  emissions={sector.total}
                  total={totalEmissions}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Layer Manager */}
      {profile.layers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <LayerManager
            layers={profile.layers}
            onToggleVisibility={toggleLayerVisibility}
            onRemoveLayer={removeLayer}
            onRenameLayer={renameLayer}
          />
        </motion.div>
      )}

      {/* Activities list */}
      {profile.activities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Manual Activities</CardTitle>
              <p className="text-xs text-text-muted mt-1">
                {profile.activities.length} manual {profile.activities.length === 1 ? 'activity' : 'activities'} tracked
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.activities.map((activity) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent-300 transition-colors"
                  >
                    {/* Activity info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">
                        {activity.name}
                      </h4>
                      <p className="text-sm text-text-muted">
                        {activity.quantity} {activity.unit}/year
                        {activity.category && ` • ${activity.category}`}
                      </p>
                    </div>

                    {/* Emissions */}
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground">
                          {formatKg(activity.annualEmissions, false).split(' ')[0]}
                        </span>
                        <span className="text-sm text-text-muted">kg CO₂</span>
                      </div>
                      <p className="text-xs text-text-muted">
                        {formatPercent((activity.annualEmissions / totalEmissions) * 100)} of total
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => {
                          setEditingActivity(activity);
                          setEditQuantity(activity.quantity.toString());
                        }}
                        aria-label={`Edit ${activity.name}`}
                        title={`Edit ${activity.name}`}
                      >
                        <Edit2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => removeActivity(activity.id)}
                        aria-label={`Remove ${activity.name}`}
                        title={`Remove ${activity.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Calculator results */}
      {profile.calculatorResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4 text-accent-500" />
                Calculator Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.calculatorResults.map((result) => (
                  <div
                    key={result.category}
                    className="flex items-center justify-between p-4 rounded-xl border border-border"
                  >
                    <div>
                      <h4 className="font-semibold text-foreground">{result.label}</h4>
                      <p className="text-sm text-text-muted capitalize">{result.category}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground">
                          {formatKg(result.annualEmissions, false).split(' ')[0]}
                        </span>
                        <span className="text-sm text-text-muted">kg CO₂</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Edit Activity Dialog */}
      <Dialog open={!!editingActivity} onOpenChange={(open) => !open && setEditingActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
            <DialogDescription>
              Update the annual quantity for {editingActivity?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <label htmlFor="edit-quantity" className="block text-sm font-medium text-foreground mb-2">
                Annual quantity
              </label>
              <div className="flex gap-2">
                <input
                  id="edit-quantity"
                  type="number"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEditActivity();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="Enter quantity"
                  min="0"
                  step="0.1"
                  autoFocus
                />
                <div className="px-3 py-2 border border-border rounded-lg bg-surface text-text-muted min-w-[80px] flex items-center justify-center">
                  {editingActivity?.unit || 'units'}
                </div>
              </div>
            </div>

            {editingActivity && (
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <p className="text-sm text-text-muted mb-1">Estimated annual emissions:</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatKg(editingActivity.carbonIntensity * parseFloat(editQuantity || '0'))}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingActivity(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleEditActivity}
                disabled={!editQuantity || parseFloat(editQuantity) <= 0}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SourceBreakdownItem({
  label,
  emissions,
  total,
  icon,
}: {
  label: string;
  emissions: number;
  total: number;
  icon?: React.ReactNode;
}) {
  const percentage = (emissions / total) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-text-muted">{icon}</span>}
          <span className="font-medium text-foreground">{label}</span>
        </div>
        <span className="text-text-muted">{formatPercent(percentage)}</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="h-full bg-accent-500 rounded-full"
        />
      </div>
      <div className="flex items-baseline gap-1 justify-end">
        <span className="text-base font-bold text-foreground">
          {formatKg(emissions, false).split(' ')[0]}
        </span>
        <span className="text-[10px] text-text-muted">kg CO₂/year</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-2xl space-y-8 w-full"
      >
        <div className="mx-auto w-24 h-24 rounded-full bg-accent-100 flex items-center justify-center">
          <Activity className="h-12 w-12 text-accent-600" />
        </div>

        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Ready to calculate your carbon footprint?
          </h2>
          <p className="text-text-secondary">
            Choose your preferred approach - both give you a complete emissions profile.
          </p>
        </div>

        {/* Decision cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quick path */}
          <Link to="/?calculator=true">
            <Card className="border-2 border-border hover:border-accent-500 transition-all cursor-pointer group h-full">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Calculator className="h-6 w-6 text-accent-600" />
                  <CardTitle className="text-lg">Quick Calculator</CardTitle>
                </div>
                <Badge variant="secondary" className="w-fit">~2 minutes</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Answer 4 simple questions for an instant estimate.
                </p>
                <ul className="text-xs text-text-secondary space-y-1 mb-4">
                  <li>✓ Commute distance</li>
                  <li>✓ Diet type</li>
                  <li>✓ Energy usage</li>
                  <li>✓ Shopping habits</li>
                </ul>
                <div className="flex items-center gap-2 text-accent-600 text-sm font-medium group-hover:gap-3 transition-all">
                  Start quick calc
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Detailed path */}
          <Link to="/">
            <Card className="border-2 border-border hover:border-accent-500 transition-all cursor-pointer group h-full">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <BarChart2 className="h-6 w-6 text-accent-600" />
                  <CardTitle className="text-lg">Detailed Analysis</CardTitle>
                </div>
                <Badge variant="secondary" className="w-fit">~10 minutes</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary mb-4">
                  Build your profile by selecting specific activities.
                </p>
                <ul className="text-xs text-text-secondary space-y-1 mb-4">
                  <li>✓ Audit-ready reports</li>
                  <li>✓ Activity-level tracking</li>
                  <li>✓ Scenario comparison</li>
                  <li>✓ Full provenance</li>
                </ul>
                <div className="flex items-center gap-2 text-accent-600 text-sm font-medium group-hover:gap-3 transition-all">
                  Browse sectors
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Help link */}
        <p className="text-xs text-text-muted">
          Not sure which to choose?{' '}
          <a href="#" className="text-accent-600 hover:underline">
            See comparison guide
          </a>
        </p>
      </motion.div>
    </div>
  );
}
