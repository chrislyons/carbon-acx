'use client'

import { useState, useEffect } from 'react'
import { PolicyScenario, PolicyScenarioId, getAllScenarios, applyScenarioToFactor, getScenario } from '@/lib/policyScenarios'
import type { ActivityProvenance } from '@/lib/calculator'

interface PolicyScenarioSelectorProps {
  selectedScenarioId: string
  onChange: (scenarioId: string) => void
  activities: Array<{
    id: string
    name: string
    emissionFactor: number
    isGridIndexed: boolean
    electricityKwhPerUnit: number | null
    provenance: ActivityProvenance | undefined
  }>
  regionCode: string
  targetYear: number
}

export function PolicyScenarioSelector({
  selectedScenarioId,
  onChange,
  activities,
  regionCode,
  targetYear,
}: PolicyScenarioSelectorProps) {
  const scenarios = getAllScenarios()
  const [scenarioDetails, setScenarioDetails] = useState<{
    totalEmissions: number
    totalCost: number
    gridIndexedCount: number
    fixedCount: number
  } | null>(null)

  useEffect(() => {
    const scenario = getScenario(selectedScenarioId as PolicyScenarioId)
    let totalEmissions = 0
    let gridIndexedCount = 0
    let fixedCount = 0

    for (const activity of activities) {
      const currentGridIntensity = activity.provenance?.gridIntensityRegion
        ? 28 // Would look up actual value
        : 0
      const result = applyScenarioToFactor(
        activity.emissionFactor,
        activity.isGridIndexed,
        activity.electricityKwhPerUnit,
        regionCode,
        currentGridIntensity,
        scenario,
        targetYear
      )
      totalEmissions += result.adjustedFactor
      if (activity.isGridIndexed) {
        gridIndexedCount++
      } else {
        fixedCount++
      }
    }

    const carbonPrice = scenario.carbonPriceUsdPerTonne(targetYear)
    const totalCost = totalEmissions * carbonPrice

    setScenarioDetails({
      totalEmissions,
      totalCost,
      gridIndexedCount,
      fixedCount,
    })
  }, [selectedScenarioId, activities, regionCode, targetYear])

  return (
    <div className="surface-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Policy Scenario
      </h3>
      <p className="text-sm text-foreground-muted mb-4">
        Model how different climate policies affect your footprint calculation and cost.
      </p>

      <div className="space-y-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onChange(scenario.id)}
            className={`w-full text-left p-4 rounded-lg border transition-all ${
              selectedScenarioId === scenario.id
                ? 'border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary/20'
                : 'border-surface-border hover:border-surface-border-strong hover:bg-background-hover'
            }`}
            aria-pressed={selectedScenarioId === scenario.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{scenario.name}</div>
                <div className="text-sm text-foreground-muted mt-1">{scenario.description}</div>
                <div className="text-xs text-foreground-subtle mt-2 font-mono">{scenario.notes}</div>
              </div>
              {selectedScenarioId === scenario.id && (
                <svg className="w-5 h-5 text-accent-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      {scenarioDetails && (
        <div className="mt-4 p-3 bg-background-elevated border border-surface-border rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="font-mono text-lg text-foreground">
                {scenarioDetails.totalEmissions.toFixed(2)} tCO₂e
              </div>
              <div className="text-xs text-foreground-muted">Projected Emissions</div>
            </div>
            <div>
              <div className="font-mono text-lg text-foreground">
                ${scenarioDetails.totalCost.toLocaleString()}
              </div>
              <div className="text-xs text-foreground-muted">Annual Carbon Cost</div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-3 text-sm text-foreground-muted">
            <span>{scenarioDetails.gridIndexedCount} grid-indexed activities</span>
            <span>{scenarioDetails.fixedCount} fixed-factor activities</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Target year selector
interface TargetYearSelectorProps {
  selectedYear: number
  onChange: (year: number) => void
  minYear?: number
  maxYear?: number
}

export function TargetYearSelector({
  selectedYear,
  onChange,
  minYear = 2024,
  maxYear = 2050,
}: TargetYearSelectorProps) {
  return (
    <div className="surface-card">
      <label className="block text-sm font-medium text-foreground mb-2">
        Projection Year
      </label>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={minYear}
          max={maxYear}
          value={selectedYear}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 accent-accent-primary"
          aria-label="Projection year"
        />
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-lg text-foreground min-w-[4rem] text-right">{selectedYear}</span>
          <output className="text-sm text-foreground-muted">
            {selectedYear === 2024 ? ' (Current)' : selectedYear > 2030 ? ' (Long-term)' : ' (Near-term)'}
          </output>
        </div>
      </div>
      <div className="flex justify-between text-xs text-foreground-muted mt-1">
        <span>{minYear}</span>
        <span>{maxYear}</span>
      </div>
    </div>
  )
}