import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Leaf, Settings, Layers, List, Eye, EyeOff, Trash2, Edit2 } from 'lucide-react';

import type { SectorSummary } from '../lib/api';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/cn';
import { ScrollArea } from '../components/ui/scroll-area';
import { useSectors } from '../hooks/useDataset';
import { useProfile } from '../contexts/ProfileContext';
import ThemeToggle from '../components/ThemeToggle';
import { Button } from '../components/ui/button';
import { useToast } from '../contexts/ToastContext';

interface NavSidebarProps {
  sectors: SectorSummary[];
  onOpenSettings?: () => void;
}

export default function NavSidebar({ sectors, onOpenSettings }: NavSidebarProps) {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [activeView, setActiveView] = useState<'sectors' | 'layers'>('sectors');
  const { totalEmissions, profile, toggleLayerVisibility, removeLayer, renameLayer } = useProfile();
  const { showToast } = useToast();
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
      {/* Fixed header section */}
      <div className="flex-shrink-0">
        {/* Main Navigation - Controls Right Pane */}
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
            <span className="text-sm flex-1">Dashboard</span>
            {totalEmissions > 0 && (
              <span className="text-xs text-text-muted">
                {(totalEmissions / 1000).toFixed(1)}t CO₂/year
              </span>
            )}
          </Link>
        </div>

        <div className="border-t border-border my-2" />

        {/* Sidebar View Tabs - Controls Left Pane */}
        <div className="mb-2">
          <div className="text-xs font-medium text-text-muted px-3 mb-1">Browse</div>
          <div className="space-y-0.5">
            <button
              onClick={() => setActiveView('sectors')}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors w-full text-left',
                activeView === 'sectors'
                  ? 'bg-accent-50 text-accent-600 font-medium'
                  : 'text-text-secondary hover:bg-surface hover:text-foreground'
              )}
            >
              <List className="h-4 w-4" />
              <span className="text-sm">Sectors</span>
            </button>
            <button
              onClick={() => setActiveView('layers')}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors w-full text-left',
                activeView === 'layers'
                  ? 'bg-accent-50 text-accent-600 font-medium'
                  : 'text-text-secondary hover:bg-surface hover:text-foreground'
              )}
            >
              <Layers className="h-4 w-4" />
              <span className="text-sm flex-1">Profile Layers</span>
              {profile.layers.length > 0 && (
                <span className="text-xs text-text-muted">({profile.layers.filter(l => l.visible).length}/{profile.layers.length})</span>
              )}
            </button>
          </div>
        </div>

        <div className="border-t border-border my-2" />
      </div>

      {/* Scrollable content section */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Conditional Content: Sectors or Layers */}
        {activeView === 'sectors' ? (
          <>
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
            <ScrollArea className="flex-1 overflow-auto">
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
          </>
        ) : (
          /* Profile Layers Management View */
          <ScrollArea className="flex-1 overflow-auto px-2">
              {profile.layers.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm mb-1">No profile layers yet</p>
                  <p className="text-xs">Load profile presets from sectors to compare emissions</p>
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {profile.layers.map((layer) => {
                  const layerEmissions = layer.activities.reduce(
                    (sum, a) => sum + a.annualEmissions,
                    0
                  );

                  return (
                    <div
                      key={layer.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-all group',
                        layer.visible
                          ? 'border-border bg-surface hover:border-accent-300 hover:bg-accent-50/50'
                          : 'border-border/50 bg-surface/50 opacity-60'
                      )}
                    >
                      {/* Clickable area to view on Dashboard */}
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-3 flex-1 min-w-0"
                        onClick={() => {
                          // Ensure layer is visible when navigating to dashboard
                          if (!layer.visible) {
                            toggleLayerVisibility(layer.id);
                          }
                        }}
                      >
                        {/* Color indicator */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: layer.color }}
                        />

                        {/* Layer info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-accent-600">
                            {layer.name}
                          </p>
                          <p className="text-xs text-text-muted">
                            {layer.activities.length} activities • {(layerEmissions / 1000).toFixed(2)}t CO₂/yr
                          </p>
                        </div>
                      </Link>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 p-0"
                          onClick={() => toggleLayerVisibility(layer.id)}
                          aria-label={layer.visible ? `Hide ${layer.name} layer` : `Show ${layer.name} layer`}
                          title={layer.visible ? 'Hide layer' : 'Show layer'}
                        >
                          {layer.visible ? (
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 p-0"
                          onClick={() => {
                            const newName = prompt('Enter new layer name:', layer.name);
                            if (newName && newName !== layer.name) {
                              renameLayer(layer.id, newName);
                              showToast('success', 'Layer renamed', `Renamed to "${newName}"`);
                            }
                          }}
                          aria-label={`Rename ${layer.name} layer`}
                          title="Rename layer"
                        >
                          <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            removeLayer(layer.id);
                            showToast('success', 'Layer removed', `Removed "${layer.name}"`);
                          }}
                          aria-label={`Remove ${layer.name} layer`}
                          title="Remove layer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
          </ScrollArea>
        )}
      </div>

      {/* Fixed footer section */}
      <div className="flex-shrink-0 border-t border-border pt-4 mt-4 space-y-2">

        {/* Settings controls */}
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
