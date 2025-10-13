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
                // TODO: Full implementation requires:
                // 1. Backend API endpoint: GET /api/profiles/:profileId/activities
                //    - Load activity_schedule.csv rows for this profile_id
                //    - Join with activities.csv to get full activity details
                //    - Calculate emissions using emission_factors.csv
                // 2. Add activities to ProfileContext using addActivity()
                // 3. Update visualizations to show profile data
                // 4. Support multiple profile comparison (layers)
                //
                // For now, show a placeholder message
                alert(`Profile selected: ${profile.name}\n\nFull profile loading will be implemented in a future update. This requires:\n• Backend API for activity schedules\n• Emissions calculation\n• Profile comparison features`);
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
