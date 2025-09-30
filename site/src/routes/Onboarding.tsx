import { useMemo, useState } from 'react';

import { Wizard, type WizardStep } from '../components/Wizard';
import type { DietOption, ModeSplit, ProfileControlsState } from '../state/profile';
import { useProfile } from '../state/profile';

const COMMUTE_STYLES: Array<{
  id: string;
  title: string;
  summary: string;
  split: ModeSplit;
}> = [
  {
    id: 'balanced',
    title: 'Mixed commute',
    summary: 'A familiar mix of driving with occasional transit and bike trips.',
    split: { car: 60, transit: 30, bike: 10 }
  },
  {
    id: 'driver',
    title: 'Driver first',
    summary: 'Mostly driving with a rare bus or bike day.',
    split: { car: 85, transit: 10, bike: 5 }
  },
  {
    id: 'transit',
    title: 'Transit-forward',
    summary: 'Train and bus trips most days, with driving kept low.',
    split: { car: 25, transit: 60, bike: 15 }
  }
];

const DIET_OPTIONS: Array<{
  id: DietOption;
  title: string;
  description: string;
}> = [
  {
    id: 'omnivore',
    title: 'Omnivore',
    description: 'Includes meat, dairy, and plant-based meals across the week.'
  },
  {
    id: 'vegetarian',
    title: 'Vegetarian',
    description: 'Plant-forward meals with eggs and dairy but no meat.'
  },
  {
    id: 'vegan',
    title: 'Vegan',
    description: 'Completely plant-based meals with no animal products.'
  }
];

const LOCAL_PRESET_KEY = 'acx:onboarding:preset';

type CommuteStyleId = (typeof COMMUTE_STYLES)[number]['id'];

declare global {
  interface Window {
    __ACX_ROUTER_TARGET__?: string;
  }
}

function getCommuteStyleId(split: ModeSplit): CommuteStyleId | null {
  for (const style of COMMUTE_STYLES) {
    if (
      style.split.car === split.car &&
      style.split.transit === split.transit &&
      style.split.bike === split.bike
    ) {
      return style.id;
    }
  }
  return null;
}

function persistLocalPreset(controls: ProfileControlsState): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload = {
    id: 'local:onboarding',
    label: 'My baseline',
    createdAt: new Date().toISOString(),
    controls
  };

  try {
    window.localStorage.setItem(LOCAL_PRESET_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist onboarding preset', error);
  }
}

function navigateToDashboard(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const target = window.__ACX_ROUTER_TARGET__ ?? '/';
  window.location.assign(target);
}

function formatCommuteDays(days: number): string {
  if (days === 0) {
    return 'No commute days';
  }
  if (days === 1) {
    return '1 day in office';
  }
  return `${days} days in office`;
}

export default function Onboarding(): JSX.Element {
  const { controls, setControlsState } = useProfile();
  const [draft, setDraft] = useState<ProfileControlsState>(controls);

  const selectedCommuteStyleId = useMemo(() => getCommuteStyleId(draft.modeSplit), [draft.modeSplit]);

  const steps = useMemo<WizardStep[]>(
    () => [
      {
        id: 'commute',
        title: 'Commute style',
        description:
          'Tell us how often you head into work and what transport mix feels closest to your week.',
        content: (
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">Commute days</h3>
              <p className="mt-2 text-sm text-slate-400">
                Slide to match how many days you usually travel to the office.
              </p>
              <div className="mt-4">
                <input
                  id="commute-days"
                  type="range"
                  min={0}
                  max={7}
                  step={1}
                  value={draft.commuteDaysPerWeek}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      commuteDaysPerWeek: Number.parseInt(event.target.value, 10)
                    }))
                  }
                  className="w-full accent-sky-500"
                  aria-valuemin={0}
                  aria-valuemax={7}
                  aria-valuenow={draft.commuteDaysPerWeek}
                  aria-labelledby="commute-days-label"
                />
                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-500">
                  <span id="commute-days-label">Days per week</span>
                  <span className="font-semibold text-slate-200">
                    {formatCommuteDays(draft.commuteDaysPerWeek)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">Transport mix</h3>
              <p className="mt-2 text-sm text-slate-400">
                Choose the mix that feels closest. You can tweak the exact split later from the dashboard.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {COMMUTE_STYLES.map((style) => {
                  const isActive = style.id === selectedCommuteStyleId;
                  return (
                    <label
                      key={style.id}
                      className={`group flex h-full cursor-pointer flex-col justify-between rounded-lg border p-4 text-left text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-500 ${
                        isActive
                          ? 'border-sky-500 bg-sky-500/10 text-slate-100 shadow-sm shadow-sky-900/40'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="commute-style"
                        value={style.id}
                        checked={isActive}
                        onChange={() =>
                          setDraft((previous) => ({
                            ...previous,
                            modeSplit: style.split
                          }))
                        }
                        className="sr-only"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{style.title}</p>
                        <p className="mt-2 text-xs text-slate-400">{style.summary}</p>
                      </div>
                      <dl className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                        <div>
                          <dt className="sr-only">Car</dt>
                          <dd>{style.split.car}% car</dd>
                        </div>
                        <div>
                          <dt className="sr-only">Transit</dt>
                          <dd>{style.split.transit}% transit</dd>
                        </div>
                        <div>
                          <dt className="sr-only">Bike</dt>
                          <dd>{style.split.bike}% bike</dd>
                        </div>
                      </dl>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )
      },
      {
        id: 'diet',
        title: 'Diet baseline',
        description: 'Pick the eating pattern that best represents your household meals.',
        content: (
          <div>
            <div className="grid gap-3 sm:grid-cols-3">
              {DIET_OPTIONS.map((option) => {
                const isActive = option.id === draft.diet;
                return (
                  <label
                    key={option.id}
                    className={`group flex h-full cursor-pointer flex-col justify-between rounded-lg border p-4 text-left text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-500 ${
                      isActive
                        ? 'border-sky-500 bg-sky-500/10 text-slate-100 shadow-sm shadow-sky-900/40'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="diet-option"
                      value={option.id}
                      checked={isActive}
                      onChange={() =>
                        setDraft((previous) => ({
                          ...previous,
                          diet: option.id
                        }))
                      }
                      className="sr-only"
                    />
                    <p className="text-sm font-semibold text-slate-100">{option.title}</p>
                    <p className="mt-2 text-xs text-slate-400">{option.description}</p>
                  </label>
                );
              })}
            </div>
          </div>
        )
      },
      {
        id: 'streaming',
        title: 'Streaming habits',
        description: 'Estimate your average screen time so we can build a baseline media footprint.',
        content: (
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">Daily streaming</h3>
              <p className="mt-2 text-sm text-slate-400">
                Include TV, laptop, and tablet time spent streaming shows, movies, or live video.
              </p>
              <div className="mt-4">
                <input
                  id="streaming-hours"
                  type="range"
                  min={0}
                  max={6}
                  step={0.5}
                  value={draft.streamingHoursPerDay}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      streamingHoursPerDay: Number.parseFloat(event.target.value)
                    }))
                  }
                  className="w-full accent-sky-500"
                  aria-valuemin={0}
                  aria-valuemax={6}
                  aria-valuenow={draft.streamingHoursPerDay}
                  aria-labelledby="streaming-hours-label"
                />
                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-500">
                  <span id="streaming-hours-label">Hours per day</span>
                  <span className="font-semibold text-slate-200">
                    {draft.streamingHoursPerDay.toFixed(1)} hours
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
              <p className="font-semibold uppercase tracking-[0.3em] text-slate-300">Summary</p>
              <ul className="mt-3 space-y-2">
                <li className="flex items-start justify-between gap-3">
                  <span className="text-slate-400">Commute</span>
                  <span className="text-slate-200">
                    {formatCommuteDays(draft.commuteDaysPerWeek)} ·{' '}
                    {selectedCommuteStyleId
                      ? COMMUTE_STYLES.find((style) => style.id === selectedCommuteStyleId)?.title
                      : 'Custom mix'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span className="text-slate-400">Diet</span>
                  <span className="text-slate-200">
                    {DIET_OPTIONS.find((option) => option.id === draft.diet)?.title ?? 'Custom'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-3">
                  <span className="text-slate-400">Streaming</span>
                  <span className="text-slate-200">
                    {draft.streamingHoursPerDay.toFixed(1)} hours daily
                  </span>
                </li>
              </ul>
              <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                You can fine-tune all of these from the dashboard later on.
              </p>
            </div>
          </div>
        )
      }
    ],
    [draft, selectedCommuteStyleId]
  );

  const handleComplete = () => {
    setControlsState(draft);
    persistLocalPreset(draft);
    navigateToDashboard();
  };

  const handleSkip = () => {
    navigateToDashboard();
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900/60 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-sky-400">Carbon</p>
            <h1 className="mt-1 text-xl font-semibold">Welcome to the Analysis Console</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              We'll start with a quick three-step wizard to set a baseline profile. It takes under a minute.
            </p>
          </div>
          <a
            href="/"
            className="hidden text-xs font-semibold uppercase tracking-[0.25em] text-slate-400 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 sm:inline-flex"
          >
            Skip onboarding
          </a>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-5 py-10 sm:py-14">
        <Wizard steps={steps} onComplete={handleComplete} onSkip={handleSkip} finishLabel="Create profile" />
      </main>
    </div>
  );
}
