import type { SectorSummary } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';

interface ScopeSelectorProps {
  sector?: SectorSummary | null;
}

export default function ScopeSelector({ sector }: ScopeSelectorProps) {
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
      {sector.description && <p className="scope-selector__description">{sector.description}</p>}
    </section>
  );
}

export function ScopeSelectorSkeleton() {
  return (
    <section className="scope-selector">
      <Skeleton style={{ height: '1.5rem', width: '8rem', marginBottom: '0.75rem' }} />
      <Skeleton style={{ height: '1rem', width: '14rem' }} />
    </section>
  );
}
