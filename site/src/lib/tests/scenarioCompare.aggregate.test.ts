import { describe, expect, it } from 'vitest';

import type { Catalog } from '../../lib/catalog';
import {
  aggregateByCategory,
  listActivityDeltas,
  type ScenarioDiff
} from '../scenarioCompare';

const catalog: Catalog = {
  activities: [
    {
      activity_id: 'ACT.ALPHA.ONE',
      label: 'Alpha line retrofit',
      category: 'alpha_ops',
      layer_id: 'layer_main'
    },
    {
      activity_id: 'ACT.BETA.TWO',
      label: 'Beta workstation swap',
      category: 'beta_ops',
      layer_id: 'layer_main'
    },
    {
      activity_id: 'ACT.ALPHA.THREE',
      label: 'Alpha pilot program',
      category: 'alpha_ops',
      layer_id: 'layer_remote'
    },
    {
      activity_id: 'ACT.GAMMA.FOUR',
      label: 'Gamma furnace closure',
      category: 'gamma_ops',
      layer_id: 'layer_remote'
    },
    {
      activity_id: 'ACT.GAMMA.FIVE',
      label: 'Gamma service scope',
      category: 'gamma_ops',
      layer_id: 'layer_remote'
    }
  ],
  profiles: []
};

const diff: ScenarioDiff = {
  changed: [
    {
      activity_id: 'ACT.ALPHA.ONE',
      delta: 4.5678,
      total_base: 20.1234,
      total_compare: 24.6912
    },
    {
      activity_id: 'ACT.BETA.TWO',
      delta: -5.3,
      total_base: 15.5,
      total_compare: 10.2
    },
    {
      activity_id: 'ACT.GAMMA.FIVE',
      delta: 1.2,
      total_base: 8.25,
      total_compare: 9.45
    }
  ],
  added: [
    {
      activity_id: 'ACT.ALPHA.THREE',
      delta: 3.3333,
      total_base: null,
      total_compare: 3.3333
    }
  ],
  removed: [
    {
      activity_id: 'ACT.GAMMA.FOUR',
      delta: -5.75,
      total_base: 5.75,
      total_compare: null
    }
  ]
};

describe('aggregateByCategory', () => {
  it('aggregates activity deltas by category with deterministic ordering and rounding', () => {
    const result = aggregateByCategory(diff, 'activity.category', catalog);
    expect(result.map((row) => row.key)).toEqual(['alpha_ops', 'beta_ops', 'gamma_ops']);
    expect(result.map((row) => row.label)).toEqual(['Alpha Ops', 'Beta Ops', 'Gamma Ops']);

    expect(result[0]).toMatchObject({
      delta: 7.9011,
      delta_pct: 0.3926,
      total_base: 20.1234,
      total_compare: 28.0245
    });
    expect(result[1]).toMatchObject({
      delta: -5.3,
      delta_pct: -0.3419,
      total_base: 15.5,
      total_compare: 10.2
    });
    expect(result[2]).toMatchObject({
      delta: -4.55,
      delta_pct: -0.325,
      total_base: 14,
      total_compare: 9.45
    });

    const aggregateTotal = result.reduce((sum, row) => sum + row.delta, 0);
    const rowTotal = [diff.changed, diff.added, diff.removed]
      .flat()
      .reduce((sum, entry) => sum + (entry?.delta ?? 0), 0);
    expect(Math.abs(aggregateTotal - rowTotal)).toBeLessThan(1e-6);
  });

  it('uses layer grouping when requested', () => {
    const result = aggregateByCategory(diff, 'layer_id', catalog);
    expect(result.map((row) => row.key)).toEqual(['layer_remote', 'layer_main']);
    expect(result.map((row) => row.label)).toEqual(['Layer Remote', 'Layer Main']);
    expect(result[0].delta).toBeCloseTo(-1.2167, 4);
    expect(result[1].delta).toBeCloseTo(-0.7322, 4);
  });
});

describe('listActivityDeltas', () => {
  it('orders activities by absolute delta and includes rounded totals', () => {
    const result = listActivityDeltas(diff, catalog);
    expect(result.map((row) => row.id)).toEqual([
      'ACT.GAMMA.FOUR',
      'ACT.BETA.TWO',
      'ACT.ALPHA.ONE',
      'ACT.ALPHA.THREE',
      'ACT.GAMMA.FIVE'
    ]);
    expect(result[0]).toMatchObject({
      label: 'Gamma furnace closure',
      delta: -5.75,
      total_base: 5.75,
      total_compare: null
    });
    expect(result[2]).toMatchObject({
      label: 'Alpha line retrofit',
      delta: 4.5678,
      total_base: 20.1234,
      total_compare: 24.6912
    });
    expect(result[3]).toMatchObject({
      label: 'Alpha pilot program',
      delta: 3.3333,
      total_base: null,
      total_compare: 3.3333,
      delta_pct: Number.POSITIVE_INFINITY
    });
  });
});
