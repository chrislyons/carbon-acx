import { describe, expect, it } from 'vitest'

import { ACTIVITIES, CATEGORY_INFO, calculateEmissions } from '@/lib/calculator'

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
  })
})
