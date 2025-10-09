import type { ActivitySummary } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';

interface ProfilePickerProps {
  activities?: ActivitySummary[];
}

export default function ProfilePicker({ activities }: ProfilePickerProps) {
  const hasSelection = Array.isArray(activities);
  const activityList = hasSelection ? activities : [];
  const hasActivities = activityList.length > 0;

  return (
    <section className="profile-picker" aria-labelledby="profile-picker-heading">
      <div className="profile-picker__header">
        <h2 id="profile-picker-heading">Profiles</h2>
        {hasActivities && (
          <span className="profile-picker__count">
            {activityList.length} {activityList.length === 1 ? 'profile' : 'profiles'}
          </span>
        )}
      </div>
      {hasActivities ? (
        <div className="profile-picker__grid" role="list" aria-label="Profiles">
          {activityList.map((activity) => (
            <span key={activity.id} role="listitem" className="profile-picker__option">
              {activity.name ?? activity.id}
            </span>
          ))}
        </div>
      ) : (
        <p className="profile-picker__empty">
          {hasSelection
            ? 'No profiles available for this sector.'
            : 'Select a sector to view available profiles.'}
        </p>
      )}
    </section>
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
