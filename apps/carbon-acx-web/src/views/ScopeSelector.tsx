import type { ActivitySummary, SectorSummary } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';

interface ScopeSelectorProps {
  sector?: SectorSummary | null;
  activities?: ActivitySummary[];
}

export default function ScopeSelector({ sector, activities }: ScopeSelectorProps) {
  if (!sector) {
    return (
      <section className="scope-selector">
        <h2>Choose a sector</h2>
        <p>Select a sector from the navigation to explore its datasets.</p>
      </section>
    );
  }

  return (
    <section className="scope-selector" aria-labelledby="scope-heading">
      <div className="scope-selector__header">
        <h2 id="scope-heading">Scope</h2>
        <span className="scope-selector__sector">{sector.name}</span>
      </div>
      <div className="scope-selector__chips" role="list" aria-label="Sector activities">
        {activities?.map((activity) => (
          <span key={activity.id} role="listitem" className="scope-selector__chip">
            {activity.name ?? activity.id}
          </span>
        ))}
        {!activities?.length && <p className="scope-selector__empty">No profiles available.</p>}
      </div>
    </section>
  );
}

export function ScopeSelectorSkeleton() {
  return (
    <section className="scope-selector">
      <Skeleton style={{ height: '1.5rem', width: '8rem', marginBottom: '1rem' }} />
      <div className="scope-selector__chips">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            style={{
              display: 'inline-block',
              height: '2rem',
              width: '5rem',
              marginRight: '0.5rem',
            }}
          />
        ))}
      </div>
    </section>
  );
}
