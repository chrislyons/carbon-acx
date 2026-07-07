import { describe, expect, it } from 'vitest'

import {
  ACTIVITIES,
  BENCHMARKS,
  CANADIAN_AVERAGE,
  CATEGORY_INFO,
  calculateEmissions,
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

describe('comparison baseline', () => {
  it('sources the Canadian average from the dataset with a citation', () => {
    expect(BENCHMARKS.canadian_average).toBe(CANADIAN_AVERAGE)
    expect(CANADIAN_AVERAGE.annualGrams).toBeGreaterThan(0)
    expect(CANADIAN_AVERAGE.sourceId).toBeTruthy()
    expect(CANADIAN_AVERAGE.sourceCitation).toBeTruthy()
  })

  it('reports comparison as a share of the sourced baseline', () => {
    const summary = calculateEmissions([{ activityId: 'FOOD.MEAL.BEEF.SERVING', quantity: 2 }])
    const expected = (summary.totalEmissions / CANADIAN_AVERAGE.annualGrams) * 100
    expect(summary.comparisonToAverage).toBeCloseTo(expected, 10)
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
