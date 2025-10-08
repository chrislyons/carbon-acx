import { getActivityById, getCategoryLabel, getLayerLabel, type Catalog } from './catalog';

export type CategoryKey = 'activity.category' | 'layer_id';

export interface ScenarioActivityChange {
  activity_id: string;
  delta?: number | null;
  total_base?: number | null;
  total_compare?: number | null;
}

export interface ScenarioDiff {
  changed?: ScenarioActivityChange[] | null;
  added?: ScenarioActivityChange[] | null;
  removed?: ScenarioActivityChange[] | null;
}

export interface CategoryDelta {
  key: string;
  label: string;
  delta: number;
  delta_pct: number;
  total_base: number | null;
  total_compare: number | null;
}

interface CategoryBucket {
  key: string;
  label: string;
  delta: number;
  totalBase: number;
  hasBase: boolean;
  totalCompare: number;
  hasCompare: boolean;
}

function toNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function round4(value: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  return Math.round(value * 10_000) / 10_000;
}

function resolveCategoryKey(
  change: ScenarioActivityChange,
  basis: CategoryKey,
  catalog: Catalog
): { key: string; label: string } {
  const activity = getActivityById(catalog, change.activity_id);
  if (basis === 'layer_id') {
    const raw = typeof activity?.layer_id === 'string' ? activity.layer_id : '';
    const key = raw || 'unassigned';
    return { key, label: getLayerLabel(catalog, raw) };
  }
  const raw = typeof activity?.category === 'string' ? activity.category : '';
  const key = raw || 'uncategorized';
  return { key, label: getCategoryLabel(catalog, raw) };
}

export function aggregateByCategory(
  diff: ScenarioDiff,
  basis: CategoryKey,
  catalog: Catalog
): CategoryDelta[] {
  const buckets = new Map<string, CategoryBucket>();
  const rows = [diff.changed, diff.added, diff.removed]
    .flat()
    .filter((entry): entry is ScenarioActivityChange => Boolean(entry && entry.activity_id));

  rows.forEach((entry) => {
    const { key, label } = resolveCategoryKey(entry, basis, catalog);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        label,
        delta: 0,
        totalBase: 0,
        hasBase: false,
        totalCompare: 0,
        hasCompare: false
      } satisfies CategoryBucket;
      buckets.set(key, bucket);
    }
    const delta = toNumber(entry.delta);
    if (delta !== null) {
      bucket.delta += delta;
    }
    const base = toNumber(entry.total_base);
    if (base !== null) {
      bucket.totalBase += base;
      bucket.hasBase = true;
    }
    const compare = toNumber(entry.total_compare);
    if (compare !== null) {
      bucket.totalCompare += compare;
      bucket.hasCompare = true;
    }
  });

  const deltas: CategoryDelta[] = Array.from(buckets.values()).map((bucket) => {
    const totalBase = bucket.hasBase ? round4(bucket.totalBase) : null;
    const totalCompare = bucket.hasCompare ? round4(bucket.totalCompare) : null;
    const delta = round4(bucket.delta);
    const denominator = totalBase ?? 0;
    let pct = 0;
    if (denominator === 0) {
      if ((totalCompare ?? 0) !== 0) {
        pct = Number.POSITIVE_INFINITY;
      }
    } else {
      pct = round4(delta / denominator);
    }
    return {
      key: bucket.key,
      label: bucket.label,
      delta,
      delta_pct: pct,
      total_base: totalBase,
      total_compare: totalCompare
    } satisfies CategoryDelta;
  });

  return deltas
    .sort((a, b) => {
      const magnitude = Math.abs(b.delta) - Math.abs(a.delta);
      if (magnitude !== 0) {
        return magnitude;
      }
      return a.key.localeCompare(b.key);
    });
}

export interface ActivityDelta {
  id: string;
  label: string;
  delta: number;
  delta_pct: number;
  total_base: number | null;
  total_compare: number | null;
}

function resolveActivityLabel(change: ScenarioActivityChange, catalog: Catalog): string {
  const activity = getActivityById(catalog, change.activity_id);
  const labelCandidate =
    typeof activity?.label === 'string' && activity.label.trim().length > 0
      ? activity.label
      : typeof activity?.name === 'string' && activity.name.trim().length > 0
        ? activity.name
        : change.activity_id;
  return labelCandidate;
}

export function listActivityDeltas(diff: ScenarioDiff, catalog: Catalog): ActivityDelta[] {
  const rows = [diff.changed, diff.added, diff.removed]
    .flat()
    .filter((entry): entry is ScenarioActivityChange => Boolean(entry && entry.activity_id));

  const deltas = rows.map((entry) => {
    const base = toNumber(entry.total_base);
    const compare = toNumber(entry.total_compare);
    const delta = toNumber(entry.delta) ?? round4((compare ?? 0) - (base ?? 0));
    const denominator = base ?? 0;
    let pct = 0;
    if (denominator === 0) {
      if ((compare ?? 0) !== 0) {
        pct = Number.POSITIVE_INFINITY;
      }
    } else {
      pct = round4(delta / denominator);
    }
    return {
      id: entry.activity_id,
      label: resolveActivityLabel(entry, catalog),
      delta: round4(delta),
      delta_pct: pct,
      total_base: base == null ? null : round4(base),
      total_compare: compare == null ? null : round4(compare)
    } satisfies ActivityDelta;
  });

  return deltas.sort((a, b) => {
    const magnitude = Math.abs(b.delta) - Math.abs(a.delta);
    if (magnitude !== 0) {
      return magnitude;
    }
    return a.label.localeCompare(b.label);
  });
}
