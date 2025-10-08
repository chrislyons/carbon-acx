import { useCallback, useId, useMemo } from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent
} from 'react';

import { useShellLayout } from '@/hooks/useShellLayout';
import {
  SHELL_HEADER_MAX_HEIGHT,
  SHELL_MAX_LEFT_FRACTION,
  SHELL_MAX_RIGHT_FRACTION,
  SHELL_MIN_LEFT_FRACTION,
  SHELL_MIN_RIGHT_FRACTION
} from '@/theme/tokens';

const KPI_ITEMS = [
  { label: 'Net emissions', value: '18.4 tCO₂e', helper: '−12% vs plan' },
  { label: 'Offset budget', value: '$24.6k', helper: 'Planned for Q3' },
  { label: 'Operational scope', value: 'Scope 1 + 2', helper: '3 offices reporting' },
  { label: 'Next audit', value: '24 Oct', helper: 'In 38 days' }
];

const PLAYBOOKS = [
  {
    title: 'Strategic initiatives',
    items: [
      'Transit benefits expansion',
      'Heat-pump retrofit pilot',
      'Green procurement review'
    ]
  },
  {
    title: 'Operational checkpoints',
    items: ['Metering sync', 'Supplier attestations', 'Employee survey fielding']
  }
];

const HIGHLIGHTED_ACTIVITIES = [
  {
    title: 'Retrofit financing workshop',
    description: 'Finance + Ops alignment session to confirm scope and budgets.',
    time: 'Tomorrow · 10:30–11:30'
  },
  {
    title: 'EV fleet trial update',
    description: 'Review utilisation metrics and maintenance backlog for pilot fleet.',
    time: 'Thu · 15:00–15:45'
  },
  {
    title: 'Employee commute audit',
    description: 'Validate rideshare reimbursements and transit card redemptions.',
    time: 'Mon · 09:00–11:00'
  }
];

const REFERENCE_NOTES = [
  {
    heading: 'Monitoring',
    detail: 'IAQ sensors show a 9% improvement week-over-week after HVAC tuning.'
  },
  {
    heading: 'Offsets',
    detail: 'Contracts verified for 12,000 tCO₂e of forestry credits through 2027.'
  },
  {
    heading: 'Alerts',
    detail: 'Scope 3 supplier audit delayed—awaiting legal review of contract addendum.'
  }
];

export default function ShellRoute(): JSX.Element {
  const {
    containerRef,
    leftFraction,
    rightFraction,
    leftPercentage,
    rightPercentage,
    dividerWidth,
    setLeftFraction,
    setRightFraction,
    shiftLeftBy,
    shiftRightBy,
    reset,
    keyboardStep
  } = useShellLayout();

  const leftPaneId = useId();
  const mainPaneId = useId();
  const rightPaneId = useId();

  const layoutStyle = useMemo(() => {
    return {
      '--rail-left': `${leftPercentage.toFixed(3)}%`,
      '--rail-right': `${rightPercentage.toFixed(3)}%`,
      gridTemplateColumns: 'var(--rail-left) minmax(0, 1fr) var(--rail-right)'
    } as CSSProperties;
  }, [leftPercentage, rightPercentage]);

  const leftHandleStyle = useMemo(() => {
    return {
      left: `calc(${leftPercentage.toFixed(3)}% - ${dividerWidth / 2}px)`
    } as CSSProperties;
  }, [dividerWidth, leftPercentage]);

  const rightHandleStyle = useMemo(() => {
    return {
      left: `calc(100% - ${rightPercentage.toFixed(3)}% - ${dividerWidth / 2}px)`
    } as CSSProperties;
  }, [dividerWidth, rightPercentage]);

  const handleLeftPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const host = containerRef.current;
      if (!host) {
        return;
      }
      const bounds = host.getBoundingClientRect();
      if (bounds.width <= 0) {
        return;
      }
      event.preventDefault();
      const pointerId = event.pointerId;
      const originX = event.clientX;
      const startLeft = leftFraction;
      const target = event.currentTarget;
      target.setPointerCapture?.(pointerId);

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        const delta = pointerEvent.clientX - originX;
        const next = startLeft + delta / bounds.width;
        setLeftFraction(next);
      };

      const handlePointerUp = () => {
        target.releasePointerCapture?.(pointerId);
        window.removeEventListener('pointermove', handlePointerMove);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp, { once: true });
      window.addEventListener('pointercancel', handlePointerUp, { once: true });
    },
    [containerRef, leftFraction, setLeftFraction]
  );

  const handleRightPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const host = containerRef.current;
      if (!host) {
        return;
      }
      const bounds = host.getBoundingClientRect();
      if (bounds.width <= 0) {
        return;
      }
      event.preventDefault();
      const pointerId = event.pointerId;
      const originX = event.clientX;
      const startRight = rightFraction;
      const target = event.currentTarget;
      target.setPointerCapture?.(pointerId);

      const handlePointerMove = (pointerEvent: PointerEvent) => {
        const delta = originX - pointerEvent.clientX;
        const next = startRight + delta / bounds.width;
        setRightFraction(next);
      };

      const handlePointerUp = () => {
        target.releasePointerCapture?.(pointerId);
        window.removeEventListener('pointermove', handlePointerMove);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp, { once: true });
      window.addEventListener('pointercancel', handlePointerUp, { once: true });
    },
    [containerRef, rightFraction, setRightFraction]
  );

  const handleLeftKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!event.altKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'arrowright') {
        event.preventDefault();
        shiftLeftBy(keyboardStep);
      } else if (key === 'arrowleft') {
        event.preventDefault();
        shiftLeftBy(-keyboardStep);
      }
    },
    [keyboardStep, shiftLeftBy]
  );

  const handleRightKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!event.altKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'arrowleft') {
        event.preventDefault();
        shiftRightBy(keyboardStep);
      } else if (key === 'arrowright') {
        event.preventDefault();
        shiftRightBy(-keyboardStep);
      }
    },
    [keyboardStep, shiftRightBy]
  );

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      reset();
    },
    [reset]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen grid-rows-[auto_minmax(0,1fr)_auto]">
        <header
          className="flex h-16 min-h-[3.5rem] items-center justify-between gap-4 border-b border-slate-800/70 bg-slate-950/80 px-6"
          style={{ maxHeight: SHELL_HEADER_MAX_HEIGHT }}
        >
          <div className="flex items-center gap-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/20 text-base font-semibold text-sky-300">
              ACX
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide text-slate-50">Carbon Navigator</p>
              <p className="text-xs text-slate-400">Split-pane workspace shell</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
            <span className="text-slate-100">Overview</span>
            <span className="text-slate-400">Playbooks</span>
            <span className="text-slate-400">Insights</span>
            <span className="text-slate-400">History</span>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
              L {leftPercentage.toFixed(0)}% · R {rightPercentage.toFixed(0)}%
            </span>
            <button
              type="button"
              onClick={reset}
              className="rounded border border-slate-700/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-200 transition hover:border-sky-500/70 hover:text-sky-300"
            >
              Reset layout
            </button>
          </div>
        </header>

        <div
          ref={containerRef}
          className="relative grid min-h-0 grid-cols-[var(--rail-left)_minmax(0,1fr)_var(--rail-right)] overflow-hidden"
          style={layoutStyle}
        >
          <aside
            id={leftPaneId}
            aria-label="Planning rail"
            className="flex h-full flex-col gap-6 border-r border-slate-800/70 bg-slate-950/70 px-6 py-6"
          >
            {PLAYBOOKS.map((section) => (
              <section key={section.title} className="space-y-3">
                <header className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    {section.title}
                  </p>
                  <div className="h-px w-full bg-slate-800/70" />
                </header>
                <ul className="space-y-2 text-sm text-slate-200">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500/80" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </aside>

          <main
            id={mainPaneId}
            className="flex min-h-0 flex-col overflow-hidden bg-slate-950/40"
            aria-labelledby="workspace-title"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/70 px-6 pb-4 pt-6">
              <div>
                <p id="workspace-title" className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Reporting window
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-50">Q3 mitigation sprint</h1>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-slate-700/70 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-300">
                  Live sync
                </span>
                <span>Updated 4 minutes ago</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-10 pt-6">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {HIGHLIGHTED_ACTIVITIES.map((activity) => (
                  <article key={activity.title} className="flex h-full flex-col rounded-lg border border-slate-800/70 bg-slate-900/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">{activity.time}</p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-50">{activity.title}</h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-300">{activity.description}</p>
                    <button
                      type="button"
                      className="mt-4 self-start rounded border border-slate-700/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-slate-200 transition hover:border-sky-500/70 hover:text-sky-300"
                    >
                      Open brief
                    </button>
                  </article>
                ))}
              </section>
              <section className="mt-8 space-y-3">
                <header className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Emission hotspots</p>
                  <span className="text-xs text-slate-400">Rolling 12-month view</span>
                </header>
                <div className="overflow-hidden rounded-lg border border-slate-800/70">
                  <table className="min-w-full divide-y divide-slate-800/60 text-sm">
                    <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-[0.2em] text-slate-400">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Activity
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          FY emissions
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Change vs plan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 text-slate-200">
                      <tr>
                        <td className="px-4 py-3">Data centre workloads</td>
                        <td className="px-4 py-3">6.2 tCO₂e</td>
                        <td className="px-4 py-3 text-rose-400">+3.1%</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">Employee commuting</td>
                        <td className="px-4 py-3">4.8 tCO₂e</td>
                        <td className="px-4 py-3 text-emerald-400">−5.4%</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">On-site kitchens</td>
                        <td className="px-4 py-3">3.6 tCO₂e</td>
                        <td className="px-4 py-3 text-rose-400">+1.9%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </main>

          <aside
            id={rightPaneId}
            aria-label="Reference rail"
            className="flex h-full flex-col gap-5 border-l border-slate-800/70 bg-slate-950/70 px-6 py-6"
          >
            {REFERENCE_NOTES.map((entry) => (
              <article key={entry.heading} className="space-y-2 rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  {entry.heading}
                </p>
                <p className="text-sm leading-relaxed text-slate-200">{entry.detail}</p>
              </article>
            ))}
          </aside>

          <div
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            aria-controls={`${leftPaneId} ${mainPaneId}`}
            aria-valuemin={Math.round(SHELL_MIN_LEFT_FRACTION * 100)}
            aria-valuemax={Math.round(SHELL_MAX_LEFT_FRACTION * 100)}
            aria-valuenow={Math.round(leftFraction * 100)}
            aria-valuetext={`Left rail width ${leftPercentage.toFixed(0)} percent`}
            aria-label="Resize planning rail"
            className="group absolute top-0 z-20 flex h-full cursor-col-resize items-center justify-center touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            style={{ ...leftHandleStyle, width: dividerWidth }}
            onPointerDown={handleLeftPointerDown}
            onKeyDown={handleLeftKeyDown}
            onDoubleClick={handleDoubleClick}
          >
            <span
              className="pointer-events-none h-16 w-px rounded-full bg-slate-600 transition group-hover:bg-sky-500 group-focus-visible:bg-sky-500"
              aria-hidden="true"
            />
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            aria-controls={`${mainPaneId} ${rightPaneId}`}
            aria-valuemin={Math.round(SHELL_MIN_RIGHT_FRACTION * 100)}
            aria-valuemax={Math.round(SHELL_MAX_RIGHT_FRACTION * 100)}
            aria-valuenow={Math.round(rightFraction * 100)}
            aria-valuetext={`Right rail width ${rightPercentage.toFixed(0)} percent`}
            aria-label="Resize reference rail"
            className="group absolute top-0 z-20 flex h-full cursor-col-resize items-center justify-center touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            style={{ ...rightHandleStyle, width: dividerWidth }}
            onPointerDown={handleRightPointerDown}
            onKeyDown={handleRightKeyDown}
            onDoubleClick={handleDoubleClick}
          >
            <span
              className="pointer-events-none h-16 w-px rounded-full bg-slate-600 transition group-hover:bg-sky-500 group-focus-visible:bg-sky-500"
              aria-hidden="true"
            />
          </div>
        </div>

        <footer className="flex flex-nowrap items-center gap-8 overflow-x-auto border-t border-slate-800/70 bg-slate-950/80 px-6 py-3 text-xs uppercase tracking-[0.25em] text-slate-300">
          {KPI_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-3 whitespace-nowrap">
              <span className="text-slate-500">{item.label}</span>
              <span className="font-semibold text-slate-50">{item.value}</span>
              <span className="text-[0.7rem] text-slate-400">{item.helper}</span>
            </div>
          ))}
        </footer>
      </div>
    </div>
  );
}
