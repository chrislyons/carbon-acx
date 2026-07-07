'use client'

import { useEffect, useState, Suspense } from 'react'
import { TrendChart, TrendsSkeleton } from '@/components/charts/TrendChart'
import { processGridIntensityTrends, GridIntensitySeries } from '@/lib/gridTrends'

const GRID_INTENSITY_CSV = `region_code,region,scope_boundary,gwp_horizon,vintage_year,g_per_kwh,g_per_kwh_low,g_per_kwh_high,source_id
CA,CA,Operational electricity,GWP100 (AR6),2024,,,,SRC.CER.2024
CA-ON,CA-ON,Operational electricity,GWP100 (AR6),2024,28,,,SRC.IESO.POWERDATA.2025
CA-ON,CA-ON,Operational electricity,GWP100 (AR6),2025,27,,,SRC.IESO.POWERDATA.2025
CA-QC,CA-QC,Operational electricity,GWP100 (AR6),2021,1.5,,,SRC.ECCC.NIR.2025
CA-QC,CA-QC,Operational electricity,GWP100 (AR6),2022,1.4,,,SRC.ECCC.NIR.2025
CA-QC,CA-QC,Operational electricity,GWP100 (AR6),2023,1.3,,,SRC.ECCC.NIR.2025
CA-QC,CA-QC,Operational electricity,GWP100 (AR6),2024,1.2,,,SRC.CER.QC.2024
CA-QC,CA-QC,Operational electricity,GWP100 (AR6),2025,1.1,,,SRC.ECCC.NIR.2025
CA-AB,CA-AB,Operational electricity,GWP100 (AR6),2021,610,,,SRC.ECCC.NIR.2025
CA-AB,CA-AB,Operational electricity,GWP100 (AR6),2022,600,,,SRC.ECCC.NIR.2025
CA-AB,CA-AB,Operational electricity,GWP100 (AR6),2023,580,,,SRC.ECCC.NIR.2025
CA-AB,CA-AB,Operational electricity,GWP100 (AR6),2024,550,,,SRC.CER.AB.2024
CA-AB,CA-AB,Operational electricity,GWP100 (AR6),2025,540,,,SRC.ECCC.NIR.2025
CA-BC,CA-BC,Operational electricity,GWP100 (AR6),2021,12,,,SRC.ECCC.NIR.2025
CA-BC,CA-BC,Operational electricity,GWP100 (AR6),2022,11,,,SRC.ECCC.NIR.2025
CA-BC,CA-BC,Operational electricity,GWP100 (AR6),2023,10,,,SRC.ECCC.NIR.2025
CA-BC,CA-BC,Operational electricity,GWP100 (AR6),2024,9,,,SRC.CER.BC.2024
CA-BC,CA-BC,Operational electricity,GWP100 (AR6),2025,8,,,SRC.ECCC.NIR.2025`

export default function TrendsPage() {
  const [series, setSeries] = useState<ReturnType<typeof processGridIntensityTrends> | null>(null)
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['CA-ON', 'CA-QC', 'CA-BC', 'CA-AB'])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const processed = processGridIntensityTrends(GRID_INTENSITY_CSV)
    setSeries(processed)
    setLoading(false)
  }, [])

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    )
  }

  if (loading || !series) {
    return <TrendsSkeleton />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Grid Intensity Trends
        </h1>
        <p className="text-foreground-muted">
          Regional electricity grid carbon intensity over time. Lower is cleaner.
        </p>
      </div>

      {/* Context */}
      <div className="mb-6 p-4 bg-background-elevated border border-surface-border rounded-lg">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Understanding Grid Intensity
        </h2>
        <p className="text-sm text-foreground-muted mb-2">
          Grid intensity measures grams of CO₂ equivalent emitted per kilowatt-hour of electricity generated.
          It varies dramatically by region based on the energy mix (hydro, nuclear, gas, coal, renewables).
        </p>
        <p className="text-sm text-foreground-muted">
          These trends directly affect the carbon footprint of grid-indexed activities in your calculator —
          EV charging, heat pumps, data centers, and any electric load.
        </p>
      </div>

      {/* Chart */}
      <div className="surface-card">
        <TrendChart
          series={series}
          selectedRegions={selectedRegions}
          onRegionToggle={toggleRegion}
        />
      </div>

      {/* Methodology */}
      <div className="mt-8 surface-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Data Sources & Methodology
        </h2>
        <div className="space-y-2 text-sm text-foreground-muted">
          <p>
            <strong>Canada Nationwide:</strong> Environment and Climate Change Canada (ECCC) National Inventory Report 2025.
          </p>
          <p>
            <strong>Ontario:</strong> Independent Electricity System Operator (IESO) Power Data 2024-2025.
          </p>
          <p>
            <strong>Québec:</strong> ECCC NIR 2025 (historical) + Canada Energy Regulator (CER) 2024.
          </p>
          <p>
            <strong>Alberta:</strong> ECCC NIR 2025 (historical) + CER Alberta 2024.
          </p>
          <p>
            <strong>British Columbia:</strong> ECCC NIR 2025 (historical) + CER BC 2024.
          </p>
          <p>
            All values use IPCC AR6 GWP100. Operational electricity boundary includes generation + transmission losses.
          </p>
        </div>
      </div>

      {/* Key Insights */}
      <div className="mt-8 surface-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Key Insights
        </h2>
        <ul className="space-y-3 text-sm text-foreground-muted">
          <li className="flex items-start gap-2">
            <span className="text-success mt-0.5">✓</span>
            <span>Québec and BC maintain ultra-low intensity (&lt; 1.5 gCO₂/kWh) via &gt;90% hydroelectricity.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-warning mt-0.5">△</span>
            <span>Alberta declining from 610 → 540 gCO₂/kWh (2021-2025) due to coal phaseout and renewables growth.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success mt-0.5">✓</span>
            <span>Ontario stable at ~27-28 gCO₂/kWh with nuclear baseload + growing renewables.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-warning mt-0.5">△</span>
            <span>National average dragged up by Alberta; masking progress in other provinces.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}