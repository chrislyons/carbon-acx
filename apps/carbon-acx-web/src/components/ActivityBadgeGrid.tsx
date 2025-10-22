import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Plus, X, Grid3x3, List } from 'lucide-react';

import type { ActivitySummary } from '../lib/api';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from './ui/button';
import ActivityBadge from './ActivityBadge';
import { inferIconType } from '../lib/activityIcons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

/**
 * ActivityBadgeGrid - Gamified badge-based activity selection
 *
 * Transforms activity selection into a visual collection experience.
 * Users "collect" icon badges to build their carbon profile.
 */

interface ActivityBadgeGridProps {
  activities: ActivitySummary[];
  sectorId: string;
}

export default function ActivityBadgeGrid({
  activities,
  sectorId,
}: ActivityBadgeGridProps) {
  const { hasActivity, addActivity, removeActivity } = useProfile();
  const { showToast } = useToast();
  const [sortBy, setSortBy] = useState<'name' | 'impact'>('impact');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Dialog state for adding activities
  const [dialogActivity, setDialogActivity] = useState<ActivitySummary | null>(null);
  const [quantity, setQuantity] = useState<string>('1');

  // Mock carbon impact data (future: from API)
  const activityImpacts = useMemo(() => {
    const impacts = new Map<string, number>();
    activities.forEach((activity) => {
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
      // Remove from profile (instant feedback)
      removeActivity(activity.id);
      showToast(
        'info',
        'Removed',
        `${activity.name || activity.id} removed from profile`
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
      'Added to profile',
      `${dialogActivity.name || dialogActivity.id}`
    );

    setDialogActivity(null);
    setQuantity('1');
  };

  const selectedCount = activities.filter((a) => hasActivity(a.id)).length;

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {/* Sort controls */}
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

          {/* View mode toggle */}
          <div className="flex gap-1 border border-border rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                viewMode === 'grid' ? 'bg-accent-500 text-white' : 'hover:bg-surface'
              }`}
              title="Grid view"
              aria-label="Switch to grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <Grid3x3 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                viewMode === 'list' ? 'bg-accent-500 text-white' : 'hover:bg-surface'
              }`}
              title="List view"
              aria-label="Switch to list view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Quick add top 3 */}
          {selectedCount === 0 && sortedActivities.length >= 3 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                sortedActivities.slice(0, 3).forEach((activity) => {
                  if (!hasActivity(activity.id)) {
                    const impact = activityImpacts.get(activity.id) || 100;
                    const carbonIntensity = impact / 1000;
                    addActivity({
                      id: activity.id,
                      sectorId,
                      name: activity.name || activity.id,
                      category: activity.category,
                      quantity: 1,
                      unit: activity.defaultUnit || 'unit',
                      carbonIntensity,
                      annualEmissions: carbonIntensity,
                    });
                  }
                });
                showToast('success', 'Added', 'Top 3 activities added to profile');
              }}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Top 3
            </Button>
          )}
        </div>

        <p className="text-sm text-text-muted">
          {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          {selectedCount > 0 && ` • ${selectedCount} in profile`}
        </p>
      </div>

      {/* Activity browser - Grid (6x2.5) or List view */}
      <div className={viewMode === 'grid' ? 'max-h-[290px] overflow-y-auto' : 'max-h-[400px] overflow-y-auto'}>
        {viewMode === 'grid' ? (
          <motion.div
            layout
            className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3"
          >
            {sortedActivities.map((activity) => {
              const impact = activityImpacts.get(activity.id) || 0;
              const isSelected = hasActivity(activity.id);
              const iconType = activity.iconType || inferIconType(activity.name, activity.category);

              return (
                <ActivityBadge
                  key={activity.id}
                  name={activity.name || activity.id}
                  emissions={impact}
                  iconUrl={activity.iconUrl}
                  iconType={iconType}
                  badgeColor={activity.badgeColor}
                  isSelected={isSelected}
                  onClick={() => handleActivityClick(activity)}
                  onValueSubmit={(value) => {
                    const carbonIntensity = impact / 1000; // g to kg
                    const annualEmissions = carbonIntensity * value;
                    addActivity({
                      id: activity.id,
                      sectorId,
                      name: activity.name || activity.id,
                      category: activity.category,
                      quantity: value,
                      unit: activity.defaultUnit || 'unit',
                      carbonIntensity,
                      annualEmissions,
                    });
                  }}
                  size="md"
                  showEmissions={true}
                />
              );
            })}
          </motion.div>
        ) : (
          <div className="space-y-2">
            {sortedActivities.map((activity, index) => {
              const impact = activityImpacts.get(activity.id) || 0;
              const isSelected = hasActivity(activity.id);
              const iconType = activity.iconType || inferIconType(activity.name, activity.category);

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-border hover:border-accent-300 bg-surface'
                  }`}
                  onClick={() => handleActivityClick(activity)}
                >
                  {/* Icon */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <ActivityBadge
                      name={activity.name || activity.id}
                      emissions={impact}
                      iconUrl={activity.iconUrl}
                      iconType={iconType}
                      badgeColor={activity.badgeColor}
                      isSelected={isSelected}
                      onValueSubmit={(value) => {
                        const carbonIntensity = impact / 1000;
                        const annualEmissions = carbonIntensity * value;
                        addActivity({
                          id: activity.id,
                          sectorId,
                          name: activity.name || activity.id,
                          category: activity.category,
                          quantity: value,
                          unit: activity.defaultUnit || 'unit',
                          carbonIntensity,
                          annualEmissions,
                        });
                      }}
                      size="sm"
                      showEmissions={false}
                    />
                  </div>

                  {/* Activity details */}
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
                    <div className="text-2xl font-bold text-accent-600">
                      {impact}
                    </div>
                    <p className="text-xs text-text-muted">g CO₂</p>
                    {activity.defaultUnit && (
                      <p className="text-xs text-text-muted">per {activity.defaultUnit}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collection summary */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-accent-50 border border-accent-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {selectedCount} {selectedCount !== 1 ? 'activities' : 'activity'} in your profile
                </p>
                <p className="text-xs text-text-muted">
                  View dashboard to see total impact
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  activities.forEach((activity) => {
                    if (hasActivity(activity.id)) {
                      removeActivity(activity.id);
                    }
                  });
                  showToast('info', 'Cleared', `Removed ${selectedCount} activities from profile`);
                }}
                className="gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Activity Dialog */}
      <Dialog open={!!dialogActivity} onOpenChange={(open) => !open && setDialogActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Profile</DialogTitle>
            <DialogDescription>
              How much {dialogActivity?.name || 'of this activity'} per year?
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
