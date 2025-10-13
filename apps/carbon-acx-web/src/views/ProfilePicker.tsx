import { useState } from 'react';
import type { ActivitySummary, ProfileSummary } from '../lib/api';
import { loadProfileActivities } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { useProfile } from '../contexts/ProfileContext';

interface ProfilePickerProps {
  profiles: ProfileSummary[];
  sectorId: string;
  activities: ActivitySummary[];
}

export default function ProfilePicker({ profiles, sectorId, activities }: ProfilePickerProps) {
  const hasProfiles = profiles.length > 0;
  const { addActivity, clearProfile } = useProfile();
  const [loading, setLoading] = useState<string | null>(null);

  if (!hasProfiles) {
    return null;
  }

  const handleProfileSelect = async (profile: ProfileSummary) => {
    setLoading(profile.id);
    try {
      // Load profile activity schedule
      const profileData = await loadProfileActivities(profile.id);

      // Create activity lookup map
      const activityMap = new Map(activities.map((a) => [a.id, a]));

      // Clear existing profile activities
      clearProfile();

      // Calculate and add activities from schedule
      let addedCount = 0;
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
          if (scheduleEntry.officeDaysOnly && profile.officeDaysPerWeek !== null) {
            annualQuantity = scheduleEntry.freqPerDay * profile.officeDaysPerWeek * 52;
          }
        } else if (scheduleEntry.freqPerWeek !== null) {
          // Weekly frequency: multiply by 52 weeks
          annualQuantity = scheduleEntry.freqPerWeek * 52;
        }

        // Apply any parameter multipliers (distance, hours, etc.)
        if (scheduleEntry.distanceKm !== null) annualQuantity *= scheduleEntry.distanceKm;
        if (scheduleEntry.hours !== null) annualQuantity *= scheduleEntry.hours;
        if (scheduleEntry.servings !== null) annualQuantity *= scheduleEntry.servings;

        // Use placeholder carbon intensity (will be calculated by backend in future)
        // For now, use 100g CO2e per unit as rough estimate
        const carbonIntensity = 0.1; // kg CO2e per unit

        addActivity({
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
        });
        addedCount++;
      }

      console.log(`Loaded profile "${profile.name}" with ${addedCount} activities`);
      alert(`Profile "${profile.name}" loaded successfully!\n\n${addedCount} activities added to your footprint.`);
    } catch (error) {
      console.error('Failed to load profile:', error);
      alert(`Failed to load profile "${profile.name}". Please try again.`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile Presets</CardTitle>
        <p className="text-sm text-text-muted">
          Select a profile to quickly populate your carbon calculation with representative activities.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              disabled={loading === profile.id}
              className="text-left p-3 rounded-lg border border-border hover:border-accent-500 hover:bg-accent-50/50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handleProfileSelect(profile)}
            >
              <div className="font-medium text-sm text-foreground group-hover:text-accent-700 mb-1">
                {loading === profile.id ? 'Loading...' : profile.name}
              </div>
              {profile.notes && (
                <p className="text-xs text-text-muted line-clamp-2 mt-1">{profile.notes}</p>
              )}
              <div className="flex gap-2 mt-2 text-xs text-text-muted">
                {profile.regionCode && (
                  <span className="px-2 py-0.5 rounded bg-accent-100 text-accent-700">
                    {profile.regionCode}
                  </span>
                )}
                {profile.officeDaysPerWeek !== null && (
                  <span className="px-2 py-0.5 rounded bg-accent-100 text-accent-700">
                    {profile.officeDaysPerWeek} days/wk
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
