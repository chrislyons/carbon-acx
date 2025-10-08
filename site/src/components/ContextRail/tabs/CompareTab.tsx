import type { ReactNode } from 'react';

import {
  SHELL_MAX_DOCK_FRACTION,
  SHELL_MIN_DOCK_FRACTION,
  type ShellDockPosition
} from '@/theme/tokens';

import type { DockController } from '../types';

export interface CompareTabProps {
  controller: DockController;
  content?: ReactNode | ((controller: DockController) => ReactNode);
}

function formatPositionLabel(position: ShellDockPosition): string {
  return position === 'bottom' ? 'Below' : 'Side';
}

export default function CompareTab({ controller, content }: CompareTabProps): JSX.Element {
  const { isOpen, isLoading, dockPosition, dockFraction } = controller;
  const sliderValue = Number.isFinite(dockFraction) ? dockFraction : SHELL_MIN_DOCK_FRACTION;
  const percentLabel = `${Math.round(sliderValue * 100)}%`;

  const resolvedContent = typeof content === 'function' ? content(controller) : content;

  return (
    <section className="space-y-5" aria-label="Comparison tools">
      <header className="space-y-2">
        <p className="text-2xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Side-by-side view</p>
        <p className="text-xs text-muted-foreground">
          Open a secondary dock to compare charts without losing your place.
        </p>
      </header>
      <div className="flex flex-col gap-3" role="group" aria-label="Dock controls">
        <button
          type="button"
          className="self-start rounded-full border border-border/60 bg-background/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-foreground transition hover:border-primary/60 hover:text-primary"
          onClick={() => (isOpen ? controller.close() : controller.open())}
          data-testid="context-rail-dock-toggle"
        >
          {isOpen ? 'Hide dock' : isLoading ? 'Preparing…' : 'Open dock'}
        </button>
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Orientation
          </span>
          <div className="flex gap-2">
            {(['side', 'bottom'] as ShellDockPosition[]).map((position) => (
              <button
                key={position}
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] transition ${
                  dockPosition === position
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
                onClick={() => controller.setDockPosition(position)}
                aria-pressed={dockPosition === position}
                data-testid={`context-rail-dock-position-${position}`}
              >
                {formatPositionLabel(position)}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Dock size
          <span className="flex items-center gap-3 text-xs font-normal normal-case text-muted-foreground">
            <input
              type="range"
              min={SHELL_MIN_DOCK_FRACTION}
              max={SHELL_MAX_DOCK_FRACTION}
              step={0.01}
              value={sliderValue}
              onChange={(event) => controller.setDockFraction(Number(event.target.value))}
              aria-valuetext={percentLabel}
              data-testid="context-rail-dock-size"
            />
            <output className="rounded bg-muted/40 px-2 py-0.5 text-xs font-semibold text-foreground">{percentLabel}</output>
          </span>
        </label>
      </div>
      {resolvedContent ? (
        <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground" data-testid="context-rail-compare-content">
          {resolvedContent}
        </div>
      ) : null}
    </section>
  );
}
