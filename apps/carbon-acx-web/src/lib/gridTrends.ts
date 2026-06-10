/**
 * Grid intensity time series data for trends visualization
 * Source: data/grid_intensity.csv
 */

export interface GridIntensityPoint {
  region: string
  vintageYear: number
  intensityGPerKwh: number
  intensityLowGPerKwh?: number
  intensityHighGPerKwh?: number
  sourceId: string
}

export interface GridIntensitySeries {
  region: string
  regionLabel: string
  data: GridIntensityPoint[]
  color: string
}

/**
 * Process grid intensity CSV into chart-ready series
 */
export function processGridIntensityTrends(csvData: string): GridIntensitySeries[] {
  const lines = csvData.trim().split('\n')
  const headers = lines[0].split(',')
  
  const points: GridIntensityPoint[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })
    
    const intensity = parseFloat(row.g_per_kwh)
    if (!isNaN(intensity)) {
      points.push({
        region: row.region_code,
        vintageYear: parseInt(row.vintage_year),
        intensityGPerKwh: intensity,
        intensityLowGPerKwh: row.g_per_kwh_low ? parseFloat(row.g_per_kwh_low) : undefined,
        intensityHighGPerKwh: row.g_per_kwh_high ? parseFloat(row.g_per_kwh_high) : undefined,
        sourceId: row.source_id || ''
      })
    }
  }

  // Group by region
  const regionMap = new Map<string, GridIntensityPoint[]>()
  points.forEach(p => {
    if (!regionMap.has(p.region)) regionMap.set(p.region, [])
    regionMap.get(p.region)!.push(p)
  })

  // Sort each region by year
  regionMap.forEach(pts => pts.sort((a, b) => a.vintageYear - b.vintageYear))

  // Convert to series with colors
  const regionColors: Record<string, string> = {
    'CA': '#3b82f6',
    'CA-ON': '#2563eb',
    'CA-QC': '#1d4ed8',
    'CA-BC': '#1e40af',
    'CA-AB': '#ef4444',
    'CA-MB': '#f97316',
    'CA-SK': '#f59e0b',
    'CA-NB': '#8b5cf6',
    'CA-NS': '#7c3aed',
    'CA-NL': '#ec4899',
    'CA-PE': '#d946ef',
    'CA-NT': '#14b8a6',
    'CA-NU': '#0d9488',
    'CA-YT': '#06b6d4',
    'GLOBAL': '#64748b',
  }

  const regionLabels: Record<string, string> = {
    'CA': 'Canada (National)',
    'CA-ON': 'Ontario',
    'CA-QC': 'Québec',
    'CA-BC': 'British Columbia',
    'CA-AB': 'Alberta',
    'CA-MB': 'Manitoba',
    'CA-SK': 'Saskatchewan',
    'CA-NB': 'New Brunswick',
    'CA-NS': 'Nova Scotia',
    'CA-NL': 'Newfoundland & Labrador',
    'CA-PE': 'Prince Edward Island',
    'CA-NT': 'Northwest Territories',
    'CA-NU': 'Nunavut',
    'CA-YT': 'Yukon',
    'GLOBAL': 'Global Average',
  }

  const series: GridIntensitySeries[] = []
  regionMap.forEach((pts, region) => {
    series.push({
      region,
      regionLabel: regionLabels[region] || region,
      data: pts,
      color: regionColors[region] || '#64748b',
    })
  })

  return series.sort((a, b) => a.regionLabel.localeCompare(b.regionLabel))
}

/**
 * Format intensity for display
 */
export function formatIntensity(gPerKwh: number): string {
  if (gPerKwh >= 1000) return `${(gPerKwh / 1000).toFixed(1)} kgCO₂/kWh`
  return `${gPerKwh.toFixed(1)} gCO₂/kWh`
}

/**
 * Get trend direction
 */
export function getTrendDirection(data: GridIntensityPoint[]): 'improving' | 'worsening' | 'stable' {
  if (data.length < 2) return 'stable'
  const first = data[0].intensityGPerKwh
  const last = data[data.length - 1].intensityGPerKwh
  const change = ((last - first) / first) * 100
  if (change < -5) return 'improving'
  if (change > 5) return 'worsening'
  return 'stable'
}