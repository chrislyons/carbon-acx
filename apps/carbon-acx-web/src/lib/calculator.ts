import calculatorDataJson from '@/generated/calculator-data.json'

export type ActivityCategory =
  | 'transport'
  | 'food'
  | 'digital'
  | 'home'
  | 'shopping'

export interface ActivityProvenance {
  activityId: string
  emissionFactorId: string
  emissionFactorRegion: string | null
  emissionFactorVintageYear: number | null
  gridIntensityRegion: string | null
  gridIntensityVintageYear: number | null
}

export interface Activity {
  id: string
  name: string
  category: ActivityCategory
  unit: string
  unitLabel: string
  emissionFactor: number
  description?: string
  sourceIds: string[]
  sourceCitations: string[]
  provenance: ActivityProvenance
  // Custom activity fields
  isCustom?: boolean
  isGridIndexed?: boolean
  electricityKwhPerUnit?: number
}

export interface CategoryInfo {
  name: string
  emoji: string
  color: string
}

export type BenchmarkScope = 'national' | 'province' | string

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
  populationSourceId: string | null
  populationCitation: string | null
  notes: string | null
}

export interface CalculatorDataset {
  schemaVersion: string
  generatedAt: string
  categories: Record<ActivityCategory, CategoryInfo>
  activities: Activity[]
  benchmarks: Record<string, Benchmark>
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
  emissions: number
  emissionsKg: number
}

export type SkippedInputReason = 'unknown-activity' | 'non-positive-quantity' | 'non-finite-quantity'

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
  /** Inputs excluded from the total, surfaced so nothing is silently dropped. */
  skipped: SkippedInput[]
}

export const CALCULATOR_DATASET = calculatorDataJson as CalculatorDataset
export const ACTIVITIES = CALCULATOR_DATASET.activities
export const CATEGORY_INFO = CALCULATOR_DATASET.categories
export const BENCHMARKS = CALCULATOR_DATASET.benchmarks

// Sourced comparison baselines (see data/benchmarks.csv → ECCC NIR territorial
// basis + StatCan population). Dynamic and citation-backed; never hardcoded.
export const DEFAULT_BENCHMARK_KEY = 'canadian_average'
export const CANADIAN_AVERAGE = BENCHMARKS[DEFAULT_BENCHMARK_KEY]
export const CANADIAN_AVERAGE_ANNUAL = CANADIAN_AVERAGE.annualGrams

export interface BenchmarkOption extends Benchmark {
  key: string
}

/**
 * All comparison baselines, national first, then provinces ascending by
 * per-capita footprint (Quebec lowest → Saskatchewan highest). Stable order
 * for selectors and legends.
 */
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

/** Footprint as a percentage of a benchmark's annual per-capita baseline. */
export function comparisonToBenchmark(totalEmissions: number, benchmark: Benchmark): number {
  return benchmark.annualGrams > 0 ? (totalEmissions / benchmark.annualGrams) * 100 : 0
}

// O(1) id lookup, built once from the generated dataset.
const ACTIVITY_BY_ID: ReadonlyMap<string, Activity> = new Map(
  ACTIVITIES.map((activity) => [activity.id, activity]),
)

export function getActivityById(id: string): Activity | undefined {
  return ACTIVITY_BY_ID.get(id)
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
      skipped.push({ ...input, reason: 'unknown-activity' })
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

    const emissions = input.quantity * activity.emissionFactor
    results.push({
      activityId: activity.id,
      activityName: activity.name,
      category: activity.category,
      quantity: input.quantity,
      unit: activity.unit,
      emissions,
      emissionsKg: emissions / 1000,
    })

    byCategory[activity.category] += emissions
  }

  const totalEmissions = results.reduce((sum, result) => sum + result.emissions, 0)

  return {
    results,
    totalEmissions,
    totalEmissionsKg: totalEmissions / 1000,
    totalEmissionsTonnes: totalEmissions / 1000000,
    byCategory,
    comparisonToAverage:
      CANADIAN_AVERAGE_ANNUAL > 0 ? (totalEmissions / CANADIAN_AVERAGE_ANNUAL) * 100 : 0,
    skipped,
  }
}

export function formatEmissions(grams: number): string {
  if (grams >= 1000000) {
    return `${(grams / 1000000).toFixed(2)} tonnes`
  }
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg`
  }
  return `${Math.round(grams)} g`
}

export function getEmissionsColor(kg: number): string {
  if (kg < 1) return '#10b981'
  if (kg < 10) return '#f59e0b'
  return '#ef4444'
}