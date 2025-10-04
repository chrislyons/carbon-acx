import { useMemo } from 'react';

import { ModeSplit, useProfile } from '../state/profile';

const MODE_LABELS: Record<keyof ModeSplit, string> = {
  car: 'Drive',
  transit: 'Transit',
  bike: 'Active'
};

const DIET_LABELS = {
  omnivore: 'Omnivore',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan'
} as const;

function formatStreaming(hours: number): string {
  if (hours <= 0) {
    return 'None';
  }
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`; // round minutes for short sessions
  }
  if (Number.isInteger(hours)) {
    return `${hours} hr`;
  }
  return `${hours.toFixed(1)} hr`;
}

export function ActivityPlanner(): JSX.Element {
  const { controls, activeLayers, primaryLayer } = useProfile();

  const workingLayers = useMemo(() => {
    if (activeLayers.length > 0) {
      return activeLayers;
    }
    return [primaryLayer];
  }, [activeLayers, primaryLayer]);

  const modeSplit = useMemo(() => {
    return (Object.entries(controls.modeSplit) as Array<[keyof ModeSplit, number]>)
      .filter(([, value]) => value > 0)
      .map(([mode, value]) => `${MODE_LABELS[mode]} ${value}%`)
      .join(' • ');
  }, [controls.modeSplit]);

  const commuteDays = controls.commuteDaysPerWeek;
  const commuteSummary = `${commuteDays} day${commuteDays === 1 ? '' : 's'} commuting / week`;
  const dietSummary = DIET_LABELS[controls.diet];
  const streamingSummary = `${formatStreaming(controls.streamingHoursPerDay)} streaming / day`;

  return (
    <div className="space-y-[calc(var(--gap-1)*0.9)]">
      <div className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-[calc(var(--gap-1)*0.85)] shadow-inner shadow-slate-950/60">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.3em] text-slate-300">Active layers</h3>
        <p className="mt-[8px] text-[12px] text-slate-400">
          Start with the layers below, then layer in additional detail as questions surface.
        </p>
        <ul className="mt-[calc(var(--gap-0)*0.9)] flex flex-wrap gap-[calc(var(--gap-0)*0.75)]">
          {workingLayers.map((layer) => (
            <li
              key={layer}
              className="inline-flex items-center gap-[6px] rounded-full border border-sky-500/40 bg-sky-500/10 px-[var(--gap-0)] py-[4px] text-[11px] font-medium uppercase tracking-[0.18em] text-sky-100"
            >
              <span className="h-[6px] w-[6px] rounded-full bg-sky-400" aria-hidden="true" />
              {layer}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-[calc(var(--gap-1)*0.85)] shadow-inner shadow-slate-950/50">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.3em] text-slate-300">Personal activity mix</h3>
        <dl className="mt-[calc(var(--gap-0)*0.9)] grid gap-[calc(var(--gap-0)*0.75)]">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Commute cadence</dt>
            <dd className="text-[12px] text-slate-200">{commuteSummary}</dd>
            <dd className="text-[11px] text-slate-400">{modeSplit}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Diet baseline</dt>
            <dd className="text-[12px] text-slate-200">{dietSummary}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Streaming habit</dt>
            <dd className="text-[12px] text-slate-200">{streamingSummary}</dd>
          </div>
        </dl>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-[calc(var(--gap-1)*0.85)] shadow-inner shadow-slate-950/70">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.3em] text-slate-300">Next up</h3>
        <p className="mt-[8px] text-[12px] text-slate-300">
          Trace these activities within the visualizers to see where emissions spike, then tighten the knobs above to test new scenarios.
        </p>
      </div>
    </div>
  );
}
