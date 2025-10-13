import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Leaf, Settings } from 'lucide-react';

import type { SectorSummary } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/cn';
import { ScrollArea } from '../components/ui/scroll-area';
import { useSectors } from '../hooks/useDataset';
import { useProfile } from '../contexts/ProfileContext';
import ThemeToggle from '../components/ThemeToggle';

interface NavSidebarProps {
  sectors: SectorSummary[];
  onOpenSettings?: () => void;
}

export default function NavSidebar({ sectors, onOpenSettings }: NavSidebarProps) {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const { totalEmissions } = useProfile();
  const { data: remoteSectors } = useSectors({ fallbackData: sectors });
  const items = remoteSectors ?? sectors;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return items;
    }
    return items.filter((sector) =>
      [sector.name, sector.description, sector.id]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [items, query]);

  const listRef = useRef<Array<HTMLAnchorElement | null>>([]);
  const [tabbableIndex, setTabbableIndex] = useState(0);

  useEffect(() => {
    const activeIndex = filtered.findIndex((sector) =>
      location.pathname.startsWith(`/sectors/${encodeURIComponent(sector.id)}`),
    );
    if (activeIndex >= 0) {
      setTabbableIndex(activeIndex);
    } else {
      setTabbableIndex(0);
    }
  }, [filtered, location.pathname]);

  useEffect(() => {
    listRef.current = listRef.current.slice(0, filtered.length);
    if (tabbableIndex >= filtered.length) {
      setTabbableIndex(filtered.length - 1 >= 0 ? filtered.length - 1 : 0);
    }
  }, [filtered.length, tabbableIndex]);

  return (
    <nav className="nav-sidebar flex flex-col h-full" aria-label="Main navigation">
      <div className="flex-1 min-h-0">
        {/* Quick Links */}
        <div className="mb-2 space-y-0.5">
          <Link
            to="/"
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors',
              location.pathname === '/'
                ? 'bg-accent-50 text-accent-600 font-medium'
                : 'text-text-secondary hover:bg-surface hover:text-foreground'
            )}
          >
            <Leaf className="h-4 w-4" />
            <span className="text-sm">Home</span>
          </Link>
          <Link
            to="/dashboard"
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors',
              location.pathname === '/dashboard'
                ? 'bg-accent-50 text-accent-600 font-medium'
                : 'text-text-secondary hover:bg-surface hover:text-foreground'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <div className="flex-1">
              <span className="text-sm">Dashboard</span>
              {totalEmissions > 0 && (
                <div className="text-xs text-text-muted">
                  {(totalEmissions / 1000).toFixed(1)}t CO₂/year
                </div>
              )}
            </div>
          </Link>
        </div>

        <div className="border-t border-border my-2" />

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
        <ScrollArea className="max-h-[calc(100vh-16rem)]">
          <ul className="nav-sidebar__list" role="listbox">
            {filtered.map((sector, index) => {
              const to = `/sectors/${encodeURIComponent(sector.id)}`;
              const isActive = location.pathname.startsWith(to);
              return (
                <li key={sector.id}>
                  <Link
                    to={to}
                  ref={(element) => {
                    listRef.current[index] = element;
                  }}
                  className={cn(
                    'nav-sidebar__item focus-outline',
                    isActive && 'nav-sidebar__item--active',
                  )}
                  tabIndex={tabbableIndex === index ? 0 : -1}
                  role="option"
                  aria-selected={isActive}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      const direction = event.key === 'ArrowDown' ? 1 : -1;
                      const nextIndex = (index + direction + filtered.length) % filtered.length;
                      setTabbableIndex(nextIndex);
                      listRef.current[nextIndex]?.focus();
                    }
                  }}
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
        </ScrollArea>
      </div>

      {/* Controls at bottom */}
      <div className="border-t border-border pt-2 mt-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-medium text-text-muted">Settings</span>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              type="button"
              className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
              onClick={onOpenSettings}
              title="Settings"
              aria-label="Open settings"
            >
              <Settings className="h-4 w-4 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export function NavSidebarSkeleton() {
  return (
    <div className="nav-sidebar">
      <div className="nav-sidebar__search">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
      <ul className="nav-sidebar__list">
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={index}>
            <Skeleton className="mb-3 h-12 w-full rounded-xl" />
          </li>
        ))}
      </ul>
    </div>
  );
}
