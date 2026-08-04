import calculatorDataJson from '@/generated/calculator-data.json'
import catalogDataJson from '@/generated/catalog-data.json'
import owidContextJson from '@/generated/owid-context.json'

export type ActivityCategory = 'transport' | 'food' | 'digital' | 'home' | 'shopping'

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
  populationSourceId: string | null
  populationCitation: string | null
  populationSourceUrl: string | null
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