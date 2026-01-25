/**
 * Carbon Calculator
 * Emission factors and calculation utilities
 *
 * Values are in grams CO2e per unit
 * Sources: EPA, IPCC, GHG Protocol, academic literature
 */

// ============================================================================
// Types
// ============================================================================

export interface Activity {
  id: string
  name: string
  category: ActivityCategory
  unit: string
  unitLabel: string
  emissionFactor: number // gCO2e per unit
  description?: string
  source?: string
}

export type ActivityCategory =
  | 'transport'
  | 'food'
  | 'digital'
  | 'home'
  | 'shopping'

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
  emissions: number // gCO2e
  emissionsKg: number
}

export interface CalculatorSummary {
  results: CalculatorResult[]
  totalEmissions: number // gCO2e
  totalEmissionsKg: number
  totalEmissionsTonnes: number
  byCategory: Record<ActivityCategory, number>
  comparisonToAverage: number // percentage vs Canadian average
}

// ============================================================================
// Emission Factors
// Values in gCO2e per unit
// ============================================================================

export const ACTIVITIES: Activity[] = [
  // Transport
  {
    id: 'car-km',
    name: 'Car travel (gasoline)',
    category: 'transport',
    unit: 'km',
    unitLabel: 'kilometers',
    emissionFactor: 180,
    description: 'Average gasoline passenger car',
    source: 'ECCC NIR 2025',
  },
  {
    id: 'car-mile',
    name: 'Car travel (gasoline)',
    category: 'transport',
    unit: 'mile',
    unitLabel: 'miles',
    emissionFactor: 290,
    description: 'Average gasoline passenger car',
    source: 'ECCC NIR 2025',
  },
  {
    id: 'flight-short',
    name: 'Short-haul flight',
    category: 'transport',
    unit: 'hour',
    unitLabel: 'hours',
    emissionFactor: 255000, // ~255 kg per hour
    description: 'Domestic/regional flight under 3 hours',
    source: 'IATA 2023',
  },
  {
    id: 'flight-long',
    name: 'Long-haul flight',
    category: 'transport',
    unit: 'hour',
    unitLabel: 'hours',
    emissionFactor: 195000, // ~195 kg per hour (more efficient)
    description: 'International flight over 6 hours',
    source: 'IATA 2023',
  },
  {
    id: 'transit',
    name: 'Public transit',
    category: 'transport',
    unit: 'km',
    unitLabel: 'kilometers',
    emissionFactor: 40,
    description: 'Average bus/subway/train',
    source: 'TTC/Metrolinx',
  },
  {
    id: 'bike',
    name: 'Cycling',
    category: 'transport',
    unit: 'km',
    unitLabel: 'kilometers',
    emissionFactor: 0,
    description: 'Zero direct emissions',
  },

  // Food
  {
    id: 'meal-beef',
    name: 'Meal with beef',
    category: 'food',
    unit: 'serving',
    unitLabel: 'servings',
    emissionFactor: 6800,
    description: '150g beef serving',
    source: 'Poore & Nemecek 2018',
  },
  {
    id: 'meal-chicken',
    name: 'Meal with chicken',
    category: 'food',
    unit: 'serving',
    unitLabel: 'servings',
    emissionFactor: 1800,
    description: '150g chicken serving',
    source: 'Poore & Nemecek 2018',
  },
  {
    id: 'meal-veg',
    name: 'Vegetarian meal',
    category: 'food',
    unit: 'serving',
    unitLabel: 'servings',
    emissionFactor: 500,
    description: 'Plant-based meal',
    source: 'Poore & Nemecek 2018',
  },
  {
    id: 'coffee',
    name: 'Coffee',
    category: 'food',
    unit: 'cup',
    unitLabel: 'cups',
    emissionFactor: 150,
    description: '12 oz brewed coffee',
    source: 'Carbon Trust',
  },

  // Digital
  {
    id: 'streaming-hd',
    name: 'HD video streaming',
    category: 'digital',
    unit: 'hour',
    unitLabel: 'hours',
    emissionFactor: 36,
    description: 'Netflix, YouTube, etc.',
    source: 'IEA/DIMPACT 2021',
  },
  {
    id: 'streaming-4k',
    name: '4K video streaming',
    category: 'digital',
    unit: 'hour',
    unitLabel: 'hours',
    emissionFactor: 72,
    description: 'Ultra HD streaming',
    source: 'IEA/DIMPACT 2021',
  },
  {
    id: 'social-media',
    name: 'Social media usage',
    category: 'digital',
    unit: 'hour',
    unitLabel: 'hours',
    emissionFactor: 20,
    description: 'Facebook, Instagram, TikTok, etc.',
    source: 'Greenspector 2022',
  },
  {
    id: 'video-call',
    name: 'Video conferencing',
    category: 'digital',
    unit: 'hour',
    unitLabel: 'hours',
    emissionFactor: 50,
    description: 'Zoom, Teams, etc.',
    source: 'Microsoft 2022',
  },

  // Home
  {
    id: 'electricity-kwh',
    name: 'Electricity usage',
    category: 'home',
    unit: 'kWh',
    unitLabel: 'kWh',
    emissionFactor: 40, // Ontario grid
    description: 'Ontario grid average',
    source: 'ECCC NIR 2025',
  },
  {
    id: 'natural-gas',
    name: 'Natural gas heating',
    category: 'home',
    unit: 'm³',
    unitLabel: 'cubic metres',
    emissionFactor: 1900,
    description: 'Home heating',
    source: 'ECCC NIR 2025',
  },
  {
    id: 'water-hot',
    name: 'Hot water (shower)',
    category: 'home',
    unit: 'minute',
    unitLabel: 'minutes',
    emissionFactor: 100,
    description: 'Average shower',
    source: 'WaterSense EPA',
  },

  // Shopping
  {
    id: 'tshirt',
    name: 'Cotton T-shirt',
    category: 'shopping',
    unit: 'item',
    unitLabel: 'items',
    emissionFactor: 4000,
    source: 'WRAP 2017',
  },
  {
    id: 'jeans',
    name: 'Denim jeans',
    category: 'shopping',
    unit: 'item',
    unitLabel: 'items',
    emissionFactor: 33000,
    source: 'Quantis 2018',
  },
  {
    id: 'smartphone',
    name: 'Smartphone',
    category: 'shopping',
    unit: 'item',
    unitLabel: 'items',
    emissionFactor: 70000,
    description: 'Embodied emissions',
    source: 'Apple/Malmodin 2024',
  },
  {
    id: 'laptop',
    name: 'Laptop computer',
    category: 'shopping',
    unit: 'item',
    unitLabel: 'items',
    emissionFactor: 200000,
    description: 'Embodied emissions',
    source: 'Apple/Malmodin 2024',
  },
]

// ============================================================================
// Category Metadata
// ============================================================================

export const CATEGORY_INFO: Record<
  ActivityCategory,
  { name: string; emoji: string; color: string }
> = {
  transport: { name: 'Transport', emoji: '🚗', color: '#3b82f6' },
  food: { name: 'Food & Drink', emoji: '🍽️', color: '#10b981' },
  digital: { name: 'Digital', emoji: '📱', color: '#8b5cf6' },
  home: { name: 'Home Energy', emoji: '🏠', color: '#f59e0b' },
  shopping: { name: 'Shopping', emoji: '🛍️', color: '#ef4444' },
}

// Canadian average annual footprint: ~14.2 tonnes CO2e per capita
export const CANADIAN_AVERAGE_ANNUAL = 14200000 // grams

// ============================================================================
// Calculator Functions
// ============================================================================

export function getActivityById(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id)
}

export function getActivitiesByCategory(category: ActivityCategory): Activity[] {
  return ACTIVITIES.filter((a) => a.category === category)
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
    if (!activity || input.quantity <= 0) continue

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

  const totalEmissions = results.reduce((sum, r) => sum + r.emissions, 0)

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
  if (kg < 1) return '#10b981' // green
  if (kg < 10) return '#f59e0b' // amber
  return '#ef4444' // red
}
