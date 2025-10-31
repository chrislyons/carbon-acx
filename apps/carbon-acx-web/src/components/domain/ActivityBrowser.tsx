/**
 * ActivityBrowser - Manual activity selection for baseline establishment
 *
 * Allows users to browse sectors and add activities to their profile.
 * Integrates with Phase 1 canvas-first design system and Zustand store.
 *
 * Features:
 * - Sector navigation
 * - Activity selection with quick add
 * - Real emission factor data from API
 * - Progress tracking toward baseline goal
 * - Phase 1 design tokens and animations
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Search, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../system/Button';
import { useAppStore } from '../../hooks/useAppStore';
import { loadSectors, loadActivities, loadEmissionFactors, type ActivitySummary, type SectorSummary, type EmissionFactor } from '../../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../system/Dialog';

// ============================================================================
// Types
// ============================================================================

export interface ActivityBrowserProps {
  /** Target number of activities for baseline */
  targetActivities?: number;
  /** Callback when target reached */
  onTargetReached?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function ActivityBrowser({ targetActivities = 5, onTargetReached }: ActivityBrowserProps) {
  const [sectors, setSectors] = React.useState<SectorSummary[]>([]);
  const [selectedSector, setSelectedSector] = React.useState<string | null>(null);
  const [activities, setActivities] = React.useState<ActivitySummary[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [loadingState, setLoadingState] = React.useState<'sectors' | 'activities' | 'factors' | 'idle'>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [emissionFactors, setEmissionFactors] = React.useState<EmissionFactor[]>([]);
  const [emissionFactorsLoaded, setEmissionFactorsLoaded] = React.useState(false);

  // Quantity dialog state
  const [quantityDialogOpen, setQuantityDialogOpen] = React.useState(false);
  const [selectedActivityForQuantity, setSelectedActivityForQuantity] = React.useState<ActivitySummary | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [quantityError, setQuantityError] = React.useState<string | null>(null);

  // Store actions
  const addActivity = useAppStore((state) => state.addActivity);
  const removeActivity = useAppStore((state) => state.removeActivity);
  const profileActivities = useAppStore((state) => state.profile.activities);

  const activityCount = profileActivities.length;
  const progress = Math.min(activityCount / targetActivities, 1);

  // Load emission factors on mount
  React.useEffect(() => {
    setLoadingState('factors');
    loadEmissionFactors()
      .then((data) => {
        setEmissionFactors(data);
        setEmissionFactorsLoaded(true);
        setLoadingState('idle');
      })
      .catch((err) => {
        console.error('Failed to load emission factors:', err);
        setEmissionFactorsLoaded(true); // Mark as loaded even on error to continue
        setLoadingState('idle');
      });
  }, []);

  // Load sectors on mount
  React.useEffect(() => {
    setLoadingState('sectors');
    loadSectors()
      .then((data) => {
        setSectors(data);
        setLoadingState('idle');
        // Auto-select first sector
        if (data.length > 0) {
          setSelectedSector(data[0].id);
        }
      })
      .catch((err) => {
        setError(`Failed to load sectors: ${err.message}`);
        setLoadingState('idle');
      });
  }, []);

  // Load activities when sector changes
  React.useEffect(() => {
    if (!selectedSector) return;

    setLoadingState('activities');
    setActivities([]);
    loadActivities(selectedSector)
      .then((data) => {
        setActivities(data);
        setLoadingState('idle');
      })
      .catch((err) => {
        setError(`Failed to load activities: ${err.message}`);
        setLoadingState('idle');
      });
  }, [selectedSector]);

  // Check if target reached
  React.useEffect(() => {
    if (activityCount >= targetActivities && onTargetReached) {
      onTargetReached();
    }
  }, [activityCount, targetActivities, onTargetReached]);

  // Helper to find emission factor for an activity
  const getEmissionFactor = (activity: ActivitySummary): { carbonIntensity: number; warning?: string } => {
    // Try to find matching emission factor by activityId and sectorId
    const factor = emissionFactors.find(
      (ef) => ef.activityId === activity.id && ef.sectorId === activity.sectorId
    );

    if (factor && factor.valueGPerUnit != null) {
      // Convert g CO₂ to kg CO₂
      return { carbonIntensity: factor.valueGPerUnit / 1000 };
    }

    // Fallback to sector-level factor if no exact match
    const sectorFactor = emissionFactors.find((ef) => ef.sectorId === activity.sectorId);
    if (sectorFactor && sectorFactor.valueGPerUnit != null) {
      return {
        carbonIntensity: sectorFactor.valueGPerUnit / 1000,
        warning: 'Using sector average (activity-specific factor not available)',
      };
    }

    // Default fallback
    return {
      carbonIntensity: 0.5,
      warning: 'Using default estimate (emission factor not available)',
    };
  };

  // Activity selection
  const hasActivity = (activityId: string) => {
    return profileActivities.some((a) => a.id === activityId);
  };

  const handleActivityToggle = (activity: ActivitySummary) => {
    if (hasActivity(activity.id)) {
      removeActivity(activity.id);
    } else {
      // Open quantity dialog instead of immediately adding
      setSelectedActivityForQuantity(activity);
      setQuantity(1);
      setQuantityError(null);
      setQuantityDialogOpen(true);
    }
  };

  const handleConfirmQuantity = () => {
    if (!selectedActivityForQuantity) return;

    // Validate quantity
    if (quantity <= 0) {
      setQuantityError('Quantity must be greater than 0');
      return;
    }

    if (quantity < 0.1) {
      setQuantityError('Quantity must be at least 0.1');
      return;
    }

    const { carbonIntensity, warning } = getEmissionFactor(selectedActivityForQuantity);

    if (warning) {
      console.warn(`Activity ${selectedActivityForQuantity.id}: ${warning}`);
    }

    addActivity({
      id: selectedActivityForQuantity.id,
      sectorId: selectedActivityForQuantity.sectorId,
      name: selectedActivityForQuantity.name || selectedActivityForQuantity.id,
      category: selectedActivityForQuantity.category,
      quantity,
      unit: selectedActivityForQuantity.defaultUnit || 'unit',
      carbonIntensity,
      annualEmissions: carbonIntensity * quantity,
      iconType: selectedActivityForQuantity.iconType ?? undefined,
      iconUrl: selectedActivityForQuantity.iconUrl ?? undefined,
      badgeColor: selectedActivityForQuantity.badgeColor ?? undefined,
    });

    // Close dialog
    setQuantityDialogOpen(false);
    setSelectedActivityForQuantity(null);
  };

  // Filter activities by search
  const filteredActivities = React.useMemo(() => {
    if (!searchQuery) return activities;
    const query = searchQuery.toLowerCase();
    return activities.filter(
      (a) =>
        a.name?.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        a.category?.toLowerCase().includes(query)
    );
  }, [activities, searchQuery]);

  if (error) {
    return (
      <div
        className="p-[var(--space-8)] rounded-[var(--radius-lg)] text-center"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        <p style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-base)' }}>
          {error}
        </p>
        <Button
          variant="secondary"
          size="md"
          onClick={() => window.location.reload()}
          className="mt-[var(--space-4)]"
        >
          Reload
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-[var(--space-6)]">
      {/* Progress indicator */}
      <div
        className="p-[var(--space-4)] rounded-[var(--radius-lg)]"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between mb-[var(--space-2)]">
          <span
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            Activities added
          </span>
          <span
            className="font-bold"
            style={{
              fontSize: 'var(--font-size-lg)',
              color: 'var(--text-primary)',
            }}
          >
            {activityCount} / {targetActivities}
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--surface-bg)' }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: 'var(--color-goal)' }}
          />
        </div>
      </div>

      {/* Main content area - horizontal split on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-[var(--space-6)]">
        {/* Sector sidebar - vertical on desktop, horizontal tabs on mobile */}
        <div className="lg:space-y-[var(--space-2)]">
          <div className="flex lg:flex-col gap-[var(--space-2)] overflow-x-auto lg:overflow-x-visible pb-[var(--space-2)] lg:pb-0">
            {loadingState === 'sectors' ? (
              <div className="flex items-center gap-2 p-[var(--space-3)]" style={{ color: 'var(--text-secondary)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Loading sectors...</span>
              </div>
            ) : (
              sectors.map((sector) => (
                <button
                  key={sector.id}
                  onClick={() => setSelectedSector(sector.id)}
                  className="px-[var(--space-4)] py-[var(--space-3)] rounded-[var(--radius-md)] whitespace-nowrap lg:whitespace-normal lg:text-left transition-all"
                  style={{
                    backgroundColor:
                      selectedSector === sector.id
                        ? 'var(--color-baseline)'
                        : 'var(--surface-elevated)',
                    color:
                      selectedSector === sector.id
                        ? 'white'
                        : 'var(--text-primary)',
                    border: `1px solid ${
                      selectedSector === sector.id
                        ? 'var(--color-baseline)'
                        : 'var(--border-default)'
                    }`,
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  {sector.name}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Activity list area */}
        <div className="space-y-[var(--space-4)]">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-[var(--space-3)] top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-[var(--space-10)] pr-[var(--space-4)] py-[var(--space-3)] rounded-[var(--radius-md)] border transition-all"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-base)',
              }}
            />
          </div>

          {/* Activity list */}
          <div className="space-y-[var(--space-2)]">
        {loadingState === 'activities' ? (
          <div className="flex items-center justify-center p-[var(--space-8)]">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: 'var(--text-tertiary)' }}
            />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div
            className="p-[var(--space-8)] text-center rounded-[var(--radius-lg)]"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--font-size-base)',
            }}
          >
            {searchQuery ? 'No activities match your search' : 'No activities available'}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredActivities.map((activity, index) => {
              const isSelected = hasActivity(activity.id);

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="group p-[var(--space-4)] rounded-[var(--radius-lg)] border-2 cursor-pointer transition-all"
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--color-baseline-bg)'
                      : 'var(--surface-elevated)',
                    borderColor: isSelected
                      ? 'var(--color-baseline)'
                      : 'var(--border-default)',
                  }}
                  onClick={() => handleActivityToggle(activity)}
                >
                  <div className="flex items-center gap-[var(--space-4)]">
                    {/* Selection indicator */}
                    <div
                      className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: isSelected
                          ? 'var(--color-baseline)'
                          : 'var(--border-default)',
                        backgroundColor: isSelected
                          ? 'var(--color-baseline)'
                          : 'transparent',
                      }}
                    >
                      {isSelected ? (
                        <Check className="w-4 h-4" style={{ color: 'white' }} />
                      ) : (
                        <Plus
                          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--text-tertiary)' }}
                        />
                      )}
                    </div>

                    {/* Activity info */}
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-semibold truncate"
                        style={{
                          fontSize: 'var(--font-size-base)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {activity.name || activity.id}
                      </h4>
                      {activity.description && (
                        <p
                          className="truncate"
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {activity.description}
                        </p>
                      )}
                      {activity.category && (
                        <span
                          className="inline-block mt-[var(--space-1)] px-[var(--space-2)] py-[var(--space-1)] rounded-full"
                          style={{
                            backgroundColor: 'var(--surface-bg)',
                            color: 'var(--text-tertiary)',
                            fontSize: 'var(--font-size-xs)',
                          }}
                        >
                          {activity.category}
                        </span>
                      )}
                    </div>

                    {/* Impact preview */}
                    <div className="flex-shrink-0 text-right">
                      <TrendingUp
                        className="w-5 h-5 mx-auto"
                        style={{
                          color: isSelected ? 'var(--carbon-moderate)' : 'var(--text-tertiary)',
                        }}
                      />
                      <p
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        per {activity.defaultUnit || 'unit'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
          </div>
        </div>
      </div>

      {/* Selected activities summary */}
      {activityCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-[var(--space-4)] rounded-[var(--radius-lg)]"
          style={{
            backgroundColor: 'var(--color-goal-bg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="font-medium"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-primary)',
                }}
              >
                {activityCount} {activityCount === 1 ? 'activity' : 'activities'} added
              </p>
              <p
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-secondary)',
                }}
              >
                {activityCount >= targetActivities
                  ? "You've reached the target! Continue to establish your baseline."
                  : `Add ${targetActivities - activityCount} more to continue`}
              </p>
            </div>
            {activityCount >= targetActivities && (
              <Button
                variant="primary"
                size="md"
                onClick={onTargetReached}
                icon={<Check className="w-5 h-5" />}
              >
                Continue
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Quantity Input Dialog */}
      <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>
              Specify how much of this activity you perform annually
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-[var(--space-4)]">
            {/* Activity name */}
            <div>
              <p
                className="font-semibold"
                style={{
                  fontSize: 'var(--font-size-base)',
                  color: 'var(--text-primary)',
                }}
              >
                {selectedActivityForQuantity?.name || selectedActivityForQuantity?.id}
              </p>
              {selectedActivityForQuantity?.description && (
                <p
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                    marginTop: 'var(--space-1)',
                  }}
                >
                  {selectedActivityForQuantity.description}
                </p>
              )}
            </div>

            {/* Quantity input */}
            <div>
              <label
                htmlFor="quantity-input"
                className="block mb-[var(--space-2)]"
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                Quantity per year
              </label>
              <div className="flex gap-[var(--space-2)] items-start">
                <input
                  id="quantity-input"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(parseFloat(e.target.value) || 0);
                    setQuantityError(null);
                  }}
                  className="flex-1 px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-md)] border"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: quantityError ? 'var(--carbon-high)' : 'var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--font-size-base)',
                  }}
                  autoFocus
                />
                <span
                  className="px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-md)]"
                  style={{
                    backgroundColor: 'var(--surface-bg)',
                    color: 'var(--text-secondary)',
                    fontSize: 'var(--font-size-base)',
                  }}
                >
                  {selectedActivityForQuantity?.defaultUnit || 'unit'}
                </span>
              </div>
              {quantityError && (
                <div className="flex items-center gap-[var(--space-1)] mt-[var(--space-2)]">
                  <AlertCircle className="w-4 h-4" style={{ color: 'var(--carbon-high)' }} />
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--carbon-high)' }}>
                    {quantityError}
                  </p>
                </div>
              )}
            </div>

            {/* Emission preview */}
            {selectedActivityForQuantity && emissionFactorsLoaded && (
              <div
                className="p-[var(--space-3)] rounded-[var(--radius-md)]"
                style={{
                  backgroundColor: 'var(--carbon-neutral-bg)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  Estimated annual emissions
                </p>
                <p
                  className="font-bold"
                  style={{
                    fontSize: 'var(--font-size-lg)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {(getEmissionFactor(selectedActivityForQuantity).carbonIntensity * quantity).toFixed(2)} kg CO₂
                </p>
                {getEmissionFactor(selectedActivityForQuantity).warning && (
                  <div className="flex items-start gap-[var(--space-1)] mt-[var(--space-2)]">
                    <AlertCircle
                      className="w-3 h-3 flex-shrink-0 mt-0.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    />
                    <p
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {getEmissionFactor(selectedActivityForQuantity).warning}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setQuantityDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmQuantity}
            >
              Add Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
