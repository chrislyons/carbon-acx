import { Fragment, useMemo } from 'react';

import { DietOption, ModeSplit, useProfile } from '../state/profile';

import { PresetGallery } from './PresetGallery';

const MODE_METADATA: Record<keyof ModeSplit, { label: string; description: string; color: string }> = {
  car: {
    label: 'Car',
    description: 'Single-occupancy or carpool commute days',
    color: 'bg-sky-500'
  },
  transit: {
    label: 'Transit',
    description: 'Bus, rail, or micro-transit commute days',
    color: 'bg-emerald-400'
  },
  bike: {
    label: 'Active',
    description: 'Bike and other active commute days',
    color: 'bg-amber-400'
  }
};

const DIET_COPY: Record<DietOption, { label: string; helper: string }> = {
  omnivore: {
    label: 'Omnivore',
    helper: 'Mixed animal and plant-based diet'
  },
  vegetarian: {
    label: 'Vegetarian',
    helper: 'No meat; includes eggs and dairy'
  },
  vegan: {
    label: 'Vegan',
    helper: 'Fully plant-based meals'
  }
};

function pluraliseDays(value: number): string {
  const rounded = Math.round(value);
  return `${rounded} day${rounded === 1 ? '' : 's'}`;
}

function formatHoursPerDay(value: number): string {
  return `${value.toFixed(1)} h/day`;
}

export function ProfileControls(): JSX.Element {
  const {
    profileId,
    controls,
    setCommuteDays,
    setModeSplit,
    setDiet,
    setStreamingHours
  } = useProfile();

  const modeSegments = useMemo(() => {
    const entries = Object.entries(controls.modeSplit) as [keyof ModeSplit, number][];
    return entries.map(([key, value]) => ({
      key,
      value,
      metadata: MODE_METADATA[key]
    }));
  }, [controls.modeSplit]);

  return (
    <section
      aria-labelledby="profile-controls-heading"
      className="acx-card flex flex-col gap-[var(--gap-1)] bg-slate-950/60 shadow-lg shadow-slate-900/40"
    >
      <header className="sticky top-0 z-10 -mx-[var(--card-pad)] -mt-[var(--card-pad)] rounded-t-[var(--card-radius)] bg-black/30 px-[var(--card-pad)] py-[var(--gap-0)] backdrop-blur-sm">
        <h2 id="profile-controls-heading" className="text-[13px] font-semibold tracking-tight">
          Profile Controls
        </h2>
        <p className="mt-[var(--gap-0)] text-compact text-slate-400">
          Tune lifestyle assumptions for <span className="font-semibold text-slate-200">{profileId}</span>. Updates
          propagate to the compute API automatically.
        </p>
      </header>
      <div className="mt-[var(--gap-0)] space-y-[var(--gap-1)]">
        <PresetGallery />
        <form className="grid grid-cols-2 gap-[var(--gap-1)]" aria-describedby="profile-controls-heading">
          <fieldset className="relative col-span-2 space-y-[var(--gap-1)] rounded-xl border border-slate-800/70 bg-slate-950/40 p-[var(--gap-1)]">
            <legend className="sticky top-0 z-10 -mx-[var(--gap-1)] -mt-[var(--gap-1)] bg-black/30 px-[var(--gap-1)] py-[3px] text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-300 backdrop-blur-sm">
              Commute cadence
            </legend>
            <label className="block space-y-[var(--gap-0)]">
              <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-400">
                <span>Days in office</span>
                <span className="rounded-full bg-slate-800 px-[var(--gap-1)] py-[2px] text-[10px] font-semibold text-slate-200">
                  {pluraliseDays(controls.commuteDaysPerWeek)}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={7}
                step={1}
                value={controls.commuteDaysPerWeek}
                onChange={(event) => setCommuteDays(Number(event.target.value))}
                className="w-full accent-sky-500"
                aria-valuetext={`${controls.commuteDaysPerWeek} commute days per week`}
              />
            </label>
            <div className="space-y-[var(--gap-1)]">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-400">
                <span>Mode split</span>
                <span>{controls.modeSplit.car + controls.modeSplit.transit + controls.modeSplit.bike}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                {modeSegments.map(({ key, value, metadata }) => (
                  <div
                    key={key}
                    className={`${metadata.color} h-full`}
                    style={{ width: `${value}%` }}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <div className="grid gap-[var(--gap-1)] sm:grid-cols-2">
                {modeSegments.map(({ key, value, metadata }) => (
                  <div key={key} className="space-y-[var(--gap-0)] rounded-lg border border-slate-800/70 bg-slate-900/60 pad-compact">
                    <div className="flex items-center justify-between gap-[var(--gap-0)]">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-100">{metadata.label}</p>
                        <p className="text-compact text-slate-400">{metadata.description}</p>
                      </div>
                      <span className="text-[13px] font-semibold text-slate-200">{value}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={value}
                      onChange={(event) => setModeSplit(key, Number(event.target.value))}
                      className="w-full accent-slate-200"
                      aria-valuetext={`${metadata.label} ${value}% share`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="col-span-2 space-y-[var(--gap-1)] rounded-xl border border-slate-800/70 bg-slate-950/40 p-[var(--gap-1)]">
            <legend className="sticky top-0 z-10 -mx-[var(--gap-1)] -mt-[var(--gap-1)] bg-black/30 px-[var(--gap-1)] py-[3px] text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-300 backdrop-blur-sm">
              Dietary baseline
            </legend>
            <div className="grid grid-cols-1 gap-[var(--gap-1)] sm:grid-cols-3">
              {(Object.entries(DIET_COPY) as [DietOption, { label: string; helper: string }][]).map(
                ([key, copy]) => {
                  const isActive = controls.diet === key;
                  return (
                    <label
                      key={key}
                      className={`relative flex min-h-[128px] cursor-pointer flex-col gap-[var(--gap-0)] rounded-lg border text-left shadow-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-500 pad-compact ${
                        isActive
                          ? 'border-sky-500 bg-sky-500/10 text-slate-100'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-[13px] font-semibold">{copy.label}</span>
                      <span className="form-helper text-slate-400">{copy.helper}</span>
                      <input
                        type="radio"
                        name="diet"
                        value={key}
                        checked={isActive}
                        onChange={() => setDiet(key)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute right-3 top-3 inline-flex h-2 w-2 rounded-full ${
                          isActive ? 'bg-sky-400' : 'bg-slate-700'
                        }`}
                      />
                    </label>
                  );
                }
              )}
            </div>
          </fieldset>

          <fieldset className="col-span-2 space-y-[var(--gap-1)] rounded-xl border border-slate-800/70 bg-slate-950/40 p-[var(--gap-1)]">
            <legend className="sticky top-0 z-10 -mx-[var(--gap-1)] -mt-[var(--gap-1)] bg-black/30 px-[var(--gap-1)] py-[3px] text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-300 backdrop-blur-sm">
              Streaming intensity
            </legend>
            <label className="block space-y-[var(--gap-0)]">
              <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-400">
                <span>HD streaming</span>
                <span className="rounded-full bg-slate-800 px-[var(--gap-1)] py-[2px] text-[10px] font-semibold text-slate-200">
                  {formatHoursPerDay(controls.streamingHoursPerDay)}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={6}
                step={0.1}
                value={controls.streamingHoursPerDay}
                onChange={(event) => setStreamingHours(Number(event.target.value))}
                className="w-full accent-pink-400"
                aria-valuetext={`${controls.streamingHoursPerDay.toFixed(1)} hours per day of streaming`}
              />
            </label>
          </fieldset>

          <div className="col-span-2 space-y-[var(--gap-1)] rounded-xl border border-slate-800/70 bg-slate-950/30 p-[var(--gap-1)] text-compact text-slate-400">
            <p className="text-[13px] font-semibold text-slate-200">Live overrides</p>
            <dl className="grid gap-[var(--gap-0)] md:grid-cols-2">
              {modeSegments.map(({ key, value, metadata }) => (
                <Fragment key={`override-${key}`}>
                  <dt className="text-[10px] uppercase tracking-[0.3em] text-slate-300">{metadata.label} days/wk</dt>
                  <dd className="text-[13px] font-semibold text-slate-200">
                    {((controls.commuteDaysPerWeek * value) / 100).toFixed(2)}
                  </dd>
                </Fragment>
              ))}
              <Fragment key="override-diet">
                <dt className="text-[10px] uppercase tracking-[0.3em] text-slate-300">Diet selection</dt>
                <dd className="text-[13px] font-semibold text-slate-200">{DIET_COPY[controls.diet].label}</dd>
              </Fragment>
              <Fragment key="override-stream">
                <dt className="text-[10px] uppercase tracking-[0.3em] text-slate-300">Streaming hours/week</dt>
                <dd className="text-[13px] font-semibold text-slate-200">
                  {(controls.streamingHoursPerDay * 7).toFixed(1)}
                </dd>
              </Fragment>
            </dl>
          </div>
        </form>
      </div>
    </section>
  );
}
