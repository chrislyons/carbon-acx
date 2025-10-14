import { useState, useEffect } from 'react';
import type { ActivitySummary, EmissionFactor, ProfileSummary } from '../lib/api';
import { loadProfileActivities, loadEmissionFactors } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';

interface ProfilePickerProps {
  profiles: ProfileSummary[];
  sectorId: string;
  activities: ActivitySummary[];
}

// Generate distinct colors for profile layers
const LAYER_COLORS = [
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
];

function getLayerColor(index: number): string {
  return LAYER_COLORS[index % LAYER_COLORS.length];
}

export default function ProfilePicker({ profiles, sectorId, activities }: ProfilePickerProps) {
  const hasProfiles = profiles.length > 0;
  const { addLayer, profile } = useProfile();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [emissionFactors, setEmissionFactors] = useState<EmissionFactor[]>([]);

  // Load emission factors on mount
  useEffect(() => {
    loadEmissionFactors().then(setEmissionFactors).catch((error) => {
      console.error('Failed to load emission factors:', error);
    });
  }, []);

  if (!hasProfiles) {
    return null;
  }

  const handleProfileSelect = async (selectedProfile: ProfileSummary) => {
    setLoading(selectedProfile.id);
    try {
      // Check if layer already exists
      if (profile.layers.some((l) => l.sourceProfileId === selectedProfile.id)) {
        showToast('warning', 'Profile already loaded', `"${selectedProfile.name}" is already loaded as a layer.`);
        setLoading(null);
        return;
      }

      // Load profile activity schedule
      const profileData = await loadProfileActivities(selectedProfile.id);

      // Create activity lookup map
      const activityMap = new Map(activities.map((a) => [a.id, a]));

      // Create emission factor lookup map (activity_id -> emission factor)
      const emissionFactorMap = new Map(
        emissionFactors.map((ef) => [ef.activityId, ef])
      );

      // Ontario grid intensity (g CO2e/kWh) - used for grid-indexed activities
      const ONTARIO_GRID_INTENSITY = 28; // From EF data

      // Build layer activities from schedule
      const layerActivities = [];
      for (const scheduleEntry of profileData.activities) {
        const activity = activityMap.get(scheduleEntry.activityId);
        if (!activity) {
          console.warn(`Activity ${scheduleEntry.activityId} not found in sector activities`);
          continue;
        }

        // Calculate annual quantity from frequency
        let annualQuantity = 0;
        if (scheduleEntry.freqPerDay !== null) {
          // Daily frequency: multiply by 365 days
          annualQuantity = scheduleEntry.freqPerDay * 365;
          // If office days only, adjust by work days
          if (scheduleEntry.officeDaysOnly && selectedProfile.officeDaysPerWeek !== null) {
            annualQuantity = scheduleEntry.freqPerDay * selectedProfile.officeDaysPerWeek * 52;
          }
        } else if (scheduleEntry.freqPerWeek !== null) {
          // Weekly frequency: multiply by 52 weeks
          annualQuantity = scheduleEntry.freqPerWeek * 52;
        }

        // Apply any parameter multipliers (distance, hours, etc.)
        if (scheduleEntry.distanceKm !== null) annualQuantity *= scheduleEntry.distanceKm;
        if (scheduleEntry.hours !== null) annualQuantity *= scheduleEntry.hours;
        if (scheduleEntry.servings !== null) annualQuantity *= scheduleEntry.servings;

        // Get emission factor for this activity
        const emissionFactor = emissionFactorMap.get(activity.id);
        let carbonIntensity = 0.1; // Fallback to 100g CO2e per unit

        if (emissionFactor) {
          if (emissionFactor.isGridIndexed && emissionFactor.electricityKwhPerUnit !== null) {
            // Grid-indexed: use electricity × grid intensity
            // Convert to kg CO2e per unit
            carbonIntensity = (emissionFactor.electricityKwhPerUnit * ONTARIO_GRID_INTENSITY) / 1000;
          } else if (emissionFactor.valueGPerUnit !== null) {
            // Direct emission factor: convert grams to kg
            carbonIntensity = emissionFactor.valueGPerUnit / 1000;
          }
        } else {
          console.warn(`No emission factor found for activity ${activity.id}, using fallback`);
        }

        layerActivities.push({
          id: activity.id,
          sectorId: activity.sectorId,
          name: activity.name || activity.id,
          category: activity.category,
          quantity: annualQuantity,
          unit: activity.defaultUnit || 'unit',
          carbonIntensity,
          annualEmissions: annualQuantity * carbonIntensity,
          iconType: activity.iconType ?? undefined,
          iconUrl: activity.iconUrl ?? undefined,
          badgeColor: activity.badgeColor ?? undefined,
          addedAt: new Date().toISOString(),
          layerId: selectedProfile.id,
        });
      }

      // Create new layer
      const layerColor = getLayerColor(profile.layers.length);
      addLayer({
        id: selectedProfile.id,
        name: selectedProfile.name,
        sourceProfileId: selectedProfile.id,
        color: layerColor,
        visible: true,
        activities: layerActivities,
      });

      console.log(`Loaded profile "${selectedProfile.name}" with ${layerActivities.length} activities as new layer`);
      showToast(
        'success',
        'Profile loaded as new layer!',
        `${layerActivities.length} activities added. You can now compare this with other profiles or manual activities.`,
        6000
      );
    } catch (error) {
      console.error('Failed to load profile:', error);
      showToast('error', 'Failed to load profile', `Could not load "${selectedProfile.name}". Please try again.`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Profile Presets</CardTitle>
        <p className="text-xs text-text-muted">
          Load a profile to compare activities
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              disabled={loading === profile.id}
              className="w-full text-left p-2.5 rounded-lg border border-border hover:border-accent-500 hover:bg-accent-50/50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleProfileSelect(profile)}
            >
              <div className="font-medium text-xs text-foreground group-hover:text-accent-700">
                {loading === profile.id ? 'Loading...' : profile.name}
              </div>
              {profile.notes && (
                <p className="text-[10px] text-text-muted line-clamp-2 mt-0.5 leading-tight">{profile.notes}</p>
              )}
              <div className="flex gap-1.5 mt-1.5 text-[10px] text-text-muted">
                {profile.regionCode && (
                  <span className="px-1.5 py-0.5 rounded bg-accent-100 text-accent-700">
                    {profile.regionCode}
                  </span>
                )}
                {profile.officeDaysPerWeek !== null && (
                  <span className="px-1.5 py-0.5 rounded bg-accent-100 text-accent-700">
                    {profile.officeDaysPerWeek}d/wk
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfilePickerSkeleton() {
  return (
    <section className="profile-picker">
      <div className="profile-picker__header">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="profile-picker__grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    </section>
  );
}
