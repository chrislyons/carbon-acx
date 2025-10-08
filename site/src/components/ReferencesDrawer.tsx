import { useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { FigureDataStatus } from '../lib/DataLoader';
import { useProfile } from '../state/profile';
import { ReferencesPanel } from './ReferencesPanel';
import { ScenarioManifest } from './ScenarioManifest';
import { Button } from './ui/button';

type ReferencesDrawerProps = {
  id?: string;
  open: boolean;
  onToggle: () => void;
  referencesOverride?: string[] | null;
  referencesStatus?: FigureDataStatus | null;
  referencesError?: string | null;
};

function normaliseReferences(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
    .filter((entry): entry is string => Boolean(entry));
}

export function ReferencesDrawer({
  id = 'references',
  open,
  onToggle,
  referencesOverride = null,
  referencesStatus = null,
  referencesError = null
}: ReferencesDrawerProps): JSX.Element {
  const { activeReferences } = useProfile();

  const fallbackReferences = useMemo(() => normaliseReferences(activeReferences), [activeReferences]);
  const overrideReferences = useMemo(
    () => (Array.isArray(referencesOverride) ? referencesOverride.map((entry) => entry.trim()).filter(Boolean) : []),
    [referencesOverride]
  );

  const hasOverride = referencesStatus !== null && referencesStatus !== undefined;
  const resolvedReferences = hasOverride ? overrideReferences : fallbackReferences;
  const isLoading = hasOverride && referencesStatus === 'loading';
  const errorMessage =
    hasOverride && referencesStatus === 'error'
      ? referencesError ?? 'Unable to load references.'
      : null;

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onToggle]);

  return (
    <aside
      id={id}
      aria-labelledby="references-heading"
      aria-live="polite"
      className="acx-card flex h-full flex-col gap-4 bg-card/70 shadow-lg shadow-black/40"
    >
      <div className="flex items-center justify-between gap-3">
        <p id="references-heading" className="text-2xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          References
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-expanded={open}
          aria-controls={`${id}-content`}
          onClick={onToggle}
          onKeyDown={(event) => {
            if (event.key.toLowerCase() === 'r') {
              event.preventDefault();
              onToggle();
            }
          }}
          className="h-9 w-9 rounded-full border-border/60 bg-background/80 text-muted-foreground hover:bg-muted/40"
        >
          <span className="sr-only">{open ? 'Collapse references' : 'Expand references'}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn('h-4 w-4 transition-transform', open ? 'rotate-180 text-primary' : 'text-muted-foreground')}
          />
        </Button>
      </div>
      <p className="text-compact text-muted-foreground">
        Primary sources supporting the figures. Press <kbd className="rounded bg-muted px-1">Esc</kbd> to close.
      </p>
      <ScenarioManifest />
      <div className="flex-1 rounded-xl border border-border/60 bg-background/40 p-4" hidden={!open}>
        <ReferencesPanel
          id={`${id}-content`}
          labelledBy="references-heading"
          references={resolvedReferences}
          isLoading={isLoading}
          error={errorMessage}
          open={open}
        />
      </div>
    </aside>
  );
}
