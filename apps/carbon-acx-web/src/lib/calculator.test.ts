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
  CATALOG_ACTIVITIES,
  CATALOG_DATASET,
  getAtlasMode,
  resolveAiScenario,
  resolveScenarioById,
  scenarioAnnualGrams,
} from '@/lib/calculator'

describe('calculator dataset', () => {
  it('loads only published activities with complete evidence', () => {
    expect(ACTIVITIES.length).toBeGreaterThan(0)
    expect(Object.keys(CATEGORY_INFO)).toHaveLength(5)
    expect(
      ACTIVITIES.every(
        (activity) =>
          activity.evidence.publicationStatus === 'published' &&
          activity.evidence.sourceIds.length > 0 &&
          activity.evidence.sourceCitations.length > 0 &&
          activity.evidence.sourceUrls.length === activity.evidence.sourceIds.length &&
          typeof activity.unitDefinition === 'string' &&
          typeof activity.notes === 'string',
      ),
    ).toBe(true)
  })

  it('forwards activity evidence with the calculated arithmetic', () => {
    const summary = calculateEmissions([{ activityId: 'TRAN.SCHOOLRUN.CAR.KM', quantity: 1000 }])

    expect(summary.totalEmissionsKg).toBe(180)
    expect(summary.results[0]).toMatchObject({
      emissionFactor: 180,
      evidence: {
        emissionFactorId: 'EF.CAR.KM',
        region: 'CA-ON',
        scopeBoundary: 'WTT+TTW',
        gwpHorizon: 'GWP100 (AR6)',
        vintageYear: 2023,
      },
    })
    expect(summary.results[0].evidence.sourceCitations[0]).toContain('Environment and Climate')
    expect(summary.results[0].evidence.sourceUrls[0]).toMatch(/^https:\/\//)
    expect(summary.results[0].evidence.sourceUrls).toHaveLength(summary.results[0].evidence.sourceIds.length)
    const activity = ACTIVITIES.find((candidate) => candidate.id === 'TRAN.SCHOOLRUN.CAR.KM')!
    expect(activity).toMatchObject({
      unitDefinition: '',
      notes: 'Passengers default to one when unspecified.',
    })
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

describe('catalogue data gaps', () => {
  it('keeps unavailable catalogue activities out of totals', () => {
    const unavailable = calculateEmissions([
      { activityId: 'FOOD.COFFEE.CUP.HOT', quantity: 1 },
    ])

    expect(unavailable.totalEmissions).toBe(0)
    expect(unavailable.skipped).toEqual([
      { activityId: 'FOOD.COFFEE.CUP.HOT', quantity: 1, reason: 'unavailable-activity' },
    ])
  })
  it('distinguishes a published zero factor from unavailable evidence', () => {
    const bike = ACTIVITIES.find((activity) => activity.id === 'TRAN.SCHOOLRUN.BIKE.KM')!
    const stream = CATALOG_ACTIVITIES.find((activity) => activity.id === 'stream')!

    expect(bike.emissionFactor).toBe(0)
    expect(bike.evidence.publicationStatus).toBe('published')
    expect(stream.emissionFactor).toBeNull()
    expect(stream.evidence.publicationStatus).toBe('unavailable')
  })
})

describe('comparison baselines', () => {
  it('sources the national Canadian average with a citation', () => {
    expect(BENCHMARKS.canadian_average).toBe(CANADIAN_AVERAGE)
    expect(CANADIAN_AVERAGE.scope).toBe('national')
    expect(CANADIAN_AVERAGE.annualGrams).toBeGreaterThan(0)
    expect(CANADIAN_AVERAGE.sourceId).toBeTruthy()
    expect(CANADIAN_AVERAGE.sourceCitation).toBeTruthy()
    expect(CANADIAN_AVERAGE.sourceUrl).toMatch(/^https:\/\//)
    expect(CANADIAN_AVERAGE.populationSourceUrl).toMatch(/^https:\/\//)
    expect(CANADIAN_AVERAGE.accountingBasis).toBe('territorial')
    expect(CANADIAN_AVERAGE.landUseChange).toBe('excluded')
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

describe('editorial public data helpers', () => {
  it('keeps the exact car arithmetic in grams', () => {
    expect(calculateEmissions([{ activityId: 'TRAN.SCHOOLRUN.CAR.KM', quantity: 1_000 }]).totalEmissions).toBe(180_000)
  })


  it('partitions the catalogue into personal, systems, and industrial modes', () => {
    expect(CATALOG_ACTIVITIES.filter((activity) => getAtlasMode(activity) === 'personal')).toHaveLength(21)
    expect(CATALOG_ACTIVITIES.filter((activity) => getAtlasMode(activity) === 'systems')).toHaveLength(47)
    expect(CATALOG_ACTIVITIES.filter((activity) => getAtlasMode(activity) === 'industrial')).toHaveLength(40)
  })
})

describe('ai scenario resolution', () => {
  const PUBLISHED_ID = 'SCN.GOOGLE.GEMINI.APPS.PROMPT.2025'
  const GOOGLE_ACTIVITY = 'AI.USAGE.GOOGLE.QUERY'
  const MISTRAL_PUBLISHED = 'SCN.MISTRAL.LECHAT.RESPONSE.2025'
  const ANTHROPIC_UNAVAILABLE = 'SCN.ANTHROPIC.CLAUDE3.UNAVAILABLE.2024'

  it('resolves an exact scenario id to its publication status', () => {
    const published = resolveScenarioById(PUBLISHED_ID)
    expect(published.status).toBe('published')
    if (published.status !== 'unavailable') {
      expect(published.scenario.scenarioId).toBe(PUBLISHED_ID)
      expect(published.scenario.functionalUnit).toBe('prompt')
    }
  })

  it('never falls back to a nearest match', () => {
    expect(resolveScenarioById('SCN.DOES.NOT.EXIST.1999')).toEqual({
      status: 'unavailable',
      reason: 'No matching scenario.',
    })
    expect(
      resolveAiScenario({ activityId: 'AI.USAGE.LLM.SCENARIO', modality: 'video' }),
    ).toEqual({
      status: 'unavailable',
      reason: 'No matching scenario.',
    })
  })

  it('rejects workload-incompatible keys instead of guessing', () => {
    // The shared LLM activity carries text scenarios only; a video query must not match.
    const mismatched = resolveAiScenario({
      activityId: 'AI.USAGE.LLM.SCENARIO',
      modality: 'video',
      functionalUnit: 'video_clip',
    })
    expect(mismatched.status).toBe('unavailable')

    const ambiguous = resolveAiScenario({
      activityId: 'AI.USAGE.LLM.SCENARIO',
      modality: 'text',
    })
    expect(ambiguous).toEqual({ status: 'unavailable', reason: 'Ambiguous scenario key.' })

    const exact = resolveAiScenario({
      activityId: 'AI.USAGE.LLM.SCENARIO',
      modality: 'text',
      functionalUnit: 'prompt',
      providerId: 'Google',
      modelId: 'Gemini Apps',
    })
    expect(exact.status).toBe('published')
    if (exact.status === 'published') {
      expect(exact.scenario.scenarioId).toBe('SCN.GOOGLE.GEMINI.APPS.PROMPT.2025')
    }
  })

  it('maps unavailable-status records to an explicit reason', () => {
    const resolution = resolveScenarioById(ANTHROPIC_UNAVAILABLE)
    expect(resolution.status).toBe('unavailable')
    if (resolution.status === 'unavailable') {
      expect(resolution.reason).toMatch(/not disclosed/i)
    }
  })

  it('multiplies published scenarios into annual grams and refuses invalid input', () => {
    const resolution = resolveScenarioById(MISTRAL_PUBLISHED)
    expect(resolution.status).toBe('published')
    if (resolution.status !== 'published') return
    const grams = scenarioAnnualGrams(resolution.scenario, 365)
    expect(grams).toBeCloseTo(365 * (resolution.scenario.carbonGPerUnit as number))
    expect(scenarioAnnualGrams(resolution.scenario, 0)).toBeNull()
    expect(scenarioAnnualGrams(resolution.scenario, Number.NaN)).toBeNull()
  })

  it('keeps estimates out of totals by construction', () => {
    const estimate = CATALOG_DATASET.aiScenarios.records.find((record) => record.publicationStatus === 'estimate')
    expect(estimate).toBeDefined()
    if (!estimate) return
    const resolution = resolveScenarioById(estimate.scenarioId)
    expect(resolution.status).toBe('estimate')
  })
})
