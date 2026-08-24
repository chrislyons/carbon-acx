import {
  ACTIVITIES,
  CATEGORY_INFO,
  CATALOG_DATASET,
  calculateEmissions,
  getActivityById,
  resolveScenarioById,
  scenarioAnnualGrams,
  type ActivityCategory,
  type AiScenario,
} from '@/lib/calculator'
export type RoutineKind =
  | 'commute'
  | 'flight'
  | 'weekly-hours'
  | 'weekly-servings'
  | 'billing-volume'
  | 'annual-operation'
  | 'annual-purchases'
  | 'replacement'
  | 'ai-monthly-events'

export type RoutineFieldId =
  | 'oneWayKm'
  | 'legsPerDay'
  | 'travelDaysPerWeek'
  | 'weeksPerYear'
  | 'legsPerTrip'
  | 'tripsPerYear'
  | 'hoursPerUseDay'
  | 'useDaysPerWeek'
  | 'servingsPerMeal'
  | 'mealsPerWeek'
  | 'amountPerCycle'
  | 'cyclesPerYear'
  | 'unitsInService'
  | 'itemsPerPurchase'
  | 'purchasesPerYear'
  | 'unitsInUse'
  | 'replacementIntervalYears'
  | 'eventsPerUseDay'
  | 'useDaysPerMonth'
  | 'monthsPerYear'

export type RoutineValues = Partial<Record<RoutineFieldId, string>>

export type RoutineLine =
  | {
      key: string
      source: 'activity'
      activityId: string
      recipeKind: Exclude<RoutineKind, 'ai-monthly-events'>
      values: RoutineValues
    }
  | {
      key: string
      source: 'scenario'
      scenarioId: string
      recipeKind: 'ai-monthly-events'
      values: RoutineValues
    }

export interface RoutineFieldDefinition {
  id: RoutineFieldId
  label: string
  shortLabel: string
  unit: string
  defaultValue: string
}

export interface RoutineRecipe {
  kind: RoutineKind
  family: ActivityCategory
  fields: readonly RoutineFieldDefinition[]
  derive(values: RoutineValues): number | null
}

export interface RoutineEquationTerm {
  id: string
  label: string
  value: number
  unit: string
  origin: 'user' | 'default' | 'derived' | 'factor' | 'result'
}

export interface RoutineDerivation {
  quantity: number | null
  annualGrams: number | null
  terms: RoutineEquationTerm[]
  errors: Partial<Record<RoutineFieldId, string>>
}

export interface WorksheetResult {
  lineKey: string
  source: 'activity' | 'scenario'
  sourceId: string
  name: string
  category: ActivityCategory
  quantity: number
  unitLabel: string
  emissionFactor: number
  emissions: number
  emissionsKg: number
  lowEmissions: number | null
  highEmissions: number | null
}

export interface WorksheetNotice {
  lineKey: string
  status: 'incomplete' | 'estimate' | 'unavailable'
  message: string
}

export interface WorksheetSummary {
  results: WorksheetResult[]
  notices: WorksheetNotice[]
  totalEmissions: number
  totalEmissionsKg: number
  totalEmissionsTonnes: number
  byCategory: Record<ActivityCategory, number>
}

export interface RoutineComparisonOption {
  source: 'activity' | 'scenario'
  id: string
  name: string
}

export const ROUTINE_STORAGE_KEY = 'carbon-acx-routine-workbook-v2'

const SCENARIOS = CATALOG_DATASET.aiScenarios.records
const SCENARIO_BY_ID = new Map(SCENARIOS.map((scenario) => [scenario.scenarioId, scenario]))

const field = (
  id: RoutineFieldId,
  label: string,
  shortLabel: string,
  unit: string,
  defaultValue = '',
): RoutineFieldDefinition => ({ id, label, shortLabel, unit, defaultValue })

const COMMUTE_FIELDS = [
  field('oneWayKm', 'One-way distance', 'distance', 'km'),
  field('legsPerDay', 'Legs per travel day', 'legs/day', 'legs/day', '2'),
  field('travelDaysPerWeek', 'Travel days per week', 'days/week', 'days/week'),
  field('weeksPerYear', 'Weeks per year', 'weeks/year', 'weeks/year', '48'),
] as const

const FLIGHT_FIELDS = [
  field('oneWayKm', 'One-way distance', 'distance', 'km'),
  field('legsPerTrip', 'Legs per trip', 'legs/trip', 'legs/trip', '2'),
  field('tripsPerYear', 'Trips per year', 'trips/year', 'trips/year'),
] as const

const WEEKLY_HOURS_FIELDS = [
  field('hoursPerUseDay', 'Hours per use day', 'hours/day', 'hours/day'),
  field('useDaysPerWeek', 'Use days per week', 'days/week', 'days/week'),
  field('weeksPerYear', 'Weeks per year', 'weeks/year', 'weeks/year', '52'),
] as const

const WEEKLY_SERVINGS_FIELDS = [
  field('servingsPerMeal', 'Servings per meal', 'servings/meal', 'servings/meal', '1'),
  field('mealsPerWeek', 'Meals per week', 'meals/week', 'meals/week'),
  field('weeksPerYear', 'Weeks per year', 'weeks/year', 'weeks/year', '52'),
] as const

const BILLING_VOLUME_FIELDS = [
  field('amountPerCycle', 'Amount per billing cycle', 'amount/cycle', 'm³/cycle'),
  field('cyclesPerYear', 'Cycles per year', 'cycles/year', 'cycles/year', '12'),
] as const

const ANNUAL_OPERATION_FIELDS = [
  field('unitsInService', 'Units in service', 'units', 'units', '1'),
] as const

const ANNUAL_PURCHASE_FIELDS = [
  field('itemsPerPurchase', 'Items per purchase', 'items/purchase', 'items/purchase', '1'),
  field('purchasesPerYear', 'Purchases per year', 'purchases/year', 'purchases/year'),
] as const

const REPLACEMENT_FIELDS = [
  field('unitsInUse', 'Units in use', 'units', 'units', '1'),
  field('replacementIntervalYears', 'Replacement interval', 'years/unit', 'years/unit'),
] as const

const AI_MONTHLY_EVENT_FIELDS = [
  field('eventsPerUseDay', 'Events per use day', 'events/day', 'events/day'),
  field('useDaysPerMonth', 'Use days per month', 'days/month', 'days/month'),
  field('monthsPerYear', 'Months per year', 'months/year', 'months/year', '12'),
] as const

function positiveNumber(values: RoutineValues, id: RoutineFieldId): number | null {
  const raw = values[id]
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

function productDerivation(fields: readonly RoutineFieldDefinition[], values: RoutineValues): number | null {
  const factors = fields.map((definition) => positiveNumber(values, definition.id))
  const numbers = factors.filter((value): value is number => value !== null)
  if (numbers.length !== factors.length) return null
  const quantity = numbers.reduce((total, value) => total * value, 1)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null
}

function divisionDerivation(values: RoutineValues): number | null {
  const units = positiveNumber(values, 'unitsInUse')
  const interval = positiveNumber(values, 'replacementIntervalYears')
  if (units === null || interval === null) return null
  const quantity = units / interval
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null
}

function recipe(
  kind: RoutineKind,
  family: ActivityCategory,
  fields: readonly RoutineFieldDefinition[],
  derive: (values: RoutineValues) => number | null,
): RoutineRecipe {
  return { kind, family, fields, derive }
}

const COMMUTE_RECIPE = recipe('commute', 'transport', COMMUTE_FIELDS, (values) =>
  productDerivation(COMMUTE_FIELDS, values),
)
const FLIGHT_RECIPE = recipe('flight', 'transport', FLIGHT_FIELDS, (values) =>
  productDerivation(FLIGHT_FIELDS, values),
)
const WEEKLY_HOURS_RECIPE = recipe('weekly-hours', 'digital', WEEKLY_HOURS_FIELDS, (values) =>
  productDerivation(WEEKLY_HOURS_FIELDS, values),
)
const WEEKLY_SERVINGS_RECIPE = recipe('weekly-servings', 'food', WEEKLY_SERVINGS_FIELDS, (values) =>
  productDerivation(WEEKLY_SERVINGS_FIELDS, values),
)
const BILLING_VOLUME_RECIPE = recipe('billing-volume', 'home', BILLING_VOLUME_FIELDS, (values) =>
  productDerivation(BILLING_VOLUME_FIELDS, values),
)
const ANNUAL_OPERATION_RECIPE = recipe(
  'annual-operation',
  'home',
  ANNUAL_OPERATION_FIELDS,
  (values) => positiveNumber(values, 'unitsInService'),
)
const ANNUAL_PURCHASE_RECIPE = recipe('annual-purchases', 'shopping', ANNUAL_PURCHASE_FIELDS, (values) =>
  productDerivation(ANNUAL_PURCHASE_FIELDS, values),
)
const REPLACEMENT_RECIPE = recipe('replacement', 'shopping', REPLACEMENT_FIELDS, divisionDerivation)
const AI_MONTHLY_EVENTS_RECIPE = recipe('ai-monthly-events', 'digital', AI_MONTHLY_EVENT_FIELDS, (values) =>
  productDerivation(AI_MONTHLY_EVENT_FIELDS, values),
)

const ACTIVITY_RECIPE_BY_ID: Record<string, RoutineRecipe> = {
  'TRAN.SCHOOLRUN.CAR.KM': COMMUTE_RECIPE,
  'TRAN.SCHOOLRUN.BIKE.KM': COMMUTE_RECIPE,
  'TRAN.TTC.SUBWAY.KM': COMMUTE_RECIPE,
  'TRAN.TTC.BUS.KM': COMMUTE_RECIPE,
  'TRAN.FLIGHT.SHORTHAUL.PKM': FLIGHT_RECIPE,
  'TRAN.FLIGHT.LONGHAUL.PKM': FLIGHT_RECIPE,
  'MEDIA.STREAM.HD.HOUR': WEEKLY_HOURS_RECIPE,
  'MEDIA.STREAM.UHD.HOUR': WEEKLY_HOURS_RECIPE,
  'SOCIAL.INSTAGRAM.HOUR': WEEKLY_HOURS_RECIPE,
  'MUSIC.STREAM.STANDARD.HOUR': WEEKLY_HOURS_RECIPE,
  'FOOD.MEAL.BEEF.SERVING': WEEKLY_SERVINGS_RECIPE,
  'FOOD.MEAL.CHICKEN.SERVING': WEEKLY_SERVINGS_RECIPE,
  'FOOD.MEAL.VEG.SERVING': WEEKLY_SERVINGS_RECIPE,
  'ENERGY.NATGAS.M3': BILLING_VOLUME_RECIPE,
  'MUNI.WATER.POTABLE.M3': BILLING_VOLUME_RECIPE,
  'REFR.APPL.FRIDGE.OP.YEAR': ANNUAL_OPERATION_RECIPE,
  'REFR.HVAC.AC.OP.YEAR': ANNUAL_OPERATION_RECIPE,
  'CLOTHING.TSHIRT.COTTON': ANNUAL_PURCHASE_RECIPE,
  'CLOTHING.JEANS.DENIM': ANNUAL_PURCHASE_RECIPE,
  'DEVICE.SMARTPHONE.UNIT': REPLACEMENT_RECIPE,
  'DEVICE.LAPTOP.UNIT': REPLACEMENT_RECIPE,
}

const COMPARISON_GROUPS: Record<string, string> = {
  'TRAN.SCHOOLRUN.CAR.KM': 'commute',
  'TRAN.SCHOOLRUN.BIKE.KM': 'commute',
  'TRAN.TTC.SUBWAY.KM': 'commute',
  'TRAN.TTC.BUS.KM': 'commute',
  'FOOD.MEAL.BEEF.SERVING': 'meal',
  'FOOD.MEAL.CHICKEN.SERVING': 'meal',
  'FOOD.MEAL.VEG.SERVING': 'meal',
  'MEDIA.STREAM.HD.HOUR': 'streaming',
  'MEDIA.STREAM.UHD.HOUR': 'streaming',
}

function getActivityRecipe(activityId: string): RoutineRecipe | undefined {
  return ACTIVITY_RECIPE_BY_ID[activityId]
}


export function getRoutineRecipe(line: RoutineLine): RoutineRecipe {
  if (line.source === 'activity') {
    const resolved = getActivityRecipe(line.activityId)
    if (!resolved || resolved.kind !== line.recipeKind) {
      throw new Error(`No ${line.recipeKind} recipe is compatible with ${line.activityId}.`)
    }
    return resolved
  }
  if (!SCENARIO_BY_ID.has(line.scenarioId) || line.recipeKind !== 'ai-monthly-events') {
    throw new Error(`No AI routine recipe is compatible with ${line.scenarioId}.`)
  }
  return AI_MONTHLY_EVENTS_RECIPE
}

function defaultValues(recipeDefinition: RoutineRecipe, overrides?: RoutineValues): RoutineValues {
  const values: RoutineValues = {}
  for (const definition of recipeDefinition.fields) {
    const override = overrides?.[definition.id]
    values[definition.id] = typeof override === 'string' ? override : definition.defaultValue
  }
  return values
}

export function createActivityLine(activityId: string, overrides?: RoutineValues): RoutineLine {
  const activity = getActivityById(activityId)
  const recipeDefinition = getActivityRecipe(activityId)
  if (!activity || !recipeDefinition) throw new Error(`Unknown calculator activity: ${activityId}`)
  return {
    key: `activity:${activity.id}`,
    source: 'activity',
    activityId: activity.id,
    recipeKind: recipeDefinition.kind as Exclude<RoutineKind, 'ai-monthly-events'>,
    values: defaultValues(recipeDefinition, overrides),
  }
}

export function createScenarioLine(scenarioId: string, overrides?: RoutineValues): RoutineLine {
  const scenario = SCENARIO_BY_ID.get(scenarioId)
  if (!scenario) throw new Error(`Unknown AI scenario: ${scenarioId}`)
  return {
    key: `scenario:${scenario.scenarioId}`,
    source: 'scenario',
    scenarioId: scenario.scenarioId,
    recipeKind: 'ai-monthly-events',
    values: defaultValues(AI_MONTHLY_EVENTS_RECIPE, overrides),
  }
}
function valueError(definition: RoutineFieldDefinition, raw: string | undefined): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return `${definition.label} is required.`
  const value = Number(raw)
  if (!Number.isFinite(value)) return `${definition.label} must be a finite number.`
  if (value <= 0) return `${definition.label} must be greater than zero.`
  return null
}

function termsForLine(recipeDefinition: RoutineRecipe, values: RoutineValues): {
  terms: RoutineEquationTerm[]
  errors: Partial<Record<RoutineFieldId, string>>
} {
  const terms: RoutineEquationTerm[] = []
  const errors: Partial<Record<RoutineFieldId, string>> = {}
  for (const definition of recipeDefinition.fields) {
    const raw = values[definition.id]
    const error = valueError(definition, raw)
    if (error) {
      errors[definition.id] = error
      continue
    }
    const value = Number(raw)
    terms.push({
      id: definition.id,
      label: definition.label,
      value,
      unit: definition.unit,
      origin: raw === definition.defaultValue ? 'default' : 'user',
    })
  }
  return { terms, errors }
}

export function deriveRoutineLine(line: RoutineLine): RoutineDerivation {
  const recipeDefinition = getRoutineRecipe(line)
  const { terms, errors } = termsForLine(recipeDefinition, line.values)
  const quantity = Object.keys(errors).length === 0 ? recipeDefinition.derive(line.values) : null
  if (quantity === null) {
    if (Object.keys(errors).length === 0) {
      const firstField = recipeDefinition.fields[0]
      if (firstField) errors[firstField.id] = 'This combination does not produce a finite annual quantity.'
    }
    return { quantity: null, annualGrams: null, terms, errors }
  }

  terms.push({ id: 'annualQuantity', label: 'Annual quantity', value: quantity, unit: 'per year', origin: 'derived' })
  let annualGrams: number | null = null
  if (line.source === 'activity') {
    const activity = getActivityById(line.activityId)
    if (activity?.evidence.publicationStatus === 'published') {
      annualGrams = quantity * activity.emissionFactor
      terms.push({
        id: 'emissionFactor',
        label: 'Published factor',
        value: activity.emissionFactor,
        unit: `g CO₂e / ${activity.unitLabel}`,
        origin: 'factor',
      })
    }
  } else {
    const resolution = resolveScenarioById(line.scenarioId)
    if (resolution.status === 'published' && resolution.scenario.carbonGPerUnit !== null) {
      annualGrams = scenarioAnnualGrams(resolution.scenario, quantity)
      terms.push({
        id: 'emissionFactor',
        label: 'Published factor',
        value: resolution.scenario.carbonGPerUnit,
        unit: `g CO₂e / ${getScenarioUnitLabel(resolution.scenario).replace(/ per year$/, '')}`,
        origin: 'factor',
      })
    }
  }
  if (annualGrams !== null && Number.isFinite(annualGrams)) {
    terms.push({ id: 'annualEmissions', label: 'Annual footprint', value: annualGrams, unit: 'g CO₂e/year', origin: 'result' })
  } else {
    annualGrams = null
  }
  return { quantity, annualGrams, terms, errors }
}

function uncertaintyBounds(
  quantity: number,
  emissionFactor: number,
  lowGPerUnit: number | null,
  highGPerUnit: number | null,
): { lowEmissions: number; highEmissions: number } | null {
  if (
    lowGPerUnit === null
    || highGPerUnit === null
    || !Number.isFinite(lowGPerUnit)
    || !Number.isFinite(highGPerUnit)
    || lowGPerUnit < 0
    || highGPerUnit < 0
    || lowGPerUnit > emissionFactor
    || emissionFactor > highGPerUnit
  ) {
    return null
  }
  const lowEmissions = quantity * lowGPerUnit
  const highEmissions = quantity * highGPerUnit
  return Number.isFinite(lowEmissions) && Number.isFinite(highEmissions)
    ? { lowEmissions, highEmissions }
    : null
}

function scenarioNumber(value: number | string | null): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function scenarioUnitLabel(functionalUnit: string): string {
  switch (functionalUnit) {
    case 'prompt': return 'prompts'
    case 'response': return 'responses'
    case 'image': return 'images'
    case 'video_clip': return 'video clips'
    case 'inference': return 'inferences'
    default: return functionalUnit.endsWith('s') ? functionalUnit : `${functionalUnit}s`
  }
}

export function getScenarioUnitLabel(scenario: AiScenario): string {
  return `${scenarioUnitLabel(scenario.functionalUnit)} per year`
}

function scenarioName(scenario: AiScenario): string {
  const model = scenario.modelId && scenario.modelId !== 'not disclosed' ? ` · ${scenario.modelId}` : ''
  return `${scenario.providerId} · ${scenario.serviceId}${model}`
}

function incompleteNotice(line: RoutineLine, errors: Partial<Record<RoutineFieldId, string>>): WorksheetNotice {
  const firstError = Object.values(errors)[0]
  return {
    lineKey: line.key,
    status: 'incomplete',
    message: firstError ?? 'Complete the routine inputs to calculate an annual quantity.',
  }
}

function activityResult(line: Extract<RoutineLine, { source: 'activity' }>, quantity: number): WorksheetResult | WorksheetNotice {
  const activity = getActivityById(line.activityId)
  if (!activity) return { lineKey: line.key, status: 'unavailable', message: `Activity ${line.activityId} is not available.` }
  const summary = calculateEmissions([{ activityId: activity.id, quantity }])
  const result = summary.results[0]
  if (!result) {
    return { lineKey: line.key, status: 'unavailable', message: `${activity.name} has no published factor.` }
  }
  const bounds = uncertaintyBounds(
    quantity,
    result.emissionFactor,
    result.evidence.uncertainty.lowGPerUnit,
    result.evidence.uncertainty.highGPerUnit,
  )
  return {
    lineKey: line.key,
    source: 'activity',
    sourceId: result.activityId,
    name: result.activityName,
    category: result.category,
    quantity: result.quantity,
    unitLabel: result.unitLabel,
    emissionFactor: result.emissionFactor,
    emissions: result.emissions,
    emissionsKg: result.emissionsKg,
    lowEmissions: bounds?.lowEmissions ?? null,
    highEmissions: bounds?.highEmissions ?? null,
  }
}

function scenarioResult(line: Extract<RoutineLine, { source: 'scenario' }>, quantity: number): WorksheetResult | WorksheetNotice {
  const resolution = resolveScenarioById(line.scenarioId)
  if (resolution.status === 'estimate') {
    return {
      lineKey: line.key,
      status: 'estimate',
      message: `${scenarioName(resolution.scenario)} is an estimate and stays outside the annual total.`,
    }
  }
  if (resolution.status === 'unavailable') {
    return { lineKey: line.key, status: 'unavailable', message: resolution.reason }
  }
  const scenario = resolution.scenario
  const emissions = scenarioAnnualGrams(scenario, quantity)
  if (emissions === null || scenario.carbonGPerUnit === null) {
    return { lineKey: line.key, status: 'unavailable', message: `${scenarioName(scenario)} has no usable carbon factor.` }
  }
  const lowFactor = scenarioNumber(scenario.carbonGPerUnitLow)
  const highFactor = scenarioNumber(scenario.carbonGPerUnitHigh)
  const bounds = uncertaintyBounds(quantity, scenario.carbonGPerUnit, lowFactor, highFactor)
  return {
    lineKey: line.key,
    source: 'scenario',
    sourceId: scenario.scenarioId,
    name: scenarioName(scenario),
    category: 'digital',
    quantity,
    unitLabel: getScenarioUnitLabel(scenario),
    emissionFactor: scenario.carbonGPerUnit,
    emissions,
    emissionsKg: emissions / 1000,
    lowEmissions: bounds?.lowEmissions ?? null,
    highEmissions: bounds?.highEmissions ?? null,
  }
}

export function calculateRoutineWorksheet(lines: readonly RoutineLine[]): WorksheetSummary {
  const results: WorksheetResult[] = []
  const notices: WorksheetNotice[] = []
  const byCategory: Record<ActivityCategory, number> = {
    transport: 0,
    food: 0,
    digital: 0,
    home: 0,
    shopping: 0,
  }

  for (const line of lines) {
    let derivation: RoutineDerivation
    try {
      derivation = deriveRoutineLine(line)
    } catch (error) {
      notices.push({ lineKey: line.key, status: 'unavailable', message: error instanceof Error ? error.message : 'Routine is unavailable.' })
      continue
    }
    if (derivation.quantity === null) {
      notices.push(incompleteNotice(line, derivation.errors))
      continue
    }
    const calculated = line.source === 'activity'
      ? activityResult(line, derivation.quantity)
      : scenarioResult(line, derivation.quantity)
    if ('status' in calculated) {
      notices.push(calculated)
      continue
    }
    results.push(calculated)
    byCategory[calculated.category] += calculated.emissions
  }

  const totalEmissions = results.reduce((total, result) => total + result.emissions, 0)
  return {
    results,
    notices,
    totalEmissions,
    totalEmissionsKg: totalEmissions / 1000,
    totalEmissionsTonnes: totalEmissions / 1_000_000,
    byCategory,
  }
}

function comparableScenarioOptions(line: Extract<RoutineLine, { source: 'scenario' }>): RoutineComparisonOption[] {
  const source = SCENARIO_BY_ID.get(line.scenarioId)
  if (!source) return []
  return SCENARIOS
    .filter(
      (scenario) =>
        scenario.scenarioId !== source.scenarioId
        && scenario.functionalUnit === source.functionalUnit
        && scenario.tokenBasis === source.tokenBasis,
    )
    .map((scenario) => ({ source: 'scenario' as const, id: scenario.scenarioId, name: scenarioName(scenario) }))
}

export function getRoutineComparisonOptions(line: RoutineLine): RoutineComparisonOption[] {
  if (line.source === 'scenario') return comparableScenarioOptions(line)
  const group = COMPARISON_GROUPS[line.activityId]
  if (!group) return []
  return ACTIVITIES
    .filter((activity) => activity.id !== line.activityId && COMPARISON_GROUPS[activity.id] === group)
    .map((activity) => ({ source: 'activity' as const, id: activity.id, name: activity.name }))
}

export function getCompatibleRoutineComparisons(line: RoutineLine): RoutineComparisonOption[] {
  return getRoutineComparisonOptions(line)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRoutineFieldId(value: string): value is RoutineFieldId {
  return ([
    'oneWayKm',
    'legsPerDay',
    'travelDaysPerWeek',
    'weeksPerYear',
    'legsPerTrip',
    'tripsPerYear',
    'hoursPerUseDay',
    'useDaysPerWeek',
    'servingsPerMeal',
    'mealsPerWeek',
    'amountPerCycle',
    'cyclesPerYear',
    'unitsInService',
    'itemsPerPurchase',
    'purchasesPerYear',
    'unitsInUse',
    'replacementIntervalYears',
    'eventsPerUseDay',
    'useDaysPerMonth',
    'monthsPerYear',
  ] as string[]).includes(value)
}

function sanitizeLine(value: unknown): RoutineLine | null {
  if (!isRecord(value) || typeof value.key !== 'string' || !isRecord(value.values)) return null
  const rawValues = value.values
  if (value.source === 'activity' && typeof value.activityId === 'string' && typeof value.recipeKind === 'string') {
    const activity = getActivityById(value.activityId)
    if (!activity) return null
    const expected = getActivityRecipe(activity.id)
    if (!expected || expected.kind !== value.recipeKind || value.key !== `activity:${activity.id}`) return null
    if (!validateValues(rawValues, expected)) return null
    return {
      key: value.key,
      source: 'activity',
      activityId: activity.id,
      recipeKind: expected.kind as Exclude<RoutineKind, 'ai-monthly-events'>,
      values: copyValues(rawValues),
    }
  }
  if (value.source === 'scenario' && typeof value.scenarioId === 'string' && value.recipeKind === 'ai-monthly-events') {
    const scenario = SCENARIO_BY_ID.get(value.scenarioId)
    if (!scenario || value.key !== `scenario:${scenario.scenarioId}`) return null
    if (!validateValues(rawValues, AI_MONTHLY_EVENTS_RECIPE)) return null
    return {
      key: value.key,
      source: 'scenario',
      scenarioId: scenario.scenarioId,
      recipeKind: 'ai-monthly-events',
      values: copyValues(rawValues),
    }
  }
  return null
}

function copyValues(values: Record<string, unknown>): RoutineValues {
  return Object.fromEntries(Object.entries(values).map(([id, value]) => [id, value])) as RoutineValues
}

function validateValues(values: Record<string, unknown>, recipeDefinition: RoutineRecipe): boolean {
  const fieldIds = new Set(recipeDefinition.fields.map((definition) => definition.id))
  const valueIds = Object.keys(values)
  if (valueIds.length !== fieldIds.size || valueIds.some((id) => !isRoutineFieldId(id) || !fieldIds.has(id as RoutineFieldId))) {
    return false
  }
  return recipeDefinition.fields.every((definition) => {
    const raw = values[definition.id]
    return typeof raw === 'string' && positiveNumber({ [definition.id]: raw }, definition.id) !== null
  })
}

function encodeUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeUtf8(value: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

export function encodeRoutineWorksheet(lines: readonly RoutineLine[]): string {
  const safeLines = lines.map(sanitizeLine).filter((line): line is RoutineLine => line !== null)
  return encodeUtf8(JSON.stringify({ v: 2, lines: safeLines }))
}

export function decodeRoutineWorksheet(encoded: string): RoutineLine[] {
  if (!encoded) return []
  const decoded = decodeUtf8(encoded)
  if (!decoded) return []
  try {
    const payload: unknown = JSON.parse(decoded)
    if (!isRecord(payload) || payload.v !== 2 || !Array.isArray(payload.lines)) return []
    const lines: RoutineLine[] = []
    const keys = new Set<string>()
    for (const candidate of payload.lines) {
      const line = sanitizeLine(candidate)
      if (!line || keys.has(line.key)) continue
      keys.add(line.key)
      lines.push(line)
    }
    return lines
  } catch {
    return []
  }
}

export function routineFamilyLabel(category: ActivityCategory): string {
  return CATEGORY_INFO[category].name
}
