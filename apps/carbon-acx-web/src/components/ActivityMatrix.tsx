import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Check, Plus, X } from 'lucide-react';

import type { ActivitySummary } from '../lib/api';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface ActivityMatrixProps {
  activities: ActivitySummary[];
  sectorId: string;
}

export default function ActivityMatrix({
  activities,
  sectorId,
}: ActivityMatrixProps) {
  const { hasActivity, addActivity, removeActivity } = useProfile();
  const { showToast } = useToast();
  const [sortBy, setSortBy] = useState<'name' | 'impact'>('impact');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Dialog state for adding activities
  const [dialogActivity, setDialogActivity] = useState<ActivitySummary | null>(null);
  const [quantity, setQuantity] = useState<string>('1');

  // Mock carbon impact data (in future, this comes from API)
  const activityImpacts = useMemo(() => {
    const impacts = new Map<string, number>();
    activities.forEach((activity) => {
      // Generate semi-realistic mock data based on activity name
      const nameHash = activity.name?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
      const impact = 50 + (nameHash % 450); // 50-500g CO₂
      impacts.set(activity.id, impact);
    });
    return impacts;
  }, [activities]);

  const sortedActivities = useMemo(() => {
    const sorted = [...activities].sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.name || a.id;
        const nameB = b.name || b.id;
        return sortDirection === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else {
        const impactA = activityImpacts.get(a.id) || 0;
        const impactB = activityImpacts.get(b.id) || 0;
        return sortDirection === 'asc' ? impactA - impactB : impactB - impactA;
      }
    });
    return sorted;
  }, [activities, activityImpacts, sortBy, sortDirection]);

  const maxImpact = Math.max(...Array.from(activityImpacts.values()));

  const toggleSort = (newSortBy: 'name' | 'impact') => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('desc');
    }
  };

  const handleActivityClick = (activity: ActivitySummary) => {
    const isInProfile = hasActivity(activity.id);

    if (isInProfile) {
      // Remove from profile
      removeActivity(activity.id);
      showToast(
        'info',
        'Activity removed',
        `${activity.name || activity.id} removed from your profile`
      );
    } else {
      // Show dialog to add with quantity
      setDialogActivity(activity);
      setQuantity('1');
    }
  };

  const handleAddActivity = () => {
    if (!dialogActivity) return;

    const impact = activityImpacts.get(dialogActivity.id) || 100;
    const parsedQuantity = parseFloat(quantity) || 1;

    // Convert g CO₂ to kg CO₂ and multiply by quantity
    const carbonIntensity = impact / 1000; // g to kg
    const annualEmissions = carbonIntensity * parsedQuantity;

    addActivity({
      id: dialogActivity.id,
      sectorId,
      name: dialogActivity.name || dialogActivity.id,
      category: dialogActivity.category,
      quantity: parsedQuantity,
      unit: dialogActivity.defaultUnit || 'unit',
      carbonIntensity,
      annualEmissions,
    });

    showToast(
      'success',
      'Activity added!',
      `${dialogActivity.name || dialogActivity.id} (${annualEmissions.toFixed(2)} kg CO₂/year) added to your profile`
    );

    setDialogActivity(null);
    setQuantity('1');
  };

  const selectedCount = activities.filter((a) => hasActivity(a.id)).length;

  return (
    <div className="space-y-4">
      {/* Header with sorting */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'impact' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('impact')}
            className="gap-1"
          >
            By impact
            {sortBy === 'impact' && <ArrowUpDown className="h-3 w-3" />}
          </Button>
          <Button
            variant={sortBy === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('name')}
            className="gap-1"
          >
            Alphabetical
            {sortBy === 'name' && <ArrowUpDown className="h-3 w-3" />}
          </Button>
        </div>
        <p className="text-sm text-text-muted">
          {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
        </p>
      </div>

      {/* Activity grid */}
      <div className="space-y-2">
        {sortedActivities.map((activity, index) => {
          const impact = activityImpacts.get(activity.id) || 0;
          const percentage = (impact / maxImpact) * 100;
          const isSelected = hasActivity(activity.id);

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: isSelected ? [1, 1.02, 1] : 1,
              }}
              transition={{
                delay: index * 0.03,
                duration: 0.3,
                scale: { duration: 0.2 }
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-accent-500 bg-accent-50 shadow-md'
                  : 'border-border hover:border-accent-300 bg-surface/50'
              }`}
              onClick={() => handleActivityClick(activity)}
            >
              {/* Background bar showing relative impact */}
              <div
                className={`absolute inset-0 rounded-xl transition-all ${
                  isSelected ? 'bg-accent-100/40' : 'bg-neutral-100/40'
                }`}
                style={{
                  width: `${percentage}%`,
                  opacity: 0.4,
                }}
              />

              {/* Content */}
              <div className="relative flex items-center gap-4">
                {/* Selection indicator */}
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-accent-500 bg-accent-500'
                      : 'border-border group-hover:border-accent-400'
                  }`}
                >
                  {isSelected ? (
                    <Check className="h-4 w-4 text-white" />
                  ) : (
                    <Plus className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>

                {/* Activity info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate">
                    {activity.name || activity.id}
                  </h4>
                  {activity.description && (
                    <p className="text-sm text-text-muted truncate">
                      {activity.description}
                    </p>
                  )}
                  {activity.category && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-neutral-100 text-text-muted">
                      {activity.category}
                    </span>
                  )}
                </div>

                {/* Impact indicator */}
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold ${getImpactColor(impact)}`}>
                      {impact}
                    </span>
                    <span className="text-sm text-text-muted">g CO₂</span>
                  </div>
                  {activity.defaultUnit && (
                    <p className="text-xs text-text-muted">per {activity.defaultUnit}</p>
                  )}
                </div>
              </div>

              {/* Visual impact bar */}
              <div className="relative mt-3 h-2 rounded-full bg-neutral-200/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: index * 0.03 + 0.2, duration: 0.6 }}
                  className={`h-full rounded-full ${
                    isSelected ? 'bg-accent-500' : getImpactBarColor(impact)
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary stats if activities are selected */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-accent-50 border border-accent-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Added to profile</p>
                <p className="text-xs text-text-muted">
                  Visit your dashboard to see total impact
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-accent-600">
                  {selectedCount}
                </div>
                <p className="text-xs text-text-muted">activities</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Activity Dialog */}
      <Dialog open={!!dialogActivity} onOpenChange={(open) => !open && setDialogActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity to Profile</DialogTitle>
            <DialogDescription>
              How much {dialogActivity?.name || 'of this activity'} do you use per year?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-foreground mb-2">
                Annual quantity
              </label>
              <div className="flex gap-2">
                <input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="Enter quantity"
                  min="0"
                  step="0.1"
                />
                <div className="px-3 py-2 border border-border rounded-lg bg-surface text-text-muted min-w-[80px] flex items-center justify-center">
                  {dialogActivity?.defaultUnit || 'units'}
                </div>
              </div>
            </div>

            {dialogActivity && (
              <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                <p className="text-sm text-text-muted mb-1">Estimated annual emissions:</p>
                <p className="text-2xl font-bold text-foreground">
                  {((activityImpacts.get(dialogActivity.id) || 100) / 1000 * parseFloat(quantity || '1')).toFixed(2)} kg CO₂
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogActivity(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddActivity}
                disabled={!quantity || parseFloat(quantity) <= 0}
              >
                Add to Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getImpactColor(impact: number): string {
  if (impact < 100) return 'text-accent-success';
  if (impact < 250) return 'text-accent-warning';
  return 'text-accent-danger';
}

function getImpactBarColor(impact: number): string {
  if (impact < 100) return 'bg-accent-success';
  if (impact < 250) return 'bg-accent-warning';
  return 'bg-accent-danger';
}

export function ActivityMatrixSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
