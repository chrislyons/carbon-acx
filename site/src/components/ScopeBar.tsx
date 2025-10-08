import { XIcon } from 'lucide-react';

import { Button } from './ui/button';
import type { StageId, StageSummaries } from './Layout';

const STAGE_SEQUENCE: StageId[] = ['sector', 'profile', 'activity'];

const STAGE_LABEL: Record<StageId, string> = {
  sector: 'Sector',
  profile: 'Profile',
  activity: 'Activity'
};

export interface ScopeSectorDescriptor {
  id: string;
  label: string;
}

export type ScopeSegmentDescriptor = ScopeSectorDescriptor;

export interface ScopePin {
  id: string;
  stage: StageId;
  title: string;
  subtitle?: string;
  stageSummary?: string;
}

interface ScopeBarProps {
  stage: StageId;
  stageSummaries?: StageSummaries;
  sectors: ScopeSectorDescriptor[];
  profileDetail?: string;
  activityDetail?: string;
  pinnedScopes: ScopePin[];
  onPinScope: () => void;
  onRemovePinnedScope: (id: string) => void;
}

export function ScopeBar({
  stage,
  stageSummaries = {},
  sectors,
  profileDetail,
  activityDetail,
  pinnedScopes,
  onPinScope,
  onRemovePinnedScope
}: ScopeBarProps): JSX.Element {
  const activeIndex = STAGE_SEQUENCE.indexOf(stage);

  const stageSummary = stageSummaries?.[stage];
  const profileSummary = profileDetail ?? stageSummaries?.profile;
  const activitySummary = activityDetail ?? stageSummaries?.activity;

  return (
    <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-inner shadow-black/40">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Scope</span>
            <ol className="flex flex-wrap items-center gap-2" role="list">
              {STAGE_SEQUENCE.map((id, index) => {
                const isActive = index <= activeIndex && activeIndex !== -1;
                return (
                  <li key={id} className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-2xs uppercase tracking-[0.28em] font-semibold ${
                        isActive
                          ? 'border-primary/60 bg-primary/15 text-primary'
                          : 'border-border/70 bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      {STAGE_LABEL[id]}
                    </span>
                    {index < STAGE_SEQUENCE.length - 1 ? (
                      <span className="text-xs text-muted-foreground" aria-hidden="true">
                        ›
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPinScope}
            className="inline-flex items-center gap-2 rounded-md border-primary/40 bg-primary/10 text-xs font-semibold uppercase tracking-[0.28em] text-primary hover:bg-primary/20"
          >
            Pin scope
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
          {sectors.length > 0 ? (
            sectors.map((sector) => (
              <span
                key={sector.id}
                className="inline-flex items-center rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs text-foreground"
              >
                {sector.label}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No sectors selected</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {stageSummary ? <span>{stageSummary}</span> : null}
          {profileSummary ? <span>• {profileSummary}</span> : null}
          {activitySummary ? <span>• {activitySummary}</span> : null}
        </div>
        {pinnedScopes.length > 0 ? (
          <div className="mt-4 border-t border-border/70 pt-4">
            <div className="flex items-center justify-between text-2xs uppercase tracking-[0.28em] text-muted-foreground">
              <span>Comparison list</span>
              <span>{pinnedScopes.length}</span>
            </div>
            <ul className="mt-3 flex flex-wrap gap-3" role="list">
              {pinnedScopes.map((pin) => (
                <li
                  key={pin.id}
                  className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{pin.title}</p>
                    {pin.subtitle ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{pin.subtitle}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemovePinnedScope(pin.id)}
                    className="ml-auto h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted/40"
                    aria-label="Remove pinned scope"
                  >
                    <XIcon className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
