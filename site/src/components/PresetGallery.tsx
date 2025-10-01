import { useEffect, useMemo, useState } from 'react';

import presetsData from '../data/presets.json';
import { useProfile } from '../state/profile';

interface PresetDefinition {
  preset_id: string;
  industry_group: string;
  display: string;
  profile_ref: string;
}

interface IndustryGroup {
  id: string;
  presets: PresetDefinition[];
}

const PRESETS: PresetDefinition[] = presetsData as PresetDefinition[];

const PRESETS_BY_ID = new Map<string, PresetDefinition>();
const PRESETS_BY_PROFILE_REF = new Map<string, PresetDefinition>();
const INDUSTRY_GROUPS: IndustryGroup[] = (() => {
  const groups = new Map<string, IndustryGroup>();
  PRESETS.forEach((preset) => {
    PRESETS_BY_ID.set(preset.preset_id, preset);
    PRESETS_BY_PROFILE_REF.set(preset.profile_ref, preset);
    if (!groups.has(preset.industry_group)) {
      groups.set(preset.industry_group, {
        id: preset.industry_group,
        presets: []
      });
    }
    groups.get(preset.industry_group)?.presets.push(preset);
  });
  return Array.from(groups.values());
})();

export function PresetGallery(): JSX.Element {
  const { profileId, setProfileId } = useProfile();
  const [hasInitialised, setHasInitialised] = useState(false);

  const activePresetId = useMemo(() => {
    const match = PRESETS_BY_PROFILE_REF.get(profileId);
    return match?.preset_id ?? null;
  }, [profileId]);

  const [activeGroupId, setActiveGroupId] = useState(() => {
    if (activePresetId) {
      const preset = PRESETS_BY_ID.get(activePresetId);
      if (preset) {
        return preset.industry_group;
      }
    }
    return INDUSTRY_GROUPS[0]?.id ?? '';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || hasInitialised) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const presetId = params.get('preset');
    if (presetId) {
      const match = PRESETS_BY_ID.get(presetId);
      if (match) {
        setProfileId(match.profile_ref);
      }
    }
    setHasInitialised(true);
  }, [hasInitialised, setProfileId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasInitialised) {
      return;
    }
    const url = new URL(window.location.href);
    if (activePresetId) {
      url.searchParams.set('preset', activePresetId);
    } else {
      url.searchParams.delete('preset');
    }
    window.history.replaceState(null, '', url);
  }, [activePresetId, hasInitialised]);

  useEffect(() => {
    if (!activePresetId) {
      if (!activeGroupId && INDUSTRY_GROUPS[0]) {
        setActiveGroupId(INDUSTRY_GROUPS[0].id);
      }
      return;
    }
    const preset = PRESETS_BY_ID.get(activePresetId);
    if (preset && preset.industry_group !== activeGroupId) {
      setActiveGroupId(preset.industry_group);
    }
  }, [activePresetId, activeGroupId]);

  const handleApply = (preset: PresetDefinition) => {
    setProfileId(preset.profile_ref);
  };

  const visiblePresets = useMemo(() => {
    const group = INDUSTRY_GROUPS.find((entry) => entry.id === activeGroupId);
    return group?.presets ?? [];
  }, [activeGroupId]);

  return (
    <section aria-labelledby="preset-gallery-heading" className="space-y-[var(--gap-1)]">
      <div>
        <p
          id="preset-gallery-heading"
          className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400"
        >
          Preset gallery
        </p>
        <p className="mt-[var(--gap-0)] text-compact text-slate-400">
          Choose an industry group to explore ready-made civilian profiles.
        </p>
      </div>
      <div className="flex flex-col gap-[var(--gap-1)] sm:flex-row">
        <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
          {INDUSTRY_GROUPS.map((group) => {
            const isSelected = group.id === activeGroupId;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveGroupId(group.id)}
                className={`rounded-full border px-[var(--gap-1)] py-1 text-[11px] font-semibold uppercase tracking-[0.3em] transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                  isSelected
                    ? 'border-sky-500 bg-sky-500/10 text-slate-100 shadow-sm shadow-sky-900/40'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                }`}
                aria-pressed={isSelected}
              >
                {group.id}
              </button>
            );
          })}
        </div>
        <div className="grid flex-1 gap-[var(--gap-1)] sm:grid-cols-2">
          {visiblePresets.map((preset) => {
            const isActive = preset.preset_id === activePresetId;
            return (
              <button
                key={preset.preset_id}
                type="button"
                onClick={() => handleApply(preset)}
                className={`group flex h-full min-h-[136px] flex-col justify-between rounded-lg border text-left shadow-sm transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 pad-compact ${
                  isActive
                    ? 'border-sky-500 bg-sky-500/10 text-slate-100 shadow-sm shadow-sky-900/40'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                }`}
                aria-pressed={isActive}
              >
                <div className="flex items-center justify-between gap-[var(--gap-0)]">
                  <span className="text-[13px] font-semibold text-slate-100">{preset.display}</span>
                  {isActive && (
                    <span className="inline-flex items-center rounded-full bg-sky-500/20 px-[var(--gap-1)] py-[2px] text-[9px] font-semibold uppercase tracking-[0.25em] text-sky-300">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-[var(--gap-0)] text-compact text-slate-400">
                  Loads profile <span className="font-mono text-[11px] text-slate-300">{preset.profile_ref}</span>
                </p>
                <span className="mt-[var(--gap-0)] inline-flex items-center gap-[var(--gap-0)] text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500 transition group-hover:bg-sky-400" aria-hidden="true" />
                  Apply preset
                </span>
              </button>
            );
          })}
          {visiblePresets.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-4 text-center text-compact text-slate-400">
              No civilian presets available in this industry group yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
