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

export interface CalculatorDataset {
  schemaVersion: string
  generatedAt: string
  categories: Record<ActivityCategory, CategoryInfo>
  activities: Activity[]
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

export interface CalculatorSummary {
  results: CalculatorResult[]
  totalEmissions: number
  totalEmissionsKg: number
  totalEmissionsTonnes: number
  byCategory: Record<ActivityCategory, number>
  comparisonToAverage: number
}

export const CALCULATOR_DATASET = calculatorDataJson as CalculatorDataset
export const ACTIVITIES = CALCULATOR_DATASET.activities
export const CATEGORY_INFO = CALCULATOR_DATASET.categories

// Canadian average annual footprint: ~14.2 tonnes CO2e per capita.
export const CANADIAN_AVERAGE_ANNUAL = 14200000

export function getActivityById(id: string): Activity | undefined {
  return ACTIVITIES.find((activity) => activity.id === id)
}

export function getActivitiesByCategory(category: ActivityCategory): Activity[] {
  return ACTIVITIES.filter((activity) => activity.category === category)
}

export function calculateEmissions(inputs: CalculatorInput[]): CalculatorSummary {
  const results: CalculatorResult[] = []
  const byCategory: Record<ActivityCategory, number> = {
    transport: 0,
    food: 0,
    digital: 0,
    home: 0,
    shopping: 0,
  }

  for (const input of inputs) {
    const activity = getActivityById(input.activityId)
    if (!activity || input.quantity <= 0) {
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
    comparisonToAverage: (totalEmissions / CANADIAN_AVERAGE_ANNUAL) * 100,
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