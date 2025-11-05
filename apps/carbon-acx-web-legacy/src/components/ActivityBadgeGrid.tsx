import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Plus, X, Grid3x3, List, Zap, ArrowDown, Search, SlidersHorizontal } from 'lucide-react';

import type { ActivitySummary } from '../lib/api';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(
    () => !localStorage.getItem('acx:activity-browser-visited')
  );

  // Dialog state for adding activities
  const [dialogActivity, setDialogActivity] = useState<ActivitySummary | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('week');
  const [showTopThreePreview, setShowTopThreePreview] = useState(false);

  useEffect(() => {
    if (isFirstVisit) {
      localStorage.setItem('acx:activity-browser-visited', 'true');
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => setIsFirstVisit(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit]);

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

  // Filter activities by search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;

    const query = searchQuery.toLowerCase();
    return activities.filter((activity) => {
      return (
        activity.name?.toLowerCase().includes(query) ||
        activity.id.toLowerCase().includes(query) ||
        activity.category?.toLowerCase().includes(query) ||
        activity.description?.toLowerCase().includes(query)
      );
    });
  }, [activities, searchQuery]);

  const sortedActivities = useMemo(() => {
    const sorted = [...filteredActivities].sort((a, b) => {
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
  }, [filteredActivities, activityImpacts, sortBy, sortDirection]);

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

    // Convert to annual quantity based on timeframe
    const multiplier = timeframe === 'week' ? 52 : timeframe === 'month' ? 12 : 1;
    const annualQuantity = parsedQuantity * multiplier;

    const carbonIntensity = impact / 1000; // g to kg
    const annualEmissions = carbonIntensity * annualQuantity;

    addActivity({
      id: dialogActivity.id,
      sectorId,
      name: dialogActivity.name || dialogActivity.id,
      category: dialogActivity.category,
      quantity: annualQuantity,
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
    setTimeframe('week');
  };

  const selectedCount = activities.filter((a) => hasActivity(a.id)).length;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* First-time user guidance */}
        <AnimatePresence>
          {isFirstVisit && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 relative"
            >
              <button
                onClick={() => setIsFirstVisit(false)}
                className="absolute top-2 right-2 text-text-muted hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm font-medium text-foreground mb-1">
                👋 Select activities that match your operations
              </p>
              <p className="text-xs text-text-secondary pr-6">
                Click an activity card to add it to your profile. Don't worry - you can adjust quantities later.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="search"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Show search results count */}
        {searchQuery && (
          <p className="text-xs text-text-muted">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'result' : 'results'} for "{searchQuery}"
          </p>
        )}

        {/* Header with controls */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            {!showAdvanced ? (
              /* Simplified view - just show more options button */
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(true)}
                className="gap-1.5"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                More options
              </Button>
            ) : (
              /* Advanced controls */
              <>
                {/* Sort controls */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={sortBy === 'impact' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleSort('impact')}
                      className="gap-1.5"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Highest impact
                      {sortBy === 'impact' && (
                        <ArrowDown className={`h-3 w-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sort by carbon intensity (highest emissions per unit first)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={sortBy === 'name' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleSort('name')}
                      className="gap-1.5"
                    >
                      A-Z
                      {sortBy === 'name' && (
                        <ArrowDown className={`h-3 w-3 ${sortDirection === 'asc' ? '' : 'rotate-180'}`} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sort alphabetically (A-Z or Z-A)</TooltipContent>
                </Tooltip>

                {/* View mode toggle */}
                <div className="flex gap-1 border border-border rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 rounded transition-colors flex items-center gap-1.5 ${
                      viewMode === 'grid' ? 'bg-accent-500 text-white' : 'hover:bg-surface'
                    }`}
                    aria-pressed={viewMode === 'grid'}
                  >
                    <Grid3x3 className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-medium hidden sm:inline">Grid</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 rounded transition-colors flex items-center gap-1.5 ${
                      viewMode === 'list' ? 'bg-accent-500 text-white' : 'hover:bg-surface'
                    }`}
                    aria-pressed={viewMode === 'list'}
                  >
                    <List className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-medium hidden sm:inline">List</span>
                  </button>
                </div>

                {/* Quick add top 3 */}
                {selectedCount === 0 && sortedActivities.length >= 3 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowTopThreePreview(true)}
                        className="gap-1"
                      >
                        <Zap className="h-3 w-3" />
                        Quick Add Top 3
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Quickly add the 3 highest-impact activities</TooltipContent>
                  </Tooltip>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(false)}
                  className="gap-1.5"
                >
                  Hide options
                </Button>
              </>
            )}
          </div>

        <p className="text-sm text-text-muted">
          {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          {selectedCount > 0 && ` • ${selectedCount} in profile`}
        </p>
      </div>

      {/* Activity browser - Grid (6x2.5) or List view */}
      <div className={viewMode === 'grid' ? 'max-h-[290px] overflow-y-auto' : 'max-h-[400px] overflow-y-auto'}>
        {sortedActivities.length > 0 ? (
          viewMode === 'grid' ? (
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
          )
        ) : (
          <div className="text-center py-12 text-text-muted">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No activities match "{searchQuery}"</p>
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="mt-2">
              Clear search
            </Button>
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

      {/* Add Activity Dialog - Redesigned for better UX */}
      <Dialog open={!!dialogActivity} onOpenChange={(open) => !open && setDialogActivity(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {dialogActivity && (
                <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                  {dialogActivity.iconUrl ? (
                    <img src={dialogActivity.iconUrl} alt="" className="w-6 h-6" />
                  ) : (
                    <span className="text-xl">{dialogActivity.name?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              )}
              <span>Add to Your Profile</span>
            </DialogTitle>
            <DialogDescription className="text-base">
              Tell us about your <span className="font-semibold text-foreground">{dialogActivity?.name || 'activity'}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Quantity input with better UX */}
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-foreground mb-3">
                How often do you do this?
              </label>
              <div className="flex gap-2">
                <input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 text-lg font-semibold"
                  placeholder="0"
                  min="0"
                  step="0.1"
                  autoFocus
                />
                <div className="px-4 py-3 border-2 border-border rounded-lg bg-surface text-text-muted min-w-[100px] flex items-center justify-center font-medium">
                  {dialogActivity?.defaultUnit || 'units'}
                </div>
              </div>

              {/* Timeframe selector */}
              <div className="flex gap-2 mt-3">
                <span className="text-sm text-text-muted self-center">per</span>
                {(['week', 'month', 'year'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      timeframe === tf
                        ? 'bg-accent-500 text-white shadow-sm'
                        : 'bg-surface border border-border hover:border-accent-300'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual emissions preview */}
            {dialogActivity && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-800/30"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <span className="text-lg">🌍</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-orange-900 dark:text-orange-200 uppercase tracking-wide">
                      Estimated Impact
                    </p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                    {(() => {
                      const multiplier = timeframe === 'week' ? 52 : timeframe === 'month' ? 12 : 1;
                      const annualQty = parseFloat(quantity || '1') * multiplier;
                      const emissions = ((activityImpacts.get(dialogActivity.id) || 100) / 1000 * annualQty);
                      return emissions < 1 ? (emissions * 1000).toFixed(0) : emissions.toFixed(1);
                    })()}
                  </span>
                  <span className="text-lg text-orange-700 dark:text-orange-300 font-medium">
                    {(() => {
                      const multiplier = timeframe === 'week' ? 52 : timeframe === 'month' ? 12 : 1;
                      const annualQty = parseFloat(quantity || '1') * multiplier;
                      const emissions = ((activityImpacts.get(dialogActivity.id) || 100) / 1000 * annualQty);
                      return emissions < 1 ? 'g' : 'kg';
                    })()}
                    {' '}CO₂/year
                  </span>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                  That's {parseFloat(quantity || '1')} {dialogActivity?.defaultUnit || 'units'} per {timeframe}
                </p>
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDialogActivity(null);
                  setQuantity('1');
                  setTimeframe('week');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleAddActivity}
                disabled={!quantity || parseFloat(quantity) <= 0}
              >
                <Plus className="h-4 w-4" />
                Add to Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top 3 Confirmation Dialog */}
      <Dialog open={showTopThreePreview} onOpenChange={setShowTopThreePreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Top 3 Highest-Impact Activities?</DialogTitle>
            <DialogDescription>
              This will add these activities to your profile (default quantity: 1 unit/year):
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {sortedActivities.slice(0, 3).map((activity, i) => {
              const impact = activityImpacts.get(activity.id) || 0;
              return (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg border">
                  <span className="text-lg font-bold text-accent-600">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.name || activity.id}</p>
                    <p className="text-xs text-text-muted">{impact} g CO₂ per {activity.defaultUnit || 'unit'}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowTopThreePreview(false)} className="flex-1">
              Cancel
            </Button>
            <Button
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
                setShowTopThreePreview(false);
                showToast('success', 'Added to profile', 'Top 3 activities added. You can adjust quantities anytime.');
              }}
              className="flex-1"
            >
              Add to Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
