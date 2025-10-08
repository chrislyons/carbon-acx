import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy } from 'lucide-react';

import { hashManifest } from '../lib/hash';
import { DEFAULT_CONTROLS, type DietOption, type ModeSplit, useProfile } from '../state/profile';

const MODE_LABELS: Record<keyof ModeSplit, string> = {
  car: 'Drive',
  transit: 'Transit',
  bike: 'Active'
};

const DIET_LABELS: Record<DietOption, string> = {
  omnivore: 'Omnivore',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan'
};

interface SelectedRowSummary {
  activity_id: string;
  quantity: number;
}

function formatCommuteDays(days: number): string {
  return `${days} commute day${days === 1 ? '' : 's'}/week`;
}

function formatModeSplitSummary(split: ModeSplit, defaults: ModeSplit): string | null {
  const changedModes = (Object.keys(split) as (keyof ModeSplit)[]).filter(
    (mode) => Math.round(split[mode]) !== Math.round(defaults[mode])
  );
  if (changedModes.length === 0) {
    return null;
  }
  const descriptors = changedModes.map((mode) => `${MODE_LABELS[mode]} ${Math.round(split[mode])}%`);
  return `Commute mix ${descriptors.join(' / ')}`;
}

function formatStreamingSummary(hours: number): string {
  if (hours <= 0) {
    return 'No streaming';
  }
  if (hours < 1) {
    return `${Math.round(hours * 60)} min/day streaming`;
  }
  if (Number.isInteger(hours)) {
    return `${hours} hr/day streaming`;
  }
  return `${hours.toFixed(1)} hr/day streaming`;
}

function dedupeSourceIds(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set<string>();
  const ordered: string[] = [];
  values.forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    ordered.push(value);
  });
  return ordered;
}

export function ScenarioManifest(): JSX.Element {
  const profile = useProfile();
  const controls = (profile.controls ?? DEFAULT_CONTROLS) as typeof DEFAULT_CONTROLS;
  const overrides = (profile.overrides ?? {}) as Record<string, number>;
  const hasLifestyleOverrides = profile.hasLifestyleOverrides ?? false;
  const manifest = profile.result?.manifest ?? null;

  const overrideSource = manifest?.overrides ?? overrides;

  const selectedRows = useMemo<SelectedRowSummary[]>(() => {
    return Object.entries(overrideSource).reduce<SelectedRowSummary[]>((acc, [activityId, quantity]) => {
      if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
        return acc;
      }
      acc.push({ activity_id: activityId, quantity });
      return acc;
    }, []);
  }, [overrideSource]);

  const sourceIds = useMemo(() => dedupeSourceIds(manifest?.sources), [manifest]);

  const scenarioHash = useMemo(() => (manifest ? hashManifest(manifest) : null), [manifest]);

  const scenarioPayload = useMemo(
    () => ({
      selected_rows: selectedRows,
      source_ids: sourceIds,
      scenario_hash: scenarioHash,
    }),
    [selectedRows, sourceIds, scenarioHash],
  );

  const manifestJson = useMemo(() => JSON.stringify(scenarioPayload, null, 2), [scenarioPayload]);

  const changeSummary = useMemo(() => {
    const parts: string[] = [];
    if (hasLifestyleOverrides && controls.commuteDaysPerWeek !== DEFAULT_CONTROLS.commuteDaysPerWeek) {
      parts.push(formatCommuteDays(controls.commuteDaysPerWeek));
    }
    if (hasLifestyleOverrides) {
      const modeSummary = formatModeSplitSummary(controls.modeSplit, DEFAULT_CONTROLS.modeSplit);
      if (modeSummary) {
        parts.push(modeSummary);
      }
    }
    if (hasLifestyleOverrides && controls.diet !== DEFAULT_CONTROLS.diet) {
      parts.push(`${DIET_LABELS[controls.diet]} diet`);
    }
    if (hasLifestyleOverrides && controls.streamingHoursPerDay !== DEFAULT_CONTROLS.streamingHoursPerDay) {
      parts.push(formatStreamingSummary(controls.streamingHoursPerDay));
    }
    if (parts.length === 0) {
      parts.push('Defaults retained');
    }
    parts.push(`${selectedRows.length} active row${selectedRows.length === 1 ? '' : 's'}`);
    parts.push(`${sourceIds.length} source${sourceIds.length === 1 ? '' : 's'}`);
    return parts.join(' • ');
  }, [controls, hasLifestyleOverrides, selectedRows.length, sourceIds.length]);

  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const resetTimerRef = useRef<number | null>(null);

  const scheduleReset = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setCopyState('idle');
      resetTimerRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') {
        return;
      }
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setCopyState('idle');
    if (typeof window !== 'undefined' && resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, [manifestJson]);

  const handleCopy = useCallback(async () => {
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      setCopyState('error');
      scheduleReset();
      return;
    }
    try {
      await clipboard.writeText(manifestJson);
      setCopyState('copied');
    } catch (error) {
      console.warn('Failed to copy scenario manifest', error);
      setCopyState('error');
    }
    scheduleReset();
  }, [manifestJson, scheduleReset]);

  const copyTitle = copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy JSON';
  const copyAriaLabel =
    copyState === 'copied'
      ? 'Manifest JSON copied'
      : copyState === 'error'
      ? 'Copy manifest failed'
      : 'Copy manifest JSON';
  const copyFeedback =
    copyState === 'copied' ? 'Manifest JSON copied' : copyState === 'error' ? 'Copy failed' : '';

  return (
    <section className="rounded-xl border border-border/70 bg-card/70 p-5 shadow-inner shadow-black/40">
      <header className="flex items-center justify-between gap-3">
        <p className="text-2xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Scenario manifest</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="icon-btn"
            onClick={handleCopy}
            aria-label={copyAriaLabel}
            title={copyTitle}
            data-testid="scenario-manifest-copy"
          >
            <Copy aria-hidden />
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            {copyFeedback}
          </span>
        </div>
      </header>
      <p className="mt-3 text-xs text-muted-foreground" data-testid="scenario-manifest-summary">
        <span className="font-semibold text-foreground">What changed:</span> {changeSummary}
      </p>
      <div className="mt-4 rounded-lg border border-border/70 bg-background/70 p-4">
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-2xs leading-relaxed text-foreground">
          <code data-testid="scenario-manifest-json">{manifestJson}</code>
        </pre>
      </div>
    </section>
  );
}
