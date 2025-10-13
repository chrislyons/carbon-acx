import type { ProfileSummary } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

interface ProfilePickerProps {
  profiles: ProfileSummary[];
  sectorId: string;
}

export default function ProfilePicker({ profiles, sectorId }: ProfilePickerProps) {
  const hasProfiles = profiles.length > 0;

  if (!hasProfiles) {
    return null;
  }

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
              className="text-left p-3 rounded-lg border border-border hover:border-accent-500 hover:bg-accent-50/50 transition-all duration-200 group"
              onClick={() => {
                /* TODO: Implement profile selection workflow
                 * 1. Fetch activity_schedule for this profile_id from backend
                 * 2. Create layer/entity in user's profile context
                 * 3. Calculate emissions using the compute API
                 * 4. Update visualizations to show profile data
                 * 5. Allow comparison between multiple profiles
                 *
                 * For now, just log the selection for debugging
                 */
                console.log('Selected profile:', profile);
              }}
            >
              <div className="font-medium text-sm text-foreground group-hover:text-accent-700 mb-1">
                {profile.name}
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
