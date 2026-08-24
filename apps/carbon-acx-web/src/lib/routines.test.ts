import { describe, expect, it } from 'vitest'

import {
  calculateRoutineWorksheet,
  createActivityLine,
  createScenarioLine,
  decodeRoutineWorksheet,
  deriveRoutineLine,
  encodeRoutineWorksheet,
  getRoutineComparisonOptions,
} from '@/lib/routines'

const commuteValues = {
  oneWayKm: '8',
  travelDaysPerWeek: '5',
}

describe('routine derivations', () => {
  it('derives the worked commute and car footprint in passenger-kilometres', () => {
    const line = createActivityLine('TRAN.SCHOOLRUN.CAR.KM', commuteValues)
    const derivation = deriveRoutineLine(line)
    const summary = calculateRoutineWorksheet([line])

    expect(derivation.quantity).toBe(3840)
    expect(derivation.annualGrams).toBe(691200)
    expect(summary.results[0]).toMatchObject({
      quantity: 3840,
      unitLabel: 'passenger-kilometres',
      emissions: 691200,
      emissionsKg: 691.2,
    })
  })

  it('supports digital, meal, billing, operation, purchase, and replacement recipes', () => {
    const lines = [
      createActivityLine('MEDIA.STREAM.HD.HOUR', { hoursPerUseDay: '1.5', useDaysPerWeek: '4' }),
      createActivityLine('FOOD.MEAL.BEEF.SERVING', { mealsPerWeek: '2' }),
      createActivityLine('ENERGY.NATGAS.M3', { amountPerCycle: '2' }),
      createActivityLine('REFR.APPL.FRIDGE.OP.YEAR'),
      createActivityLine('CLOTHING.TSHIRT.COTTON', { purchasesPerYear: '3' }),
      createActivityLine('DEVICE.SMARTPHONE.UNIT', { replacementIntervalYears: '2' }),
    ]
    const derivations = lines.map(deriveRoutineLine)

    expect(derivations.map((derivation) => derivation.quantity)).toEqual([312, 104, 24, 1, 3, 0.5])
    expect(calculateRoutineWorksheet(lines).results).toHaveLength(6)
  })

  it('derives monthly AI events from the selected functional unit', () => {
    const line = createScenarioLine('SCN.GOOGLE.GEMINI.APPS.PROMPT.2025', {
      eventsPerUseDay: '12',
      useDaysPerMonth: '12',
    })
    const derivation = deriveRoutineLine(line)
    const summary = calculateRoutineWorksheet([line])

    expect(derivation.quantity).toBe(1728)
    expect(derivation.annualGrams).toBeCloseTo(51.84, 10)
    expect(summary.results[0]?.source).toBe('scenario')
    expect(summary.results[0]?.quantity).toBe(1728)
    expect(summary.results[0]?.unitLabel).toBe('prompts per year')
    expect(summary.results[0]?.category).toBe('digital')
    expect(summary.results[0]?.emissions).toBeCloseTo(51.84, 10)
  })

  it('keeps published zero factors valid', () => {
    const summary = calculateRoutineWorksheet([
      createActivityLine('TRAN.SCHOOLRUN.BIKE.KM', commuteValues),
    ])
    expect(summary.results[0]?.emissions).toBe(0)
    expect(summary.notices).toEqual([])
    expect(summary.totalEmissions).toBe(0)
  })
})

describe('routine validation and evidence states', () => {
  it('reports empty, zero, negative, and non-finite fields without a result', () => {
    for (const raw of ['', '0', '-1', 'Infinity', 'not-a-number']) {
      const line = createActivityLine('TRAN.SCHOOLRUN.CAR.KM', {
        oneWayKm: raw,
        travelDaysPerWeek: '5',
      })
      const derivation = deriveRoutineLine(line)
      expect(derivation.quantity).toBeNull()
      expect(derivation.errors.oneWayKm).toBeTruthy()
      expect(calculateRoutineWorksheet([line]).notices[0]?.status).toBe('incomplete')
    }
  })

  it('keeps estimate and unavailable AI scenarios visible as notices only', () => {
    const summary = calculateRoutineWorksheet([
      createScenarioLine('SCN.OPENAI.CHATGPT.PROMPT.2025', { eventsPerUseDay: '1', useDaysPerMonth: '1' }),
      createScenarioLine('SCN.ANTHROPIC.CLAUDE3.UNAVAILABLE.2024', { eventsPerUseDay: '1', useDaysPerMonth: '1' }),
    ])
    expect(summary.results).toEqual([])
    expect(summary.notices.map((notice) => notice.status)).toEqual(['estimate', 'unavailable'])
    expect(summary.totalEmissions).toBe(0)
  })

  it('rejects unknown activity and scenario identities', () => {
    expect(() => createActivityLine('ACT.UNKNOWN')).toThrow('Unknown calculator activity')
    expect(() => createScenarioLine('SCN.UNKNOWN')).toThrow('Unknown AI scenario')
  })
})

describe('routine worksheets and comparisons', () => {
  it('aggregates same-category activities and multiple published AI providers', () => {
    const lines = [
      createActivityLine('TRAN.SCHOOLRUN.CAR.KM', commuteValues),
      createActivityLine('TRAN.TTC.BUS.KM', commuteValues),
      createScenarioLine('SCN.GOOGLE.GEMINI.APPS.PROMPT.2025', { eventsPerUseDay: '1', useDaysPerMonth: '1' }),
      createScenarioLine('SCN.MISTRAL.LECHAT.RESPONSE.2025', { eventsPerUseDay: '2', useDaysPerMonth: '1' }),
    ]
    const summary = calculateRoutineWorksheet(lines)

    expect(summary.results).toHaveLength(4)
    expect(summary.byCategory.transport).toBeGreaterThan(0)
    expect(summary.byCategory.digital).toBeGreaterThan(0)
    expect(summary.totalEmissions).toBe(
      summary.results.reduce((total, result) => total + result.emissions, 0),
    )
  })

  it('only compares compatible routine identities', () => {
    const commute = createActivityLine('TRAN.SCHOOLRUN.CAR.KM', commuteValues)
    const meals = createActivityLine('FOOD.MEAL.BEEF.SERVING', { mealsPerWeek: '2' })
    const ai = createScenarioLine('SCN.GOOGLE.GEMINI.APPS.PROMPT.2025', {
      eventsPerUseDay: '1',
      useDaysPerMonth: '1',
    })

    expect(getRoutineComparisonOptions(commute).map((option) => option.id)).toEqual([
      'TRAN.SCHOOLRUN.BIKE.KM',
      'TRAN.TTC.SUBWAY.KM',
      'TRAN.TTC.BUS.KM',
    ])
    expect(getRoutineComparisonOptions(meals).map((option) => option.id)).toEqual([
      'FOOD.MEAL.CHICKEN.SERVING',
      'FOOD.MEAL.VEG.SERVING',
    ])
    expect(getRoutineComparisonOptions(ai).map((option) => option.id)).not.toContain(
      'SCN.MISTRAL.LECHAT.RESPONSE.2025',
    )
    expect(getRoutineComparisonOptions(createActivityLine('TRAN.FLIGHT.SHORTHAUL.PKM'))).toEqual([])
  })
})

describe('routine worksheet serialization', () => {
  it('round-trips version 2 committed lines', () => {
    const lines = [
      createActivityLine('TRAN.SCHOOLRUN.CAR.KM', { ...commuteValues }),
      createScenarioLine('SCN.GOOGLE.GEMINI.APPS.PROMPT.2025', {
        eventsPerUseDay: '12',
        useDaysPerMonth: '12',
      }),
    ]
    expect(decodeRoutineWorksheet(encodeRoutineWorksheet(lines))).toEqual(lines)
  })

  it('drops malformed lines independently while retaining valid lines', () => {
    const valid = createActivityLine('TRAN.SCHOOLRUN.CAR.KM', { ...commuteValues })
    const malformed = {
      ...valid,
      key: 'activity:ACT.UNKNOWN',
      activityId: 'ACT.UNKNOWN',
    }
    const mismatch = {
      ...valid,
      recipeKind: 'flight',
    }
    const encoded = Buffer.from(JSON.stringify({ v: 2, lines: [valid, malformed, mismatch] })).toString('base64url')

    expect(decodeRoutineWorksheet(encoded)).toEqual([valid])
  })

  it('decodes a complete shared commute snapshot for every commute mode', () => {
    const line = createActivityLine('TRAN.TTC.SUBWAY.KM', {
      oneWayKm: '8',
      travelDaysPerWeek: '5',
    })
    expect(decodeRoutineWorksheet(encodeRoutineWorksheet([line]))).toEqual([line])
  })
})
