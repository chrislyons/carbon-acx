import { useEffect, useMemo, useState } from 'react';

import presetsData from '../data/presets.json';
import { ProfileControlsState, useProfile } from '../state/profile';

interface PresetDefinition {
  id: string;
  title: string;
  summary: string;
  controls: ProfileControlsState;
  overrides: Record<string, number>;
}

const PRESETS: PresetDefinition[] = presetsData as PresetDefinition[];
const EPSILON = 0.001;

function areOverridesEqual(
  candidate: Record<string, number>,
  reference: Record<string, number>
): boolean {
  const candidateKeys = Object.keys(candidate);
  const referenceKeys = Object.keys(reference);

  if (candidateKeys.length !== referenceKeys.length) {
    return false;
  }

  for (const key of candidateKeys) {
    if (!Object.prototype.hasOwnProperty.call(reference, key)) {
      return false;
    }
    const candidateValue = candidate[key];
    const referenceValue = reference[key];
    if (Math.abs(candidateValue - referenceValue) > EPSILON) {
      return false;
    }
  }

  return true;
}

export function PresetGallery(): JSX.Element {
  const { overrides, setControlsState } = useProfile();
  const [hasInitialised, setHasInitialised] = useState(false);

  const activePresetId = useMemo(() => {
    for (const preset of PRESETS) {
      if (areOverridesEqual(preset.overrides, overrides)) {
        return preset.id;
      }
    }
    return null;
  }, [overrides]);

  useEffect(() => {
    if (typeof window === 'undefined' || hasInitialised) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const presetId = params.get('preset');
    if (presetId) {
      const match = PRESETS.find((preset) => preset.id === presetId);
      if (match) {
        setControlsState(match.controls);
      }
    }
    setHasInitialised(true);
  }, [hasInitialised, setControlsState]);

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

  const handleApply = (preset: PresetDefinition) => {
    setControlsState(preset.controls);
  };

  return (
    <section aria-labelledby="preset-gallery-heading" className="mt-6 space-y-4">
      <div>
        <p
          id="preset-gallery-heading"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400"
        >
          Preset gallery
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Load a ready-made lifestyle profile. Re-selecting a preset restores its saved state.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PRESETS.map((preset) => {
          const isActive = preset.id === activePresetId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApply(preset)}
              className={`group flex h-full flex-col justify-between rounded-lg border p-4 text-left transition focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                isActive
                  ? 'border-sky-500 bg-sky-500/10 text-slate-100 shadow-sm shadow-sky-900/40'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600'
              }`}
              aria-pressed={isActive}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-100">{preset.title}</span>
                {isActive && (
                  <span className="inline-flex items-center rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">
                    Active
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-400">{preset.summary}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500 transition group-hover:bg-sky-400" aria-hidden="true" />
                Apply preset
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
