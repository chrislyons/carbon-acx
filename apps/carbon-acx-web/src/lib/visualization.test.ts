import { describe, expect, it } from 'vitest'

import {
  CATALOG_ACTIVITIES,
  calculateEmissions,
  getAtlasMode,
  type ActivityEvidence,
  type CalculatorSummary,
} from '@/lib/calculator'
import {
  buildActivityImpactData,
  buildAtlasCoverageGroups,
  buildImpactFlowData,
  humanizeCategory,
} from '@/lib/visualization'

function summaryFor(...inputs: { activityId: string; quantity: number }[]): CalculatorSummary {
  return calculateEmissions(inputs)
}

function withUncertainty(
  summary: CalculatorSummary,
  lowGPerUnit: number | null,
  highGPerUnit: number | null,
): CalculatorSummary {
  return {
    ...summary,
    results: summary.results.map((result) => ({
      ...result,
      evidence: {
        ...result.evidence,
        uncertainty: { lowGPerUnit, highGPerUnit },
      } satisfies ActivityEvidence,
    })),
  }
}

describe('visualization adapters', () => {
  it('derives sorted impact rows and valid beef bounds', () => {
    const data = buildActivityImpactData(summaryFor(
      { activityId: 'TRAN.SCHOOLRUN.CAR.KM', quantity: 1_000 },
      { activityId: 'FOOD.MEAL.BEEF.SERVING', quantity: 10 },
    ))

    expect(data.map((item) => item.activityId)).toEqual([
      'TRAN.SCHOOLRUN.CAR.KM',
      'FOOD.MEAL.BEEF.SERVING',
    ])
    expect(data[1]).toMatchObject({
      emissions: 90_000,
      lowEmissions: 54_000,
      highEmissions: 123_000,
      uncertainty: 'bounded',
    })
    expect(data[0]).toMatchObject({ emissions: 180_000, uncertainty: 'not-quantified' })
  })

  it.each([
    ['missing low bound', null, 12_300],
    ['missing high bound', 5_400, null],
    ['reversed bounds', 12_300, 5_400],
    ['non-finite bound', Number.NaN, 12_300],
    ['negative bound', -1, 12_300],
  ])('rejects %s without coercing bounds', (_label, low, high) => {
    const summary = withUncertainty(
      summaryFor({ activityId: 'FOOD.MEAL.BEEF.SERVING', quantity: 10 }),
      low,
      high,
    )
    expect(buildActivityImpactData(summary)[0]).toMatchObject({
      lowEmissions: null,
      highEmissions: null,
      uncertainty: 'not-quantified',
    })
  })

  it('keeps a published bicycle zero in ranked data but out of the flow', () => {
    const summary = summaryFor({ activityId: 'TRAN.SCHOOLRUN.BIKE.KM', quantity: 1 })
    const ranked = buildActivityImpactData(summary)
    const flow = buildImpactFlowData(summary)

    expect(ranked).toHaveLength(1)
    expect(ranked[0]).toMatchObject({ emissions: 0, activityId: 'TRAN.SCHOOLRUN.BIKE.KM' })
    expect(flow.zeroResults).toEqual(ranked)
    expect(flow.nodes.map((node) => node.id)).toEqual(['total'])
    expect(flow.links).toEqual([])
  })

  it('rejects unavailable catalogue records before visualization adapters run', () => {
    const unavailable = CATALOG_ACTIVITIES.find(
      (record) => record.evidence.publicationStatus === 'unavailable',
    )!
    const summary = summaryFor({ activityId: unavailable.id, quantity: 1 })

    expect(summary.results).toEqual([])
    expect(summary.skipped).toEqual([
      { activityId: unavailable.id, quantity: 1, reason: 'unavailable-activity' },
    ])
    expect(buildActivityImpactData(summary)).toEqual([])
  })

  it('builds positive-only category flow totals in deterministic order', () => {
    const summary = summaryFor(
      { activityId: 'TRAN.SCHOOLRUN.CAR.KM', quantity: 1_000 },
      { activityId: 'FOOD.MEAL.BEEF.SERVING', quantity: 10 },
    )
    const flow = buildImpactFlowData(summary)

    expect(flow.nodes.map((node) => node.id)).toEqual([
      'activity:TRAN.SCHOOLRUN.CAR.KM',
      'activity:FOOD.MEAL.BEEF.SERVING',
      'category:transport',
      'category:food',
      'total',
    ])
    expect(flow.links).toEqual([
      {
        id: 'activity:TRAN.SCHOOLRUN.CAR.KM->category:transport',
        source: 'activity:TRAN.SCHOOLRUN.CAR.KM',
        target: 'category:transport',
        value: 180_000,
        category: 'transport',
      },
      {
        id: 'activity:FOOD.MEAL.BEEF.SERVING->category:food',
        source: 'activity:FOOD.MEAL.BEEF.SERVING',
        target: 'category:food',
        value: 90_000,
        category: 'food',
      },
      {
        id: 'category:transport->total',
        source: 'category:transport',
        target: 'total',
        value: 180_000,
        category: 'transport',
      },
      {
        id: 'category:food->total',
        source: 'category:food',
        target: 'total',
        value: 90_000,
        category: 'food',
      },
    ])
    const tied = buildActivityImpactData(summaryFor(
      { activityId: 'TRAN.SCHOOLRUN.CAR.KM', quantity: 500 },
      { activityId: 'FOOD.MEAL.CHICKEN.SERVING', quantity: 100 },
    ))
    expect(tied.map((item) => item.activityName)).toEqual(['Meal with chicken', 'School run by car'])
  })

  it('humanizes categories and counts Atlas publication states', () => {
    expect(humanizeCategory('industrial_light')).toBe('Industrial Light')

    const systems = CATALOG_ACTIVITIES.filter((record) => getAtlasMode(record) === 'systems')
    const groups = buildAtlasCoverageGroups(systems)
    const publishedCount = groups.reduce((sum, group) => sum + group.publishedCount, 0)
    const unavailableCount = groups.reduce((sum, group) => sum + group.unavailableCount, 0)

    expect(systems).toHaveLength(44)
    expect(publishedCount).toBe(34)
    expect(unavailableCount).toBe(10)
    expect(groups).toEqual([...groups].sort((a, b) => a.label.localeCompare(b.label)))
    for (const group of groups) {
      expect(group.records).toEqual(
        [...group.records].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
      )
    }
  })
})
