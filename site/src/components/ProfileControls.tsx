import { Fragment, useMemo } from 'react';

import { DietOption, ModeSplit, useProfile } from '../state/profile';

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
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-900/40 backdrop-blur"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 id="profile-controls-heading" className="text-lg font-semibold">
            Profile Controls
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Tune lifestyle assumptions for <span className="font-semibold text-slate-200">{profileId}</span>. Updates
            propagate to the compute API automatically.
          </p>
        </div>
      </div>
      <form className="mt-6 space-y-7" aria-describedby="profile-controls-heading">
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Commute cadence</legend>
          <label className="block space-y-2">
            <span className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <span>Days in office</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
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
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {modeSegments.map(({ key, value, metadata }) => (
                <div key={key} className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{metadata.label}</p>
                      <p className="text-xs text-slate-400">{metadata.description}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-200">{value}%</span>
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

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Dietary baseline</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.entries(DIET_COPY) as [DietOption, { label: string; helper: string }][]).map(
              ([key, copy]) => {
                const isActive = controls.diet === key;
                return (
                  <label
                    key={key}
                    className={`relative flex cursor-pointer flex-col gap-2 rounded-lg border px-3 py-3 text-left shadow-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-500 ${
                      isActive
                        ? 'border-sky-500 bg-sky-500/10 text-slate-100'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-sm font-semibold">{copy.label}</span>
                    <span className="text-xs text-slate-400">{copy.helper}</span>
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
                      className={`pointer-events-none absolute right-3 top-3 inline-flex h-2.5 w-2.5 rounded-full ${
                        isActive ? 'bg-sky-400' : 'bg-slate-700'
                      }`}
                    />
                  </label>
                );
              }
            )}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Streaming intensity
          </legend>
          <label className="block space-y-2">
            <span className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              <span>HD streaming</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
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

        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          <p className="font-semibold text-slate-200">Live overrides</p>
          <dl className="grid gap-2 text-xs md:grid-cols-2">
            {modeSegments.map(({ key, value, metadata }) => (
              <Fragment key={`override-${key}`}>
                <dt className="uppercase tracking-[0.2em] text-slate-500">{metadata.label} days/wk</dt>
                <dd className="font-semibold text-slate-200">
                  {((controls.commuteDaysPerWeek * value) / 100).toFixed(2)}
                </dd>
              </Fragment>
            ))}
            <Fragment key="override-diet">
              <dt className="uppercase tracking-[0.2em] text-slate-500">Diet selection</dt>
              <dd className="font-semibold text-slate-200">{DIET_COPY[controls.diet].label}</dd>
            </Fragment>
            <Fragment key="override-stream">
              <dt className="uppercase tracking-[0.2em] text-slate-500">Streaming hours/week</dt>
              <dd className="font-semibold text-slate-200">
                {(controls.streamingHoursPerDay * 7).toFixed(1)}
              </dd>
            </Fragment>
          </dl>
        </div>
      </form>
    </section>
  );
}
