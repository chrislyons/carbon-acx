'use client'

import { useEffect, useState } from 'react'
import type { EquityBenchmark } from '@/lib/equity'
import { calculateEquity, generateEquityContext, loadEquityBenchmarks } from '@/lib/equity'

interface EquityComparisonResult {
  benchmark: EquityBenchmark
  yourTonnes: number
  ratio: number
  difference: number
}

interface EquityComparisonProps {
  tonnesCo2e: number
  accountingMethod?: 'production' | 'consumption'
}

function getRatioLabel(ratio: number): string {
  if (ratio < 0.5) return 'Far below'
  if (ratio < 1) return 'Below'
  if (ratio < 2) return 'Above'
  if (ratio < 5) return 'Well above'
  return 'Far above'
}

function getRatioColor(isAbove: string): string {
  return isAbove ? 'var(--accent-warning)' : 'var(--accent-secondary)'
}

export function EquityComparisonDisplay({ tonnesCo2e, accountingMethod = 'production' }: EquityComparisonProps) {
  const [benchmarks, setBenchmarks] = useState<EquityBenchmark[]>([])
  const [equityResult, setEquityResult] = useState<ReturnType<typeof calculateEquity> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await loadEquityBenchmarks()
        setBenchmarks(data)
        const result = calculateEquity(tonnesCo2e, data, accountingMethod)
        setEquityResult(result)
      } catch (error) {
        console.error('Failed to load equity data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [tonnesCo2e, accountingMethod])

  if (loading || !equityResult) {
    return (
      <div className="surface-card animate-pulse">
        <div className="h-6 bg-surface-border rounded w-48 mb-4" />
        <div className="h-4 bg-surface-border rounded w-full mb-2" />
        <div className="h-4 bg-surface-border rounded w-3/4" />
      </div>
    )
  }

  const { comparisons } = equityResult

  // Filter to key benchmarks for display
  const keyBenchmarks = ['GLOBAL', 'CA', 'USA', 'EU27', 'CHN', 'IND', 'LDC', 'ANNEX_I', 'NON_ANNEX_I']
  const keyComparisons = comparisons.filter((c) => keyBenchmarks.includes(c.benchmark.entityId))

  return (
    <div className="surface-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Global Equity Context
        </h3>
        <label className="flex items-center gap-2 text-sm text-foreground-muted cursor-pointer">
          <input
            type="checkbox"
            checked={accountingMethod === 'consumption'}
            onChange={(e) => {}}
            className="rounded border-surface-border-strong"
            disabled
          />
          Consumption-based
        </label>
      </div>

      <p className="text-sm text-foreground-muted mb-4">
        Your annual footprint compared to per-capita emissions worldwide.
        <a
          href="https://www.globalcarbonproject.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="quiet-link underline ml-1"
        >
          Source: Global Carbon Project 2024
        </a>
      </p>

      {/* Fair Share Summary */}
      <div className="mb-6 p-3 bg-background-elevated border border-surface-border rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="font-mono text-2xl text-foreground">
              {equityResult.fairShare1_5C.toFixed(1)} t
            </div>
            <div className="text-xs text-foreground-muted">1.5°C Fair Share / yr</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-2xl text-foreground">
              {equityResult.fairShare2C.toFixed(1)} t
            </div>
            <div className="text-xs text-foreground-muted">2.0°C Fair Share / yr</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <span className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-full ${
              equityResult.ratioTo1_5C > 1 ? 'bg-error' : 'bg-success'
            }`} aria-hidden="true" />
            {equityResult.ratioTo1_5C > 1
              ? `${equityResult.ratioTo1_5C.toFixed(1)}× above 1.5°C fair share`
              : `${(1 / equityResult.ratioTo1_5C).toFixed(1)}× below 1.5°C fair share`}
          </span>
          <span className="text-foreground-subtle">|</span>
          <span className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-full ${
              equityResult.ratioTo2C > 1 ? 'bg-warning' : 'bg-success'
            }`} aria-hidden="true" />
            {equityResult.ratioTo2C > 1
              ? `${equityResult.ratioTo2C.toFixed(1)}× above 2.0°C fair share`
              : `${(1 / equityResult.ratioTo2C).toFixed(1)}× below 2.0°C fair share`}
          </span>
        </div>
        {equityResult.yearsOfFairShareUsed > 1 && (
          <div className="mt-2 text-sm text-warning text-center">
            ⚠️ One year of your emissions uses {equityResult.yearsOfFairShareUsed.toFixed(1)} years of the 1.5°C carbon budget.
          </div>
        )}
      </div>

      {/* Global Percentile */}
      <div className="mb-6 p-3 bg-background-elevated border border-surface-border rounded-lg text-center">
        <div className="text-3xl font-bold text-foreground font-mono mb-1">
          {equityResult.percentile}${'\u{202F}'}th percentile
        </div>
        <div className="text-sm text-foreground-muted">
          You emit more than ~{equityResult.percentile}% of people globally
        </div>
        <div className="h-2 bg-surface-border rounded-full overflow-hidden mt-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-error via-warning to-success"
            style={{ width: `${equityResult.percentile}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-foreground-muted mt-1">
          <span>Low emitters</span>
          <span>High emitters</span>
        </div>
      </div>

      {/* Key Comparisons Table */}
      <div className="space-y-2">
        {keyComparisons.map((comparison) => {
          const ratio = comparison.ratio
          const isAbove = ratio > 1
          const ratioLabel = getRatioLabel(ratio)

          return (
            <div
              key={comparison.benchmark.entityId}
              className="flex items-center gap-3 p-3 bg-background-elevated border border-surface-border rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {comparison.benchmark.entityName}
                  </span>
                  {comparison.benchmark.entityType === 'group' && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-surface-panel border border-surface-border text-foreground-muted">
                      Group
                    </span>
                  )}
                </div>
                <div className="text-xs text-foreground-muted font-mono">
                  {comparison.benchmark.co2PerCapitaTonnes.toFixed(1)} tCO₂e/capita
                  {comparison.benchmark.consumptionCo2PerCapita && (
                    <> (consumption: {comparison.benchmark.consumptionCo2PerCapita.toFixed(1)} t) </>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-lg text-foreground">
                  {comparison.benchmark.co2PerCapitaTonnes.toFixed(1)} t
                </div>
                <div className={`text-sm font-medium ${isAbove ? 'text-warning' : 'text-success'}`}>
                  {isAbove ? '+' : ''}{comparison.difference.toFixed(1)} t vs. you
                </div>
              </div>
              <div className="w-24 shrink-0">
                <div className="h-2 bg-surface-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ratio * 50)}%`,
                      backgroundColor: isAbove ? 'var(--accent-warning)' : 'var(--accent-secondary)',
                    }}
                  />
                </div>
                <div className="text-xs text-foreground-muted text-right mt-0.5">
                  {ratioLabel}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Context Text */}
      <div className="mt-6 p-3 bg-code-bg border border-code-border rounded-lg">
        <h4 className="font-medium text-foreground mb-2">What this means</h4>
        <div className="space-y-1 text-sm text-foreground-muted">
          {generateEquityContext(equityResult, accountingMethod).map((line, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-accent-primary shrink-0">•</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}