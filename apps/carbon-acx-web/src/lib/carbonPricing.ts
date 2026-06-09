// Carbon Pricing Data Types and Functions

export interface CarbonPrice {
  jurisdiction: string
  priceUsdPerTonne: number
  currency: string
  priceLocal: number
  year: number
  sourceId: string
  notes?: string
  schemeType: 'ETS' | 'Carbon Tax' | 'Carbon Tax + ETS'
}

export interface CarbonPricingComparison {
  jurisdiction: string
  priceUsdPerTonne: number
  schemeType: string
  yourCost: number // Cost for user's emissions at this price
}

// Canadian federal carbon price trajectory
export const CANADIAN_CARBON_PRICE_TRAJECTORY: { year: number; priceCadPerTonne: number }[] = [
  { year: 2023, priceCadPerTonne: 65 },
  { year: 2024, priceCadPerTonne: 80 },
  { year: 2025, priceCadPerTonne: 95 },
  { year: 2026, priceCadPerTonne: 110 },
  { year: 2027, priceCadPerTonne: 125 },
  { year: 2028, priceCadPerTonne: 140 },
  { year: 2029, priceCadPerTonne: 155 },
  { year: 2030, priceCadPerTonne: 170 },
]

// EU ETS price scenarios
export const EU_ETS_SCENARIOS = {
  current: 75, // EUR/t
  '2030_low': 85,
  '2030_central': 120,
  '2030_high': 180,
}

// Global average social cost of carbon estimates
export const SOCIAL_COST_OF_CARBON = {
  epa_2020: 51, // USD/t (3% discount rate)
  epa_2023: 190, // USD/t (updated)
  imf: 75,
  stern: 85,
  nordhaus: 35,
}

// Convert tonnes CO2e to cost at given carbon price
export function calculateCarbonCost(tonnesCo2e: number, pricePerTonne: number): number {
  return tonnesCo2e * pricePerTonne
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Get carbon price for a jurisdiction (mock - would load from CSV in production)
export async function getCarbonPrices(): Promise<CarbonPrice[]> {
  // In production, this would load from the generated JSON
  // For now, return static data matching data/carbon_pricing.csv
  return [
    { jurisdiction: 'EU ETS', priceUsdPerTonne: 75, currency: 'EUR', priceLocal: 68, year: 2024, sourceId: 'SRC.ICAP.2024', schemeType: 'ETS' },
    { jurisdiction: 'Canada Federal', priceUsdPerTonne: 65, currency: 'CAD', priceLocal: 85, year: 2024, sourceId: 'SRC.ECCC.NIR.2025', schemeType: 'Carbon Tax' },
    { jurisdiction: 'British Columbia', priceUsdPerTonne: 45, currency: 'CAD', priceLocal: 65, year: 2024, sourceId: 'SRC.BC.CARBON.2024', schemeType: 'Carbon Tax' },
    { jurisdiction: 'Quebec', priceUsdPerTonne: 45, currency: 'CAD', priceLocal: 55, year: 2024, sourceId: 'SRC.QC.CAPANDTRADE.2024', schemeType: 'ETS' },
    { jurisdiction: 'California', priceUsdPerTonne: 35, currency: 'USD', priceLocal: 35, year: 2024, sourceId: 'SRC.CA.CAPANDTRADE.2024', schemeType: 'ETS' },
    { jurisdiction: 'Washington', priceUsdPerTonne: 30, currency: 'USD', priceLocal: 30, year: 2024, sourceId: 'SRC.WA.CCA.2024', schemeType: 'ETS' },
    { jurisdiction: 'RGGI (US Northeast)', priceUsdPerTonne: 15, currency: 'USD', priceLocal: 15, year: 2024, sourceId: 'SRC.RGGI.2024', schemeType: 'ETS' },
    { jurisdiction: 'Sweden', priceUsdPerTonne: 120, currency: 'SEK', priceLocal: 1250, year: 2024, sourceId: 'SRC.SE.CARBON.2024', schemeType: 'Carbon Tax' },
    { jurisdiction: 'UK ETS', priceUsdPerTonne: 65, currency: 'GBP', priceLocal: 52, year: 2024, sourceId: 'SRC.UK.ETS.2024', schemeType: 'ETS' },
    { jurisdiction: 'Switzerland', priceUsdPerTonne: 80, currency: 'CHF', priceLocal: 72, year: 2024, sourceId: 'SRC.CH.CARBON.2024', schemeType: 'ETS' },
    { jurisdiction: 'China National ETS', priceUsdPerTonne: 10, currency: 'CNY', priceLocal: 70, year: 2024, sourceId: 'SRC.CN.ETS.2024', schemeType: 'ETS' },
    { jurisdiction: 'Singapore', priceUsdPerTonne: 18, currency: 'SGD', priceLocal: 25, year: 2024, sourceId: 'SRC.SG.CARBON.2024', schemeType: 'Carbon Tax' },
  ]
}

// Compare user's emissions cost across jurisdictions
export function compareCarbonCosts(tonnesCo2e: number, prices: CarbonPrice[]): CarbonPricingComparison[] {
  return prices.map((price) => ({
    jurisdiction: price.jurisdiction,
    priceUsdPerTonne: price.priceUsdPerTonne,
    schemeType: price.schemeType,
    yourCost: calculateCarbonCost(tonnesCo2e, price.priceUsdPerTonne),
  }))
}