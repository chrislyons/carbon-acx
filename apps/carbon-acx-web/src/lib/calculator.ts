import calculatorDataJson from '@/generated/calculator-data.json'
import catalogDataJson from '@/generated/catalog-data.json'
import owidContextJson from '@/generated/owid-context.json'

export type ActivityCategory = 'transport' | 'food' | 'digital' | 'home' | 'shopping'

export interface SourceEvidence {
  sourceId: string
  retrievedAt: string
  reviewDueAt: string
  evidenceSha256: string
  verificationRunUrl: string
  rawArtifactName: string
}

export interface ActivityEvidence {
  activityId: string
  emissionFactorId: string
  sectorId: string
  layerId: string
  region: string | null
  scopeBoundary: string
  gwpHorizon: string
  vintageYear: number | null
  sourceIds: string[]
  sourceCitations: string[]
  sourceUrls: string[]
  sourceEvidence: SourceEvidence[]
  methodNotes: string | null
  uncertainty: { lowGPerUnit: number | null; highGPerUnit: number | null }
  publicationStatus: 'published' | 'unavailable'
}

export interface Activity {
  id: string
  name: string
  category: ActivityCategory
  unit: string
  unitLabel: string
  emissionFactor: number
  description: string
  unitDefinition: string
  notes: string
  evidence: ActivityEvidence
}

export interface CatalogActivity {
  id: string
  name: string
  category: string
  unit: string
  unitLabel: string
  description: string
  unitDefinition: string
  notes: string
  emissionFactor: number | null
  evidence: ActivityEvidence
  unavailabilityReason: string | null
}

export interface AiScenarioSourceRef {
  sourceId: string
  role: string
  locator: string
  retrievedAt: string
  citation: string
  url: string
  sourceEvidence: SourceEvidence | null
}

export interface AiScenario {
  scenarioId: string
  activityId: string
  providerId: string
  serviceId: string
  modelId: string
  modelVersion: string | null
  modelGeneration: string
  generationMode: string
  modality: string
  functionalUnit: string
  tokenBasis: string | null
  workload: {
    profileId: string | null
    inputTokens: number | string | null
    outputTokens: number | string | null
    reasoningTokens: number | string | null
    hiddenReasoningDisclosure: string | null
    batchSize: number | string | null
    servingContext: string | null
  }
  media: {
    widthPx: number | string | null
    heightPx: number | string | null
    frames: number | string | null
    fps: number | string | null
    denoisingSteps: number | string | null
    durationSeconds: number | string | null
    audioIncluded: string | null
  }
  energyWh: number | null
  energyWhLow: number | string | null
  energyWhHigh: number | string | null
  energyComponents: unknown[] | Record<string, unknown> | null
  scopeBoundary: string
  pueTreatment: string
  carbonGPerUnit: number | null
  carbonGPerUnitLow: number | string | null
  carbonGPerUnitHigh: number | string | null
  carbonAccounting: {
    method: string | null
    components: unknown[] | Record<string, unknown> | null
    gridIntensityGPerKwh: number | string | null
    gridRegion: string | null
    gridVintageYear: number | string | null
  }
  serviceRegion: string | null
  vintageYear: number | null
  retrievedAt: string
  uncertainty: unknown[] | Record<string, unknown> | null
  publicationStatus: 'published' | 'estimate' | 'unavailable'
  sourceRefs: AiScenarioSourceRef[]
  notes: string | null
}

export interface AiScenarioDataset {
  schemaVersion: string
  records: AiScenario[]
}

export interface CategoryInfo {
  name: string
  color: string
}
export type BenchmarkScope = 'national' | 'province' | string
export type BenchmarkAccountingBasis = 'territorial'
export type BenchmarkLandUseChange = 'excluded'

export interface Benchmark {
  label: string
  scope: BenchmarkScope | null
  regionCode: string | null
  perCapitaTonnes: number
  annualGrams: number
  totalMt: number | null
  populationMillions: number | null
  year: number | null
  sourceId: string | null
  sourceCitation: string | null
  sourceUrl: string | null
  sourceEvidence: SourceEvidence | null
  populationSourceId: string | null
  populationCitation: string | null
  populationSourceUrl: string | null
  populationSourceEvidence: SourceEvidence | null
  notes: string | null
  accountingBasis: BenchmarkAccountingBasis
  landUseChange: BenchmarkLandUseChange
}

export interface CalculatorDataset {
  schemaVersion: string
  generatedAt: string
  categories: Record<ActivityCategory, CategoryInfo>
  activities: Activity[]
  benchmarks: Record<string, Benchmark>
}

export interface CatalogDataset {
  schemaVersion: string
  generatedAt: string
  activities: CatalogActivity[]
  aiScenarios: AiScenarioDataset
}

export interface OwidContextPoint {
  year: number
  value: number
}

export interface OwidContextSource {
  provider: string
  chartId: string
  chartUrl: string
  metric: string
  dataUrl: string
  metadataUrl: string
  citation: string
  license: string
  retrievedAt: string
  upstreamTimespan: string
  upstreamLastUpdated: string
  dataSha256: string
  metadataSha256: string
}

export interface OwidContextBasis {
  accountingBasis: 'territorial'
  gas: 'CO₂'
  landUseChange: 'excluded'
  geography: 'country production'
  unit: 'tonnes'
}

export interface OwidContextDataset {
  schemaVersion: string
  status: 'available' | 'unavailable'
  generatedAt: string
  source: OwidContextSource | null
  basis: OwidContextBasis | null
  selection: { entity: 'Canada'; code: 'CAN' }
  points: OwidContextPoint[]
  reason?: string
}

export interface CalculatorInput {
  activityId: string
  quantity: number
}

export interface CalculatorResult {
  activityId: string
  activityName: string
  category: ActivityCategory
  quantity: number
  unit: string
  unitLabel: string
  emissionFactor: number
  emissions: number
  emissionsKg: number
  evidence: ActivityEvidence
}

export type SkippedInputReason =
  | 'unknown-activity'
  | 'unavailable-activity'
  | 'non-positive-quantity'
  | 'non-finite-quantity'

export interface SkippedInput {
  activityId: string
  quantity: number
  reason: SkippedInputReason
}

export interface CalculatorSummary {
  results: CalculatorResult[]
  totalEmissions: number
  totalEmissionsKg: number
  totalEmissionsTonnes: number
  byCategory: Record<ActivityCategory, number>
  comparisonToAverage: number
  skipped: SkippedInput[]
}

export const CALCULATOR_DATASET = calculatorDataJson as CalculatorDataset
export const CATALOG_DATASET = catalogDataJson as CatalogDataset
export const OWID_CONTEXT = owidContextJson as OwidContextDataset
export const ACTIVITIES = CALCULATOR_DATASET.activities
export const CATALOG_ACTIVITIES = CATALOG_DATASET.activities
export const CATEGORY_INFO = CALCULATOR_DATASET.categories
export const BENCHMARKS = CALCULATOR_DATASET.benchmarks
export const DEFAULT_BENCHMARK_KEY = 'canadian_average'
export const CANADIAN_AVERAGE = BENCHMARKS[DEFAULT_BENCHMARK_KEY]
export const CANADIAN_AVERAGE_ANNUAL = CANADIAN_AVERAGE.annualGrams
export function getLatestOwidPoint(
  context: OwidContextDataset = OWID_CONTEXT,
): OwidContextPoint | null {
  return context.points.length > 0 ? context.points[context.points.length - 1] : null
}

export function getLatestOwidChange(
  context: OwidContextDataset = OWID_CONTEXT,
): { absolute: number; percentage: number | null } | null {
  if (context.points.length < 2) return null
  const previous = context.points[context.points.length - 2]
  const latest = context.points[context.points.length - 1]
  return {
    absolute: latest.value - previous.value,
    percentage: previous.value === 0 ? null : ((latest.value - previous.value) / previous.value) * 100,
  }
}
export interface BenchmarkOption extends Benchmark {
  key: string
}

export function getBenchmarkOptions(): BenchmarkOption[] {
  return Object.entries(BENCHMARKS)
    .map(([key, benchmark]) => ({ key, ...benchmark }))
    .sort((a, b) => {
      const aNational = a.scope === 'national' ? 0 : 1
      const bNational = b.scope === 'national' ? 0 : 1
      if (aNational !== bNational) return aNational - bNational
      return a.perCapitaTonnes - b.perCapitaTonnes
    })
}

export function getBenchmark(key: string): Benchmark | undefined {
  return BENCHMARKS[key]
}

export function comparisonToBenchmark(totalEmissions: number, benchmark: Benchmark): number {
  return benchmark.annualGrams > 0 ? (totalEmissions / benchmark.annualGrams) * 100 : 0
}

export type ScenarioModality = 'text' | 'image' | 'video'

export interface ScenarioQuery {
  activityId: string
  modality?: ScenarioModality
  functionalUnit?: string
  providerId?: string
  modelId?: string
}

export type ScenarioResolution =
  | { status: 'published'; scenario: AiScenario }
  | { status: 'estimate'; scenario: AiScenario }
  | { status: 'unavailable'; reason: string }

const AI_SCENARIOS: AiScenarioDataset = CATALOG_DATASET.aiScenarios

export function getAiActivities(): CatalogActivity[] {
  return CATALOG_ACTIVITIES.filter(
    (activity) => activity.id.startsWith('AI.') && activity.evidence.publicationStatus !== 'published',
  )
}

export function listScenariosForActivity(activityId: string): AiScenario[] {
  return AI_SCENARIOS.records.filter((record) => record.activityId === activityId)
}

function toResolution(scenario: AiScenario): ScenarioResolution {
  if (scenario.publicationStatus === 'published') return { status: 'published', scenario }
  if (scenario.publicationStatus === 'estimate') return { status: 'estimate', scenario }
  return {
    status: 'unavailable',
    reason:
      scenario.scenarioId === 'SCN.ANTHROPIC.CLAUDE3.UNAVAILABLE.2024'
        ? 'This provider has not disclosed per-query energy or carbon data.'
        : 'The selected scenario has no usable publication.',
  }
}

export function resolveScenarioById(scenarioId: string): ScenarioResolution {
  const matches = AI_SCENARIOS.records.filter((record) => record.scenarioId === scenarioId)
  if (matches.length === 0) return { status: 'unavailable', reason: 'No matching scenario.' }
  if (matches.length > 1) return { status: 'unavailable', reason: 'Ambiguous scenario key.' }
  return toResolution(matches[0])
}

export function resolveAiScenario(query: ScenarioQuery): ScenarioResolution {
  const matches = AI_SCENARIOS.records.filter(
    (record) =>
      record.activityId === query.activityId &&
      (query.modality === undefined || record.modality === query.modality) &&
      (query.functionalUnit === undefined || record.functionalUnit === query.functionalUnit) &&
      (query.providerId === undefined || record.providerId === query.providerId) &&
      (query.modelId === undefined || record.modelId === query.modelId),
  )
  if (matches.length === 0) return { status: 'unavailable', reason: 'No matching scenario.' }
  if (matches.length > 1) return { status: 'unavailable', reason: 'Ambiguous scenario key.' }
  return toResolution(matches[0])
}

export function scenarioAnnualGrams(scenario: AiScenario, quantity: number): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null
  if (typeof scenario.carbonGPerUnit !== 'number' || scenario.carbonGPerUnit < 0) return null
  return quantity * scenario.carbonGPerUnit
}

const STALE_VINTAGE_YEARS = 5

export function scenarioStaleVintage(scenario: AiScenario, now: Date = new Date()): string | null {
  const reviewDueAt = scenario.sourceRefs[0]?.sourceEvidence?.reviewDueAt
  if (reviewDueAt) {
    const due = new Date(reviewDueAt)
    if (!Number.isNaN(due.getTime()) && due.getTime() < now.getTime()) {
      return `Source review was due ${reviewDueAt.slice(0, 10)}; treat values as aging.`
    }
  }
  if (typeof scenario.vintageYear === 'number') {
    const age = now.getUTCFullYear() - scenario.vintageYear
    if (age > STALE_VINTAGE_YEARS) {
      return `Scenario vintage ${scenario.vintageYear} is over ${STALE_VINTAGE_YEARS} years old.`
    }
  }
  return null
}

const ACTIVITY_BY_ID: ReadonlyMap<string, Activity> = new Map(
  ACTIVITIES.map((activity) => [activity.id, activity]),
)
const CATALOG_ACTIVITY_BY_ID: ReadonlyMap<string, CatalogActivity> = new Map(
  CATALOG_ACTIVITIES.map((activity) => [activity.id, activity]),
)

export function getActivityById(id: string): Activity | undefined {
  return ACTIVITY_BY_ID.get(id)
}

export function getCatalogActivityById(id: string): CatalogActivity | undefined {
  return CATALOG_ACTIVITY_BY_ID.get(id)
}

export function getActivitiesByCategory(category: ActivityCategory): Activity[] {
  return ACTIVITIES.filter((activity) => activity.category === category)
}

export function calculateEmissions(inputs: CalculatorInput[]): CalculatorSummary {
  const results: CalculatorResult[] = []
  const skipped: SkippedInput[] = []
  const byCategory: Record<ActivityCategory, number> = {
    transport: 0,
    food: 0,
    digital: 0,
    home: 0,
    shopping: 0,
  }

  for (const input of inputs) {
    const activity = getActivityById(input.activityId)
    if (!activity) {
      const catalogActivity = getCatalogActivityById(input.activityId)
      skipped.push({
        ...input,
        reason: catalogActivity?.evidence.publicationStatus === 'unavailable'
          ? 'unavailable-activity'
          : 'unknown-activity',
      })
      continue
    }
    if (!Number.isFinite(input.quantity)) {
      skipped.push({ ...input, reason: 'non-finite-quantity' })
      continue
    }
    if (input.quantity <= 0) {
      skipped.push({ ...input, reason: 'non-positive-quantity' })
      continue
    }
    if (activity.evidence.publicationStatus !== 'published') {
      skipped.push({ ...input, reason: 'unavailable-activity' })
      continue
    }

    const emissions = input.quantity * activity.emissionFactor
    results.push({
      activityId: activity.id,
      activityName: activity.name,
      category: activity.category,
      quantity: input.quantity,
      unit: activity.unit,
      unitLabel: activity.unitLabel,
      emissionFactor: activity.emissionFactor,
      emissions,
      emissionsKg: emissions / 1000,
      evidence: activity.evidence,
    })
    byCategory[activity.category] += emissions
  }

  const totalEmissions = results.reduce((sum, result) => sum + result.emissions, 0)
  return {
    results,
    totalEmissions,
    totalEmissionsKg: totalEmissions / 1000,
    totalEmissionsTonnes: totalEmissions / 1_000_000,
    byCategory,
    comparisonToAverage:
      CANADIAN_AVERAGE_ANNUAL > 0 ? (totalEmissions / CANADIAN_AVERAGE_ANNUAL) * 100 : 0,
    skipped,
  }
}

export function formatEmissions(grams: number): string {
  if (grams >= 1_000_000) return `${(grams / 1_000_000).toFixed(2)} t CO₂e`
  if (grams >= 1_000) return `${(grams / 1_000).toFixed(1)} kg CO₂e`
  return `${Math.round(grams)} g CO₂e`
}

export function encodeCalculatorInputs(inputs: Record<string, number>): string {
  const entries = Object.entries(inputs).filter(
    ([activityId, quantity]) => getActivityById(activityId) && Number.isFinite(quantity) && quantity > 0,
  )
  return entries.length > 0 ? btoa(entries.map(([id, value]) => `${id}:${value}`).join(',')) : ''
}

export function decodeCalculatorInputs(encoded: string): Record<string, number> {
  try {
    return atob(encoded).split(',').reduce<Record<string, number>>((decoded, entry) => {
      const separator = entry.lastIndexOf(':')
      const activityId = entry.slice(0, separator)
      const quantity = Number(entry.slice(separator + 1))
      if (getActivityById(activityId) && Number.isFinite(quantity) && quantity > 0) {
        decoded[activityId] = quantity
      }
      return decoded
    }, {})
  } catch {
    return {}
  }
}

export type AtlasMode = 'personal' | 'systems' | 'industrial'

export function getAtlasMode(activity: CatalogActivity): AtlasMode {
  if (ACTIVITY_BY_ID.has(activity.id)) return 'personal'
  if (['professional', 'online', 'industrial_light'].includes(activity.evidence.layerId)) return 'systems'
  return 'industrial'
}