import { useEffect, useMemo, useRef, useState } from 'react';

import { PRESET_GROUPS, type PresetGroup, type ProfilePreset } from '../data/profile-presets';
import { useProfile } from '../state/profile';

interface PreparedGroup extends PresetGroup {
  presets: ProfilePresetWithGroup[];
}

interface ProfilePresetWithGroup extends ProfilePreset {
  groupId: string;
}

const GROUPS: PreparedGroup[] = PRESET_GROUPS.map((group) => ({
  ...group,
  presets: group.presets.map((preset) => ({ ...preset, groupId: group.id }))
}));

const PRESET_BY_ID = new Map<string, ProfilePresetWithGroup>();
const PRESET_BY_PROFILE_ID = new Map<string, ProfilePresetWithGroup>();

GROUPS.forEach((group) => {
  group.presets.forEach((preset) => {
    PRESET_BY_ID.set(preset.id, preset);
    PRESET_BY_PROFILE_ID.set(preset.profileId, preset);
  });
});

function formatOfficeDays(days: number | undefined): string {
  if (typeof days !== 'number' || Number.isNaN(days)) {
    return '—';
  }
  if (days <= 0) {
    return '0';
  }
  return days % 1 === 0 ? `${days}` : days.toFixed(1);
}

export function PresetGallery(): JSX.Element {
  const { profileId, setProfileId } = useProfile();
  const [hasInitialised, setHasInitialised] = useState(false);
  const lastPresetId = useRef<string | null>(null);

  const activePreset = useMemo(() => {
    if (!profileId) {
      return null;
    }
    return PRESET_BY_PROFILE_ID.get(profileId) ?? null;
  }, [profileId]);

  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    if (activePreset) {
      return activePreset.groupId;
    }
    return GROUPS[0]?.id ?? '';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || hasInitialised) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const presetId = params.get('preset');
    if (presetId) {
      const match = PRESET_BY_ID.get(presetId);
      if (match) {
        setProfileId(match.profileId);
      }
    }
    setHasInitialised(true);
  }, [hasInitialised, setProfileId]);

  useEffect(() => {
    const nextPresetId = activePreset?.id ?? null;
    if (nextPresetId && nextPresetId !== lastPresetId.current && activePreset) {
      setActiveGroupId(activePreset.groupId);
    }
    lastPresetId.current = nextPresetId;
  }, [activePreset]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasInitialised) {
      return;
    }
    const url = new URL(window.location.href);
    if (activePreset) {
      url.searchParams.set('preset', activePreset.id);
    } else {
      url.searchParams.delete('preset');
    }
    window.history.replaceState(null, '', url);
  }, [activePreset, hasInitialised]);

  const visibleGroup = useMemo(() => GROUPS.find((group) => group.id === activeGroupId) ?? null, [activeGroupId]);

  const handleApply = (preset: ProfilePresetWithGroup) => {
    setProfileId(preset.profileId);
  };

  return (
    <section aria-labelledby="preset-gallery-heading" className="space-y-[var(--gap-1)]">
      <header className="space-y-[var(--gap-0)]">
        <p
          id="preset-gallery-heading"
          className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400"
        >
          Preset gallery
        </p>
        <p className="text-compact text-slate-400">
          Jump between curated baseline profiles. Switching presets updates the compute payload and refreshes the visualizer.
        </p>
      </header>
      <div className="space-y-[var(--gap-1)]">
        <nav className="flex flex-wrap gap-[var(--gap-0)]">
          {GROUPS.map((group) => {
            const isActive = group.id === activeGroupId;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveGroupId(group.id)}
                className={`inline-flex items-center rounded-full border px-[var(--gap-1)] py-[4px] text-[11px] font-semibold uppercase tracking-[0.25em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                  isActive
                    ? 'border-sky-500 bg-sky-500/15 text-slate-100 shadow-sm shadow-sky-900/40'
                    : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-600'
                }`}
                aria-pressed={isActive}
              >
                {group.title}
              </button>
            );
          })}
        </nav>
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/40">
          {visibleGroup ? (
            <div className="space-y-[var(--gap-1)] p-[var(--gap-1)] sm:p-[var(--gap-2)]">
              <div>
                <h3 className="text-[13px] font-semibold text-slate-100">{visibleGroup.title}</h3>
                <p className="mt-[var(--gap-0)] text-compact text-slate-400">{visibleGroup.description}</p>
              </div>
              <div className="grid gap-[var(--gap-1)] md:grid-cols-2">
                {visibleGroup.presets.map((preset) => {
                  const isActive = activePreset?.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApply(preset)}
                      className={`group flex h-full flex-col justify-between gap-[var(--gap-1)] rounded-lg border p-[var(--gap-1)] text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                        isActive
                          ? 'border-sky-500 bg-sky-500/10 text-slate-100 shadow-sm shadow-sky-900/40'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                      }`}
                      aria-pressed={isActive}
                    >
                      <div className="space-y-[var(--gap-0)]">
                        <div className="flex items-start justify-between gap-[var(--gap-0)]">
                          <p className="text-[13px] font-semibold text-slate-100">{preset.title}</p>
                          {isActive ? (
                            <span className="inline-flex items-center rounded-full bg-sky-500/20 px-[var(--gap-1)] py-[2px] text-[9px] font-semibold uppercase tracking-[0.25em] text-sky-200">
                              Active
                            </span>
                          ) : null}
                        </div>
                        <p className="text-compact text-slate-400">{preset.summary}</p>
                      </div>
                      <dl className="grid gap-[var(--gap-0)] text-[11px] uppercase tracking-[0.25em] text-slate-400 sm:grid-cols-2">
                        <div>
                          <dt className="sr-only">Region</dt>
                          <dd className="font-semibold text-slate-200">{preset.region}</dd>
                        </div>
                        <div>
                          <dt className="sr-only">Layer</dt>
                          <dd className="font-semibold text-slate-200">{preset.layerLabel}</dd>
                        </div>
                        <div>
                          <dt className="sr-only">Office days</dt>
                          <dd className="text-slate-300">Office days: {formatOfficeDays(preset.officeDays)}</dd>
                        </div>
                      </dl>
                      <span className="inline-flex items-center gap-[var(--gap-0)] text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400 transition group-hover:text-sky-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500 transition group-hover:bg-sky-400" aria-hidden="true" />
                        Switch to profile
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-[var(--gap-1)] text-compact text-slate-400">No preset groups available.</div>
          )}
        </div>
      </div>
    </section>
  );
}
