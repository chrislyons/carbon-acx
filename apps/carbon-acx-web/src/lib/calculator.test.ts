import { describe, expect, it } from 'vitest'

import {
  ACTIVITIES,
  BENCHMARKS,
  CANADIAN_AVERAGE,
  CATEGORY_INFO,
  calculateEmissions,
  comparisonToBenchmark,
  getBenchmark,
  getBenchmarkOptions,
} from '@/lib/calculator'

describe('calculator dataset', () => {
  it('loads generated activities with provenance-backed sources', () => {
    expect(ACTIVITIES.length).toBeGreaterThan(0)
    expect(Object.keys(CATEGORY_INFO)).toHaveLength(5)
    expect(ACTIVITIES.every((activity) => activity.sourceIds.length > 0)).toBe(true)
  })

  it('calculates emissions from canonical activity ids', () => {
    const summary = calculateEmissions([
      { activityId: 'TRAN.SCHOOLRUN.CAR.KM', quantity: 10 },
      { activityId: 'FOOD.MEAL.BEEF.SERVING', quantity: 2 },
    ])

    expect(summary.totalEmissions).toBe(19800)
    expect(summary.byCategory.transport).toBe(1800)
    expect(summary.byCategory.food).toBe(18000)
    expect(summary.skipped).toHaveLength(0)
  })
})

describe('comparison baselines', () => {
  it('sources the national Canadian average with a citation', () => {
    expect(BENCHMARKS.canadian_average).toBe(CANADIAN_AVERAGE)
    expect(CANADIAN_AVERAGE.scope).toBe('national')
    expect(CANADIAN_AVERAGE.annualGrams).toBeGreaterThan(0)
    expect(CANADIAN_AVERAGE.sourceId).toBeTruthy()
    expect(CANADIAN_AVERAGE.sourceCitation).toBeTruthy()
  })

  it('exposes national + provincial baselines, national first then ascending', () => {
    const options = getBenchmarkOptions()
    expect(options.length).toBeGreaterThanOrEqual(6)
    expect(options[0].scope).toBe('national')

    const provinces = options.filter((o) => o.scope === 'province')
    expect(provinces.length).toBeGreaterThanOrEqual(5)
    // Provinces sorted ascending by per-capita.
    for (let i = 1; i < provinces.length; i++) {
      expect(provinces[i].perCapitaTonnes).toBeGreaterThanOrEqual(
        provinces[i - 1].perCapitaTonnes,
      )
    }
  })

  it('every provincial baseline carries emissions + population provenance', () => {
    for (const option of getBenchmarkOptions().filter((o) => o.scope === 'province')) {
      expect(option.sourceCitation).toBeTruthy()
      expect(option.populationCitation).toBeTruthy()
      expect(option.totalMt).toBeGreaterThan(0)
      expect(option.populationMillions).toBeGreaterThan(0)
      // Per-capita ties out to the derivation.
      const derived = (option.totalMt as number) / (option.populationMillions as number)
      expect(derived).toBeCloseTo(option.perCapitaTonnes, 0)
    }
  })

  it('comparisonToBenchmark scales with the chosen baseline', () => {
    const summary = calculateEmissions([{ activityId: 'FOOD.MEAL.BEEF.SERVING', quantity: 2 }])
    const quebec = getBenchmark('quebec_average')!
    const alberta = getBenchmark('alberta_average')!
    // Same footprint is a larger share of the lower (Quebec) baseline.
    expect(comparisonToBenchmark(summary.totalEmissions, quebec)).toBeGreaterThan(
      comparisonToBenchmark(summary.totalEmissions, alberta),
    )
    const expected = (summary.totalEmissions / quebec.annualGrams) * 100
    expect(comparisonToBenchmark(summary.totalEmissions, quebec)).toBeCloseTo(expected, 10)
  })
})

describe('invalid inputs are surfaced, never silently dropped', () => {
  it('records unknown activities as skipped', () => {
    const summary = calculateEmissions([{ activityId: 'NOPE.NOT.REAL', quantity: 5 }])
    expect(summary.totalEmissions).toBe(0)
    expect(summary.skipped).toEqual([
      { activityId: 'NOPE.NOT.REAL', quantity: 5, reason: 'unknown-activity' },
    ])
  })

  it('records non-finite quantities as skipped without poisoning the total', () => {
    const summary = calculateEmissions([
      { activityId: 'FOOD.MEAL.BEEF.SERVING', quantity: Number.NaN },
      { activityId: 'FOOD.MEAL.BEEF.SERVING', quantity: 2 },
    ])
    expect(Number.isFinite(summary.totalEmissions)).toBe(true)
    expect(summary.totalEmissions).toBe(18000)
    expect(summary.skipped).toHaveLength(1)
    expect(summary.skipped[0].reason).toBe('non-finite-quantity')
  })

  it('records non-positive quantities as skipped', () => {
    const summary = calculateEmissions([{ activityId: 'FOOD.MEAL.BEEF.SERVING', quantity: 0 }])
    expect(summary.skipped[0].reason).toBe('non-positive-quantity')
  })
})
