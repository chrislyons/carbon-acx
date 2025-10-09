import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import type { SectorSummary } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/cn';

interface NavSidebarProps {
  sectors: SectorSummary[];
}

export default function NavSidebar({ sectors }: NavSidebarProps) {
  const location = useLocation();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return sectors;
    }
    return sectors.filter((sector) =>
      [sector.name, sector.description, sector.id]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [query, sectors]);

  return (
    <nav className="nav-sidebar" aria-label="Sector navigation">
      <div className="nav-sidebar__search">
        <label htmlFor="sector-search">Search sectors</label>
        <input
          id="sector-search"
          name="sector-search"
          type="search"
          placeholder="Search..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <ul className="nav-sidebar__list">
        {filtered.map((sector) => {
          const to = `/sectors/${encodeURIComponent(sector.id)}`;
          const isActive = location.pathname.startsWith(to);
          return (
            <li key={sector.id}>
              <Link
                to={to}
                className={cn('nav-sidebar__item', isActive && 'nav-sidebar__item--active')}
              >
                <span className="nav-sidebar__name">{sector.name}</span>
                {sector.description && <span className="nav-sidebar__meta">{sector.description}</span>}
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="nav-sidebar__empty">No sectors match your search.</li>
        )}
      </ul>
    </nav>
  );
}

export function NavSidebarSkeleton() {
  return (
    <div className="nav-sidebar">
      <div className="nav-sidebar__search">
        <Skeleton style={{ height: '2.75rem', width: '100%' }} />
      </div>
      <ul className="nav-sidebar__list">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={index}>
            <Skeleton style={{ height: '3.25rem', width: '100%', marginBottom: '0.75rem' }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
