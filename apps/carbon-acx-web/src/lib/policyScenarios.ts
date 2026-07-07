// Policy Scenarios for Carbon Calculator

export type PolicyScenarioId = 'current' | 'netZero2050' | 'carbonPriceRamp' | 'rapidGridDecarb' | 'businessAsUsual'

export interface PolicyScenario {
  id: PolicyScenarioId
  name: string
  description: string
  gridIntensityMultiplier: (regionCode: string, currentIntensity: number, year: number) => number
  carbonPriceUsdPerTonne: (year: number) => number
  notes: string
}

// Grid intensity reduction pathways by region
const GRID_DECARB_PATHWAYS: Record<string, { current: number; target2030: number; target2035: number; target2050: number }> = {
  'CA-ON': { current: 28, target2030: 10, target2035: 5, target2050: 0 },
  'CA-QC': { current: 1.2, target2030: 0.5, target2035: 0.2, target2050: 0 },
  'CA-BC': { current: 8, target2030: 2, target2035: 1, target2050: 0 },
  'CA-AB': { current: 550, target2030: 300, target2035: 200, target2050: 0 },
  'CA': { current: 110, target2030: 40, target2035: 20, target2050: 0 },
  'GLOBAL': { current: 475, target2030: 300, target2035: 200, target2050: 50 },
}

function interpolateGridIntensity(
  regionCode: string,
  year: number,
  scenario: 'current' | 'netZero2050' | 'rapidGridDecarb'
): number {
  const pathway = GRID_DECARB_PATHWAYS[regionCode] || GRID_DECARB_PATHWAYS['GLOBAL']
  const currentYear = 2024

  if (scenario === 'current') {
    return pathway.current
  }

  if (year <= currentYear) return pathway.current

  if (scenario === 'netZero2050') {
    // Linear to net-zero by 2050
    const progress = Math.min((year - currentYear) / (2050 - currentYear), 1)
    return pathway.current * (1 - progress)
  }

  if (scenario === 'rapidGridDecarb') {
    // Faster: net-zero by 2035 for developed, 2050 for developing
    const isDeveloped = ['CA-ON', 'CA-QC', 'CA-BC', 'CA'].includes(regionCode)
    const targetYear = isDeveloped ? 2035 : 2050
    const progress = Math.min((year - currentYear) / (targetYear - currentYear), 1)
    const target = isDeveloped ? 0 : pathway.target2050
    return pathway.current * (1 - progress) + target * progress
  }

  return pathway.current
}

export const POLICY_SCENARIOS: Record<PolicyScenarioId, PolicyScenario> = {
  current: {
    id: 'current',
    name: 'Current Policy Trajectory',
    description: 'Based on existing government commitments and announced policies as of 2024.',
    gridIntensityMultiplier: (regionCode, currentIntensity, year) => {
      const projected = interpolateGridIntensity(regionCode, year, 'current')
      return currentIntensity > 0 ? projected / currentIntensity : 1
    },
    carbonPriceUsdPerTonne: (year) => {
      if (year <= 2024) return 65 // Canada federal
      if (year <= 2030) return 65 + (year - 2024) * 15 // Rising to $170 by 2030
      return 170
    },
    notes: 'Canada federal carbon price rises $15/yr to $170/t by 2030. Grid intensity stays at current levels.',
  },

  netZero2050: {
    id: 'netZero2050',
    name: 'Net-Zero by 2050 (IEA NZE)',
    description: 'IEA Net Zero Emissions by 2050 pathway: aggressive grid decarbonization, rising carbon prices.',
    gridIntensityMultiplier: (regionCode, currentIntensity, year) => {
      const projected = interpolateGridIntensity(regionCode, year, 'netZero2050')
      return currentIntensity > 0 ? projected / currentIntensity : 1
    },
    carbonPriceUsdPerTonne: (year) => {
      if (year <= 2024) return 75
      if (year <= 2030) return 75 + (year - 2024) * 25 // ~$225 by 2030
      if (year <= 2035) return 225 + (year - 2030) * 25 // ~$350 by 2035
      if (year <= 2050) return 350 + (year - 2035) * 10 // ~$500 by 2050
      return 500
    },
    notes: 'Grid reaches net-zero by 2050. Carbon price reaches $225/t by 2030, $500/t by 2050. Based on IEA NZE 2023.',
  },

  rapidGridDecarb: {
    id: 'rapidGridDecarb',
    name: 'Rapid Grid Decarbonization',
    description: 'Developed regions reach net-zero electricity by 2035; developing by 2050. Moderate carbon price.',
    gridIntensityMultiplier: (regionCode, currentIntensity, year) => {
      const projected = interpolateGridIntensity(regionCode, year, 'rapidGridDecarb')
      return currentIntensity > 0 ? projected / currentIntensity : 1
    },
    carbonPriceUsdPerTonne: (year) => {
      if (year <= 2024) return 50
      if (year <= 2030) return 50 + (year - 2024) * 20 // ~$170 by 2030
      if (year <= 2035) return 170 + (year - 2030) * 10 // ~$220 by 2035
      return 250
    },
    notes: 'OECD grids net-zero by 2035. Carbon price lower than NZE but grid cleaner faster.',
  },

  carbonPriceRamp: {
    id: 'carbonPriceRamp',
    name: 'Carbon Price Ramp ($50→$250 by 2035)',
    description: 'Economy-wide carbon price rising steadily regardless of grid changes. Tests price sensitivity.',
    gridIntensityMultiplier: (regionCode, currentIntensity, year) => 1, // No grid change
    carbonPriceUsdPerTonne: (year) => {
      if (year <= 2024) return 50
      if (year <= 2035) return 50 + (year - 2024) * 16.67 // ~$250 by 2035
      return 250
    },
    notes: 'Grid intensity unchanged. Pure carbon price signal. Good for understanding marginal abatement cost curves.',
  },

  businessAsUsual: {
    id: 'businessAsUsual',
    name: 'Business as Usual (No New Policy)',
    description: 'No new climate policies beyond 2024. Grid intensity and carbon prices frozen.',
    gridIntensityMultiplier: (regionCode, currentIntensity, year) => 1,
    carbonPriceUsdPerTonne: (year) => 65, // Frozen at 2024 Canada federal
    notes: 'Frozen at 2024 levels. Shows impact of policy inaction. Not a prediction.',
  },
}

export function getScenario(id: PolicyScenarioId): PolicyScenario {
  return POLICY_SCENARIOS[id] || POLICY_SCENARIOS.current
}

export function getAllScenarios(): PolicyScenario[] {
  return Object.values(POLICY_SCENARIOS)
}

/**
 * Apply a policy scenario to an emission factor.
 * For grid-indexed factors, adjusts based on projected grid intensity.
 * For fixed factors, returns unchanged (unless carbon price affects them).
 */
export function applyScenarioToFactor(
  factorGPerUnit: number,
  isGridIndexed: boolean,
  electricityKwhPerUnit: number | null,
  regionCode: string,
  currentGridIntensity: number,
  scenario: PolicyScenario,
  targetYear: number
): { adjustedFactor: number; adjustedGridIntensity: number; carbonPrice: number } {
  const carbonPrice = scenario.carbonPriceUsdPerTonne(targetYear)

  if (isGridIndexed && electricityKwhPerUnit) {
    const multiplier = scenario.gridIntensityMultiplier(regionCode, currentGridIntensity, targetYear)
    const adjustedGridIntensity = currentGridIntensity * multiplier
    const adjustedFactor = (electricityKwhPerUnit * adjustedGridIntensity) / 1000 // Convert g to kg
    return { adjustedFactor, adjustedGridIntensity, carbonPrice }
  }

  // Fixed emission factor - no grid change, but we still return carbon price for cost calc
  return {
    adjustedFactor: factorGPerUnit / 1000, // Convert g to kg
    adjustedGridIntensity: currentGridIntensity,
    carbonPrice,
  }
}

/**
 * Calculate emissions cost under a scenario
 */
export function calculateScenarioCost(
  tonnesCo2e: number,
  scenario: PolicyScenario,
  year: number
): number {
  const price = scenario.carbonPriceUsdPerTonne(year)
  return tonnesCo2e * price
}