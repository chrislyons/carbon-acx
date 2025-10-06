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
    <section className="rounded-2xl border border-slate-800/70 bg-slate-950/65 p-[calc(var(--gap-1)*0.8)] shadow-inner shadow-slate-900/40">
      <div className="flex flex-col gap-[calc(var(--gap-0)*0.8)]">
        <div className="flex flex-wrap items-center justify-between gap-[calc(var(--gap-0)*0.8)]">
          <div className="flex flex-wrap items-center gap-[calc(var(--gap-0)*0.6)]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Scope</span>
            <ol className="flex flex-wrap items-center gap-[calc(var(--gap-0)*0.5)]" role="list">
              {STAGE_SEQUENCE.map((id, index) => {
                const isActive = index <= activeIndex && activeIndex !== -1;
                return (
                  <li key={id} className="flex items-center gap-[calc(var(--gap-0)*0.3)]">
                    <span
                      className={`inline-flex items-center rounded-full border px-[0.55rem] py-[0.18rem] text-[10px] uppercase tracking-[0.28em] ${
                        isActive
                          ? 'border-sky-500/60 bg-sky-500/15 text-sky-100'
                          : 'border-slate-700/70 bg-slate-900/40 text-slate-500'
                      }`}
                    >
                      {STAGE_LABEL[id]}
                    </span>
                    {index < STAGE_SEQUENCE.length - 1 ? (
                      <span className="text-[10px] text-slate-600" aria-hidden="true">
                        ›
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
          <button
            type="button"
            onClick={onPinScope}
            className="inline-flex items-center gap-1 rounded-md border border-sky-500/50 bg-sky-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-sky-100 transition hover:bg-sky-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Pin scope
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-[calc(var(--gap-0)*0.6)] text-[12px] text-slate-200">
          {sectors.length > 0 ? (
            sectors.map((sector) => (
              <span
                key={sector.id}
                className="inline-flex items-center rounded-full border border-slate-700/70 bg-slate-900/40 px-3 py-[0.2rem] text-[12px] text-slate-100"
              >
                {sector.label}
              </span>
            ))
          ) : (
            <span className="text-[12px] text-slate-500">No sectors selected</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-[calc(var(--gap-0)*0.6)] text-[11px] text-slate-400">
          {stageSummary ? <span>{stageSummary}</span> : null}
          {profileSummary ? <span>• {profileSummary}</span> : null}
          {activitySummary ? <span>• {activitySummary}</span> : null}
        </div>
        {pinnedScopes.length > 0 ? (
          <div className="mt-[calc(var(--gap-0)*0.4)] border-t border-slate-800/70 pt-[calc(var(--gap-0)*0.6)]">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-slate-500">
              <span>Comparison list</span>
              <span>{pinnedScopes.length}</span>
            </div>
            <ul className="mt-[calc(var(--gap-0)*0.6)] flex flex-wrap gap-[calc(var(--gap-0)*0.6)]" role="list">
              {pinnedScopes.map((pin) => (
                <li
                  key={pin.id}
                  className="flex items-start gap-[calc(var(--gap-0)*0.4)] rounded-lg border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-slate-100">{pin.title}</p>
                    {pin.subtitle ? (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-400">{pin.subtitle}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemovePinnedScope(pin.id)}
                    className="ml-auto inline-flex shrink-0 items-center rounded-full border border-slate-700 bg-slate-900/70 p-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-600 hover:bg-slate-900"
                    aria-label="Remove pinned scope"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
