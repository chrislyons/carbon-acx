import type { ActivitySummary } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';

interface ProfilePickerProps {
  activities?: ActivitySummary[];
}

export default function ProfilePicker({ activities }: ProfilePickerProps) {
  const hasSelection = Array.isArray(activities);
  const hasActivities = Boolean(activities && activities.length > 0);

  return (
    <section className="profile-picker" aria-labelledby="profile-picker-heading">
      <div className="profile-picker__header">
        <h2 id="profile-picker-heading">Profiles</h2>
        {hasActivities && (
          <span className="profile-picker__count">
            {activities!.length} {activities!.length === 1 ? 'profile' : 'profiles'}
          </span>
        )}
      </div>
      {hasActivities ? (
        <div className="profile-picker__grid" role="list" aria-label="Profiles">
          {activities!.map((activity) => (
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
        <Skeleton style={{ height: '1.5rem', width: '8rem' }} />
        <Skeleton style={{ height: '1rem', width: '4rem' }} />
      </div>
      <div className="profile-picker__grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            style={{
              display: 'inline-block',
              height: '2rem',
              width: '6rem',
              marginRight: '0.5rem',
            }}
          />
        ))}
      </div>
    </section>
  );
}
