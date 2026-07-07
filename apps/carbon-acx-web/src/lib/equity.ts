// Equity & Global Context for Carbon Calculator

export interface EquityBenchmark {
  entityId: string
  entityName: string
  entityType: 'nation' | 'bloc' | 'group' | 'global'
  isoCode?: string
  populationMillions: number
  co2PerCapitaTonnes: number
  co2TotalMt: number
  consumptionCo2PerCapita?: number
  productionCo2PerCapita?: number
  year: number
  sourceId: string
  notes?: string
}

export interface EquityComparison {
  benchmark: EquityBenchmark
  yourTonnes: number
  ratio: number // your / benchmark
  difference: number // your - benchmark
  percentile?: number // Where you rank globally
}

// Carbon budget constants (IPCC AR6)
export const CARBON_BUDGETS = {
  // Remaining carbon budget from 2024 for 50% chance
  '1.5C': 250_000, // MtCO2 (250 GtCO2)
  '1.7C': 650_000, // MtCO2
  '2.0C': 1_150_000, // MtCO2
} as const

export const GLOBAL_POPULATION = 8_000 // millions

// Per-capita fair share (budget / population / years remaining)
export function calculateFairSharePerCapita(
  budgetMt: number = CARBON_BUDGETS['1.5C'],
  yearsRemaining: number = 26 // 2024-2050
): number {
  return (budgetMt * 1_000_000) / (GLOBAL_POPULATION * 1_000_000 * yearsRemaining) // tonnes per person per year
}

// 1.5°C fair share ≈ 1.2 tCO2/person/year
export const FAIR_SHARE_1_5C = calculateFairSharePerCapita()

// 2.0°C fair share ≈ 5.5 tCO2/person/year
export const FAIR_SHARE_2C = calculateFairSharePerCapita(CARBON_BUDGETS['2.0C'])

// Consumption vs Production accounting
export type AccountingMethod = 'production' | 'consumption'

export interface EquityResult {
  yourAnnualTonnes: number
  fairShare1_5C: number
  fairShare2C: number
  ratioTo1_5C: number
  ratioTo2C: number
  yearsOfFairShareUsed: number // How many years of 1.5C budget you use in one year
  percentile: number // Estimated global percentile (0-100)
  comparisons: EquityComparison[]
}

export function calculateEquity(
  yourAnnualTonnes: number,
  benchmarks: EquityBenchmark[],
  accounting: AccountingMethod = 'production'
): EquityResult {
  // Global percentile estimation based on global distribution
  // Approximate: log-normal distribution with median ~2.5 t, mean ~4.7 t
  const globalMean = 4.7
  const globalSd = 6.0 // Rough estimate
  const zScore = (yourAnnualTonnes - globalMean) / globalSd
  const percentile = Math.max(0, Math.min(100, 50 + zScore * 34.1)) // Rough normal CDF

  const comparisons: EquityComparison[] = benchmarks
    .filter((b) => b.entityType === 'nation' || b.entityType === 'bloc')
    .map((benchmark) => {
      const benchmarkValue = accounting === 'consumption' && benchmark.consumptionCo2PerCapita
        ? benchmark.consumptionCo2PerCapita
        : benchmark.co2PerCapitaTonnes
      return {
        benchmark,
        yourTonnes: yourAnnualTonnes,
        ratio: benchmarkValue > 0 ? yourAnnualTonnes / benchmarkValue : 0,
        difference: yourAnnualTonnes - benchmarkValue,
      }
    })
    .sort((a, b) => a.ratio - b.ratio)

  return {
    yourAnnualTonnes,
    fairShare1_5C: FAIR_SHARE_1_5C,
    fairShare2C: FAIR_SHARE_2C,
    ratioTo1_5C: yourAnnualTonnes / FAIR_SHARE_1_5C,
    ratioTo2C: yourAnnualTonnes / FAIR_SHARE_2C,
    yearsOfFairShareUsed: yourAnnualTonnes / FAIR_SHARE_1_5C,
    percentile: Math.round(percentile),
    comparisons,
  }
}

/**
 * Load equity benchmarks from generated JSON
 */
export async function loadEquityBenchmarks(): Promise<EquityBenchmark[]> {
  // In production, this would load from the generated JSON
  // For now, return static data matching data/equity_benchmarks.csv
  return [
    { entityId: 'GLOBAL', entityName: 'World Average', entityType: 'global', populationMillions: 8000, co2PerCapitaTonnes: 4.7, co2TotalMt: 37400, year: 2023, sourceId: 'SRC.GCP.2024' },
    { entityId: 'CA', entityName: 'Canada', entityType: 'nation', isoCode: 'CAN', populationMillions: 39, co2PerCapitaTonnes: 14.2, co2TotalMt: 554, consumptionCo2PerCapita: 15.8, productionCo2PerCapita: 14.2, year: 2023, sourceId: 'SRC.ECCC.NIR.2025' },
    { entityId: 'USA', entityName: 'United States', entityType: 'nation', isoCode: 'USA', populationMillions: 336, co2PerCapitaTonnes: 13.4, co2TotalMt: 4500, consumptionCo2PerCapita: 15.2, productionCo2PerCapita: 13.4, year: 2023, sourceId: 'SRC.EPA.GHG.2024' },
    { entityId: 'EU27', entityName: 'European Union (27)', entityType: 'bloc', populationMillions: 448, co2PerCapitaTonnes: 5.8, co2TotalMt: 2600, consumptionCo2PerCapita: 7.2, productionCo2PerCapita: 5.8, year: 2023, sourceId: 'SRC.EEA.2024' },
    { entityId: 'CHN', entityName: 'China', entityType: 'nation', isoCode: 'CHN', populationMillions: 1412, co2PerCapitaTonnes: 8.1, co2TotalMt: 11400, consumptionCo2PerCapita: 7.1, productionCo2PerCapita: 8.1, year: 2023, sourceId: 'SRC.CN.GCP.2024' },
    { entityId: 'IND', entityName: 'India', entityType: 'nation', isoCode: 'IND', populationMillions: 1428, co2PerCapitaTonnes: 2.0, co2TotalMt: 2800, consumptionCo2PerCapita: 1.9, productionCo2PerCapita: 2.0, year: 2023, sourceId: 'SRC.IN.GCP.2024' },
    { entityId: 'JPN', entityName: 'Japan', entityType: 'nation', isoCode: 'JPN', populationMillions: 123, co2PerCapitaTonnes: 8.5, co2TotalMt: 1040, consumptionCo2PerCapita: 10.2, productionCo2PerCapita: 8.5, year: 2023, sourceId: 'SRC.JP.GCP.2024' },
    { entityId: 'AUS', entityName: 'Australia', entityType: 'nation', isoCode: 'AUS', populationMillions: 26, co2PerCapitaTonnes: 14.5, co2TotalMt: 380, consumptionCo2PerCapita: 16.1, productionCo2PerCapita: 14.5, year: 2023, sourceId: 'SRC.AU.GCP.2024' },
    { entityId: 'LDC', entityName: 'Least Developed Countries', entityType: 'group', populationMillions: 1000, co2PerCapitaTonnes: 0.3, co2TotalMt: 300, year: 2023, sourceId: 'SRC.UN.LDC.2024' },
    { entityId: 'ANNEX_I', entityName: 'Annex I Countries', entityType: 'group', populationMillions: 1300, co2PerCapitaTonnes: 9.8, co2TotalMt: 12700, consumptionCo2PerCapita: 11.2, productionCo2PerCapita: 9.8, year: 2023, sourceId: 'SRC.UNFCCC.2024' },
    { entityId: 'NON_ANNEX_I', entityName: 'Non-Annex I Countries', entityType: 'group', populationMillions: 6700, co2PerCapitaTonnes: 3.2, co2TotalMt: 21400, consumptionCo2PerCapita: 3.1, productionCo2PerCapita: 3.2, year: 2023, sourceId: 'SRC.UNFCCC.2024' },
  ]
}

/**
 * Generate equity context text for display
 */
export function generateEquityContext(result: EquityResult, accounting: AccountingMethod): string[] {
  const lines: string[] = []

  lines.push(`Your footprint: ${yourTonnesToString(result.yourAnnualTonnes)} CO₂e/year`)

  if (result.ratioTo1_5C > 1) {
    lines.push(`⚠️ ${result.ratioTo1_5C.toFixed(1)}× the 1.5°C fair share (${yourTonnesToString(result.fairShare1_5C)}/year)`)
  } else {
    lines.push(`✅ ${(1/result.ratioTo1_5C).toFixed(1)}× below 1.5°C fair share`)
  }

  if (result.yearsOfFairShareUsed > 1) {
    lines.push(`One year of your emissions = ${result.yearsOfFairShareUsed.toFixed(1)} years of 1.5°C carbon budget`)
  }

  lines.push(`Global percentile: Top ${100 - result.percentile}% (you emit more than ~${result.percentile}% of people)`)

  // Add key comparisons
  const canada = result.comparisons.find((c) => c.benchmark.entityId === 'CA')
  const global = result.comparisons.find((c) => c.benchmark.entityId === 'GLOBAL')
  const ldc = result.comparisons.find((c) => c.benchmark.entityId === 'LDC')

  if (canada) {
    lines.push(`${canada.ratio > 1 ? 'Above' : 'Below'} Canada avg by ${Math.abs(canada.difference).toFixed(1)} tCO₂e`)
  }
  if (global) {
    lines.push(`${global.ratio > 1 ? 'Above' : 'Below'} global avg by ${Math.abs(global.difference).toFixed(1)} tCO₂e`)
  }
  if (ldc) {
    lines.push(`${ldc.ratio.toFixed(0)}× the LDC average (${ldc.benchmark.entityName})`)
  }

  if (accounting === 'consumption') {
    lines.push('*Consumption-based accounting (includes imported emissions)*')
  } else {
    lines.push('*Production-based accounting (territorial emissions only)*')
  }

  return lines
}

function yourTonnesToString(tonnes: number): string {
  if (tonnes >= 1) return `${tonnes.toFixed(1)} t`
  return `${(tonnes * 1000).toFixed(0)} kg`
}