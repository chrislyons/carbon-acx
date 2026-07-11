'use client'

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ACTIVITIES,
  CATEGORY_INFO,
  DEFAULT_BENCHMARK_KEY,
  calculateEmissions,
  comparisonToBenchmark,
  formatEmissions,
  getBenchmark,
  getBenchmarkOptions,
  getActivitiesByCategory,
  type ActivityCategory,
  type CalculatorInput,
  type CalculatorSummary,
  type Activity,
} from '@/lib/calculator'
import { CitationDrawer } from '@/components/calculator/CitationDrawer'
import { CustomActivityModal } from '@/components/calculator/CustomActivityModal'
import { CarbonPricingChart } from '@/components/calculator/CarbonPricingChart'
import { PolicyScenarioSelector, TargetYearSelector } from '@/components/calculator/PolicyScenarioSelector'
import { EquityComparisonDisplay } from '@/components/calculator/EquityComparison'
import { getShortCitation, getProvenanceSummary, formatIEEECitation } from '@/lib/ieeeCitations'
import { compareCarbonCosts } from '@/lib/carbonPricing'
import type { ActivityProvenance } from '@/lib/calculator'
import { PolicyScenario, getScenario } from '@/lib/policyScenarios'

const STORAGE_KEY = 'carbon-acx-calculator-inputs'
const CUSTOM_ACTIVITIES_KEY = 'carbon-acx-custom-activities'

type Step = 'input' | 'results'

// Encode inputs to a compact URL-safe string
function encodeInputs(inputs: Record<string, number>): string {
  const entries = Object.entries(inputs).filter(([_, v]) => v > 0)
  if (entries.length === 0) return ''
  const data = entries.map(([k, v]) => `${k}:${v}`).join(',')
  return btoa(data)
}

// Decode inputs from URL string
function decodeInputs(encoded: string): Record<string, number> {
  try {
    const data = atob(encoded)
    const result: Record<string, number> = {}
    data.split(',').forEach((pair) => {
      const [key, val] = pair.split(':')
      const num = parseFloat(val)
      if (key && !isNaN(num) && num > 0) {
        result[key] = num
      }
    })
    return result
  } catch {
    return {}
  }
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={<CalculatorSkeleton />}>
      <CalculatorContent />
    </Suspense>
  )
}

function CalculatorSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse space-y-6">
        <div>
          <div className="h-8 bg-surface-border rounded w-48 mb-2" />
          <div className="h-4 bg-surface-border rounded w-64" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-surface-border rounded-lg w-24" />
          ))}
        </div>
        <div className="surface-card">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-surface-border rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CalculatorContent() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('input')
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>('transport')
  const [inputs, setInputs] = useState<Record<string, number>>({})
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({})
  const [isLoaded, setIsLoaded] = useState(false)
  const [isShared, setIsShared] = useState(false)
  const [citationDrawerOpen, setCitationDrawerOpen] = useState(false)
  const [selectedActivityForCitation, setSelectedActivityForCitation] = useState<{
    sourceIds: string[]
    provenance?: ActivityProvenance
    name: string
  } | null>(null)
  const [customActivitiesModalOpen, setCustomActivitiesModalOpen] = useState(false)
  const [customActivities, setCustomActivities] = useState<Activity[]>([])
  const [policyScenario, setPolicyScenario] = useState<'current' | 'netZero2050' | 'rapidGridDecarb' | 'carbonPriceRamp' | 'businessAsUsual'>('current')
  const [targetYear, setTargetYear] = useState(2030)
  const [carbonPrices, setCarbonPrices] = useState<Array<{ jurisdiction: string; priceUsdPerTonne: number; schemeType: string }>>([])
  const [selectedPriceJurisdictions, setSelectedPriceJurisdictions] = useState<string[]>([])

  // Load custom activities from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_ACTIVITIES_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setCustomActivities(parsed)
        }
      }
    } catch {
      // Ignore
    }
  }, [])

  // Save custom activities to localStorage
  useEffect(() => {
    try {
      if (customActivities.length > 0) {
        localStorage.setItem(CUSTOM_ACTIVITIES_KEY, JSON.stringify(customActivities))
      } else {
        localStorage.removeItem(CUSTOM_ACTIVITIES_KEY)
      }
    } catch {
      // Ignore
    }
  }, [customActivities])

  // Load carbon prices
  useEffect(() => {
    // Static data matching data/carbon_pricing.csv
    setCarbonPrices([
      { jurisdiction: 'EU ETS', priceUsdPerTonne: 75, schemeType: 'ETS' },
      { jurisdiction: 'Canada Federal', priceUsdPerTonne: 65, schemeType: 'Carbon Tax' },
      { jurisdiction: 'British Columbia', priceUsdPerTonne: 45, schemeType: 'Carbon Tax' },
      { jurisdiction: 'Quebec', priceUsdPerTonne: 45, schemeType: 'ETS' },
      { jurisdiction: 'California', priceUsdPerTonne: 35, schemeType: 'ETS' },
      { jurisdiction: 'Washington', priceUsdPerTonne: 30, schemeType: 'ETS' },
      { jurisdiction: 'RGGI (US Northeast)', priceUsdPerTonne: 15, schemeType: 'ETS' },
      { jurisdiction: 'Sweden', priceUsdPerTonne: 120, schemeType: 'Carbon Tax' },
      { jurisdiction: 'UK ETS', priceUsdPerTonne: 65, schemeType: 'ETS' },
      { jurisdiction: 'Switzerland', priceUsdPerTonne: 80, schemeType: 'ETS' },
      { jurisdiction: 'China National ETS', priceUsdPerTonne: 10, schemeType: 'ETS' },
      { jurisdiction: 'Singapore', priceUsdPerTonne: 18, schemeType: 'Carbon Tax' },
    ])
    setSelectedPriceJurisdictions(['Canada Federal', 'EU ETS', 'California', 'Sweden'])
  }, [])

  // Load inputs from URL params or localStorage on mount
  useEffect(() => {
    const sharedData = searchParams.get('data')
    if (sharedData) {
      const decoded = decodeInputs(sharedData)
      if (Object.keys(decoded).length > 0) {
        setInputs(decoded)
        setIsShared(true)
        setStep('results')
      }
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (typeof parsed === 'object' && parsed !== null) {
            setInputs(parsed)
          }
        }
      } catch {
        // Ignore
      }
    }
    setIsLoaded(true)
  }, [searchParams])

  // Save inputs to localStorage when they change
  useEffect(() => {
    if (!isLoaded) return
    try {
      if (Object.keys(inputs).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Ignore
    }
  }, [inputs, isLoaded])

  // Combine built-in and custom activities
  const allActivities = useMemo(() => [...ACTIVITIES, ...customActivities], [customActivities])

  // Calculate results with current inputs
  const summary = useMemo(() => {
    const calculatorInputs: CalculatorInput[] = Object.entries(inputs)
      .filter(([_, qty]) => qty > 0)
      .map(([activityId, quantity]) => ({ activityId, quantity }))
    return calculateEmissions(calculatorInputs)
  }, [inputs])

  const hasInputs = Object.values(inputs).some((v) => v > 0)

  const handleInputChange = (activityId: string, value: string) => {
    const trimmed = value.trim()

    // Empty field: clear both the value and any prior error (nothing entered).
    if (trimmed === '') {
      setInputs((prev) => {
        const next = { ...prev }
        delete next[activityId]
        return next
      })
      setInputErrors((prev) => {
        if (!(activityId in prev)) return prev
        const next = { ...prev }
        delete next[activityId]
        return next
      })
      return
    }

    // Validate explicitly instead of coercing bad input to 0 — a silently
    // dropped entry is a trust bug for a carbon-accounting tool.
    const num = Number(trimmed)
    let error = ''
    if (!Number.isFinite(num)) {
      error = 'Enter a number'
    } else if (num < 0) {
      error = 'Must be zero or greater'
    }

    setInputErrors((prev) => {
      const next = { ...prev }
      if (error) {
        next[activityId] = error
      } else {
        delete next[activityId]
      }
      return next
    })

    // Only commit finite, non-negative values to the calculation.
    if (!error) {
      setInputs((prev) => ({ ...prev, [activityId]: num }))
    }
  }

  const handleReset = () => {
    setInputs({})
    setInputErrors({})
    setStep('input')
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }

  const handleAddCustomActivity = (activity: Activity) => {
    setCustomActivities((prev) => [...prev, activity])
    setCustomActivitiesModalOpen(false)
  }

  const handleOpenCitations = (activityId: string) => {
    const activity = allActivities.find((a) => a.id === activityId)
    if (activity) {
      setSelectedActivityForCitation({
        sourceIds: activity.sourceIds,
        provenance: activity.provenance,
        name: activity.name,
      })
      setCitationDrawerOpen(true)
    }
  }

  const categories = Object.keys(CATEGORY_INFO) as ActivityCategory[]

  if (step === 'results') {
    return (
      <ResultsView
        summary={summary}
        inputs={inputs}
        isShared={isShared}
        onBack={() => setStep('input')}
        onReset={handleReset}
        onOpenCitations={handleOpenCitations}
        citationDrawerOpen={citationDrawerOpen}
        onCitationDrawerClose={() => setCitationDrawerOpen(false)}
        selectedActivityForCitation={selectedActivityForCitation}
        allActivities={allActivities}
        tonnesCo2e={summary.totalEmissions / 1000000}
        carbonPrices={carbonPrices}
        selectedPriceJurisdictions={selectedPriceJurisdictions}
        onPriceSelectionChange={setSelectedPriceJurisdictions}
        policyScenario={policyScenario}
        onPolicyScenarioChange={(id) => setPolicyScenario(id as typeof policyScenario)}
        targetYear={targetYear}
        onTargetYearChange={setTargetYear}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Carbon Calculator
        </h1>
        <p className="text-foreground-muted">
          Enter your activities to calculate your carbon footprint. All factors cited with IEEE references.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2" role="tablist" aria-label="Activity categories">
        {categories.map((cat) => {
          const info = CATEGORY_INFO[cat]
          const categoryTotal = summary.byCategory[cat]
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              role="tab"
              aria-selected={activeCategory === cat}
              aria-controls={`panel-${cat}`}
              id={`tab-${cat}`}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-accent-primary text-white'
                  : 'bg-background-elevated text-foreground hover:bg-background-hover'
              }`}
            >
              <span aria-hidden="true">{info.emoji}</span>
              <span>{info.name}</span>
              {categoryTotal > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-xs rounded ${
                    activeCategory === cat
                      ? 'bg-white/20 text-white'
                      : 'bg-surface-border text-foreground-muted'
                  }`}
                >
                  {formatEmissions(categoryTotal)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Activity Inputs */}
      <div className="surface-card mb-6" role="tabpanel" id={`panel-${activeCategory}`} aria-labelledby={`tab-${activeCategory}`}>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">{CATEGORY_INFO[activeCategory].emoji}</span>
            <h2 className="text-lg font-semibold text-foreground">
              {CATEGORY_INFO[activeCategory].name}
            </h2>
          </div>
          <button
            onClick={() => setCustomActivitiesModalOpen(true)}
            className="action-link action-link-ghost text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Custom
          </button>
        </div>

        <div className="space-y-4">
          {getActivitiesByCategory(activeCategory).map((activity) => (
            <ActivityInputRow
              key={activity.id}
              activity={activity}
              value={inputs[activity.id] || ''}
              error={inputErrors[activity.id]}
              onChange={handleInputChange}
              onCitationsClick={() => handleOpenCitations(activity.id)}
            />
          ))}
          {customActivities
            .filter((a) => a.category === activeCategory)
            .map((activity) => (
              <ActivityInputRow
                key={activity.id}
                activity={activity}
                value={inputs[activity.id] || ''}
                error={inputErrors[activity.id]}
                onChange={handleInputChange}
                onCitationsClick={() => handleOpenCitations(activity.id)}
                isCustom
              />
            ))}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="surface-card flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-sm text-foreground-muted">Current Total</div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {formatEmissions(summary.totalEmissions)}
          </div>
          {summary.totalEmissions > 0 && (
            <div className="text-xs text-foreground-muted">
              CO₂ equivalent
            </div>
          )}
        </div>
        <div className="flex gap-3">
          {hasInputs && (
            <button
              onClick={handleReset}
              className="action-link action-link-ghost"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setStep('results')}
            disabled={!hasInputs}
            className={`action-link action-link-primary ${
              hasInputs ? '' : 'opacity-50 cursor-not-allowed'
            }`}
            aria-disabled={!hasInputs}
          >
            View Results →
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 surface-card border-accent-primary/30 bg-background-elevated/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-accent-primary mb-1">
              About This Calculator
            </h3>
            <p className="text-sm text-foreground-muted">
              Emission factors sourced from ECCC National Inventory Report, IPCC, EPA,
              and peer-reviewed literature. All values are CO₂ equivalent using GWP100 (AR6).
              Click the citation icon next to any activity to view full IEEE references.
              Add custom activities with your own emission factors and sources.
            </p>
          </div>
          {hasInputs && (
            <div className="flex items-center gap-1.5 text-xs text-success whitespace-nowrap">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Auto-saved
            </div>
          )}
        </div>
      </div>

      {/* Custom Activity Modal */}
      <CustomActivityModal
        isOpen={customActivitiesModalOpen}
        onClose={() => setCustomActivitiesModalOpen(false)}
        onAdd={handleAddCustomActivity}
      />

      {/* Citation Drawer */}
      <CitationDrawer
        isOpen={citationDrawerOpen}
        onClose={() => setCitationDrawerOpen(false)}
        sourceIds={selectedActivityForCitation?.sourceIds || []}
        provenance={selectedActivityForCitation?.provenance}
        title={`Sources for ${selectedActivityForCitation?.name || 'Activity'}`}
      />
    </div>
  )
}

// Activity Input Row Component
function ActivityInputRow({
  activity,
  value,
  error,
  onChange,
  onCitationsClick,
  isCustom = false,
}: {
  activity: Activity
  value: string | number
  error?: string
  onChange: (activityId: string, value: string) => void
  onCitationsClick: () => void
  isCustom?: boolean
}) {
  const provenanceInfo = activity.provenance ? getProvenanceSummary(activity.provenance) : null
  const isGridIndexed = activity.isGridIndexed || provenanceInfo?.gridIntensity !== null

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-3 border-b border-surface-border last:border-0"
    >
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{activity.name}</span>
            {isCustom && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/30">
                Custom
              </span>
            )}
            {isGridIndexed && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
                Grid-indexed
              </span>
            )}
          </div>
          {activity.description && (
            <div className="text-sm text-foreground-muted">{activity.description}</div>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-foreground-subtle font-mono">
              {formatEmissions(activity.emissionFactor)} per {activity.unit}
            </span>
            {/* Citation badges */}
            <span className="flex items-center gap-1">
              {activity.sourceIds.slice(0, 3).map((sourceId, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-surface-panel border border-surface-border text-foreground-muted hover:text-accent-primary cursor-help transition-colors"
                  title={`Source: ${sourceId}`}
                >
                  {getShortCitation(sourceId)}
                </span>
              ))}
              {activity.sourceIds.length > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-surface-panel border border-surface-border text-foreground-muted">
                  +{activity.sourceIds.length - 3}
                </span>
              )}
              <button
                onClick={onCitationsClick}
                className="ml-1 p-1 rounded hover:bg-surface-border transition-colors"
                aria-label={`View full citations for ${activity.name}`}
                title="View all sources"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </span>
          </div>
          {provenanceInfo && (
            <div className="text-xs text-foreground-subtle font-mono mt-0.5">
              EF: {provenanceInfo.emissionFactor}
              {provenanceInfo.gridIntensity && ` | Grid: ${provenanceInfo.gridIntensity}`}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 sm:w-[140px]">
        <div className="flex items-center gap-2">
          <label htmlFor={`input-${activity.id}`} className="sr-only">
            {activity.name} quantity
          </label>
          <input
            id={`input-${activity.id}`}
            type="number"
            min="0"
            step="any"
            value={value}
            onChange={(e) => onChange(activity.id, e.target.value)}
            placeholder="0"
            className={`w-full px-3 py-2 border rounded-lg text-right bg-background-elevated text-foreground focus:ring-2 focus:ring-accent-primary focus:border-accent-primary ${
              error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-surface-border-strong'
            }`}
            aria-invalid={error ? true : undefined}
            aria-describedby={`unit-${activity.id}${error ? ` error-${activity.id}` : ''}`}
          />
          <span id={`unit-${activity.id}`} className="text-sm text-foreground-muted w-16 text-right" aria-hidden="true">
            {activity.unitLabel}
          </span>
        </div>
        {error && (
          <p id={`error-${activity.id}`} role="alert" className="text-xs text-red-500 text-right">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Results View
// ============================================================================

interface ResultsViewProps {
  summary: CalculatorSummary
  inputs: Record<string, number>
  isShared: boolean
  onBack: () => void
  onReset: () => void
  onOpenCitations: (activityId: string) => void
  citationDrawerOpen: boolean
  onCitationDrawerClose: () => void
  selectedActivityForCitation: {
    sourceIds: string[]
    provenance?: ActivityProvenance
    name: string
  } | null
  allActivities: Activity[]
  tonnesCo2e: number
  carbonPrices: Array<{ jurisdiction: string; priceUsdPerTonne: number; schemeType: string }>
  selectedPriceJurisdictions: string[]
  onPriceSelectionChange: (jurisdictions: string[]) => void
  policyScenario: 'current' | 'netZero2050' | 'rapidGridDecarb' | 'carbonPriceRamp' | 'businessAsUsual'
  onPolicyScenarioChange: (scenarioId: string) => void
  targetYear: number
  onTargetYearChange: (year: number) => void
}

function ResultsView({
  summary,
  inputs,
  isShared,
  onBack,
  onReset,
  onOpenCitations,
  citationDrawerOpen,
  onCitationDrawerClose,
  selectedActivityForCitation,
  allActivities,
  tonnesCo2e,
  carbonPrices,
  selectedPriceJurisdictions,
  onPriceSelectionChange,
  policyScenario,
  onPolicyScenarioChange,
  targetYear,
  onTargetYearChange,
}: ResultsViewProps) {
  const [copied, setCopied] = useState(false)
  const [benchmarkKey, setBenchmarkKey] = useState<string>(DEFAULT_BENCHMARK_KEY)
  const benchmarkOptions = useMemo(() => getBenchmarkOptions(), [])
  const selectedBenchmark = getBenchmark(benchmarkKey) ?? benchmarkOptions[0]
  const comparisonPct = comparisonToBenchmark(summary.totalEmissions, selectedBenchmark)
  const categories = Object.keys(CATEGORY_INFO) as ActivityCategory[]

  // Sort categories by emissions for the chart
  const sortedCategories = [...categories].sort(
    (a, b) => summary.byCategory[b] - summary.byCategory[a]
  )

  const maxCategoryEmissions = Math.max(...Object.values(summary.byCategory))

  const handleShare = async () => {
    const encoded = encodeInputs(inputs)
    const url = `${window.location.origin}/calculator?data=${encoded}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Prepare activities for policy scenario selector
  const scenarioActivities = useMemo(() => {
    return summary.results.map((result) => {
      const activity = allActivities.find((a) => a.id === result.activityId)
      // Use the activity's own factor; result.quantity is guaranteed > 0 by
      // calculateEmissions, but referencing the source factor avoids the divide.
      const emissionFactor =
        activity?.emissionFactor ?? result.emissions / result.quantity
      return {
        id: result.activityId,
        name: result.activityName,
        emissionFactor,
        isGridIndexed: activity?.isGridIndexed || false,
        electricityKwhPerUnit: activity?.electricityKwhPerUnit || null,
        provenance: activity?.provenance,
      }
    })
  }, [summary.results, allActivities])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Shared Banner */}
      {isShared && (
        <div className="mb-6 p-3 surface-card border-accent-warning/30 bg-accent-warning/10" role="status" aria-live="polite">
          <p className="text-sm text-foreground">
            You&apos;re viewing a shared carbon footprint. Click &quot;Edit inputs&quot; to modify and save your own.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-foreground-muted hover:text-foreground text-sm mb-2 flex items-center gap-1 action-link action-link-ghost"
          >
            ← Edit inputs
          </button>
          <h1 className="text-3xl font-bold text-foreground">Your Carbon Footprint</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleShare}
            className="action-link"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </>
            )}
          </button>
          <button
            onClick={onReset}
            className="action-link action-link-ghost"
          >
            Start Over
          </button>
        </div>
      </div>

      {/* Total Card */}
      <div className="surface-card surface-card-accent rounded-2xl p-8 mb-8">
        <div className="text-center">
          <div className="text-5xl font-bold text-foreground font-mono mb-2">
            {formatEmissions(summary.totalEmissions)}
          </div>
          <div className="text-foreground-muted mb-4">Total CO₂ equivalent per year</div>

          {comparisonPct > 0 && (
            <div className="flex flex-col items-center gap-2">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 surface-panel rounded-full text-sm border border-surface-border"
                title={selectedBenchmark.sourceCitation ?? undefined}
              >
                <span aria-hidden="true">{comparisonPct < 100 ? '🌱' : '⚠️'}</span>
                <span>
                  {comparisonPct.toFixed(1)}% of {selectedBenchmark.label} per-capita average
                  {selectedBenchmark.year ? ` (${selectedBenchmark.year})` : ''} (
                  {formatEmissions(selectedBenchmark.annualGrams)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="benchmark-select" className="text-xs text-foreground-muted">
                  Compare against
                </label>
                <select
                  id="benchmark-select"
                  value={benchmarkKey}
                  onChange={(e) => setBenchmarkKey(e.target.value)}
                  className="text-xs px-2 py-1 rounded-md border border-surface-border bg-background-elevated text-foreground focus:ring-2 focus:ring-accent-primary"
                >
                  {benchmarkOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.scope === 'province' ? `  ${option.label}` : option.label} —{' '}
                      {option.perCapitaTonnes.toFixed(1)} t/yr
                    </option>
                  ))}
                </select>
              </div>
              {selectedBenchmark.scope === 'province' && selectedBenchmark.totalMt && (
                <p className="text-xs text-foreground-subtle">
                  {selectedBenchmark.label}: {selectedBenchmark.totalMt} Mt CO₂e ÷{' '}
                  {selectedBenchmark.populationMillions}M people (NIR territorial basis)
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Policy Scenario & Target Year */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <PolicyScenarioSelector
          selectedScenarioId={policyScenario}
          onChange={onPolicyScenarioChange}
          activities={scenarioActivities}
          regionCode="CA-ON"
          targetYear={targetYear}
        />
        <TargetYearSelector
          selectedYear={targetYear}
          onChange={onTargetYearChange}
          minYear={2024}
          maxYear={2050}
        />
      </div>

      {/* Category Breakdown */}
      <div className="surface-card mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Breakdown by Category
        </h2>
        <div className="space-y-4">
          {sortedCategories.map((cat) => {
            const info = CATEGORY_INFO[cat]
            const emissions = summary.byCategory[cat]
            const percentage = maxCategoryEmissions > 0
              ? (emissions / maxCategoryEmissions) * 100
              : 0

            if (emissions === 0) return null

            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{info.emoji}</span>
                    <span className="font-medium text-foreground">{info.name}</span>
                  </div>
                  <span className="font-semibold text-foreground font-mono">
                    {formatEmissions(emissions)}
                  </span>
                </div>
                <div className="h-3 bg-surface-border rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(percentage)} aria-valuemin={0} aria-valuemax={100} aria-label={`${info.name} emissions percentage`}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: info.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Activity Details */}
      <div className="surface-card mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Activity Details
        </h2>
        <div className="divide-y divide-surface-border">
          {summary.results.map((result) => {
            const info = CATEGORY_INFO[result.category]
            const activity = allActivities.find((a) => a.id === result.activityId)
            const provenance = activity?.provenance
            const provenanceInfo = provenance ? getProvenanceSummary(provenance) : null
            const perUnitEmissions =
              activity?.emissionFactor ?? result.emissions / result.quantity

            return (
              <div
                key={result.activityId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: `${info.color}20` }}
                    aria-hidden="true"
                  >
                    {info.emoji}
                  </span>
                  <div>
                    <div className="font-medium text-foreground">{result.activityName}</div>
                    <div className="text-sm text-foreground-muted">
                      {result.quantity} {result.unit}{result.quantity !== 1 ? 's' : ''} × {formatEmissions(perUnitEmissions)}/{result.unit}
                    </div>
                    {provenanceInfo && (
                      <div className="text-xs text-foreground-subtle font-mono mt-0.5">
                        EF: {provenanceInfo.emissionFactor}
                        {provenanceInfo.gridIntensity && ` | Grid: ${provenanceInfo.gridIntensity}`}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-semibold text-foreground font-mono">
                      {formatEmissions(result.emissions)}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      {(result.emissions / summary.totalEmissions * 100).toFixed(1)}% of total
                    </div>
                  </div>
                  {activity && (
                    <button
                      onClick={() => onOpenCitations(activity.id)}
                      className="action-link action-link-ghost p-2"
                      aria-label={`View sources for ${activity.name}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Carbon Pricing Comparison */}
      <CarbonPricingChart
        tonnesCo2e={tonnesCo2e}
        prices={carbonPrices}
        selectedJurisdictions={selectedPriceJurisdictions}
        onSelectionChange={onPriceSelectionChange}
      />

      {/* Equity Comparison */}
      <EquityComparisonDisplay
        tonnesCo2e={tonnesCo2e}
        accountingMethod="production"
      />

      {/* Sources Summary */}
      <div className="surface-card mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          All Sources (IEEE Citations)
        </h2>
        <p className="text-sm text-foreground-muted mb-4">
          Every emission factor in your calculation is backed by peer-reviewed or government sources.
          Click an activity&apos;s citation icon above for activity-specific sources.
        </p>
        <div className="space-y-2">
          {getAllCitations(summary.results, allActivities).map((citation, index) => (
            <p key={index} className="text-sm text-foreground leading-relaxed">
              {citation}
            </p>
          ))}
        </div>
      </div>

      {/* Citation Drawer */}
      <CitationDrawer
        isOpen={citationDrawerOpen}
        onClose={onCitationDrawerClose}
        sourceIds={selectedActivityForCitation?.sourceIds || []}
        provenance={selectedActivityForCitation?.provenance}
        title={`Sources for ${selectedActivityForCitation?.name || 'Activity'}`}
      />
    </div>
  )
}

// Helper to deduplicate citations across all results
function getAllCitations(results: CalculatorSummary['results'], allActivities: Activity[]): string[] {
  const allSourceIds = new Set<string>()
  for (const result of results) {
    const activity = allActivities.find((a) => a.id === result.activityId)
    if (activity) {
      activity.sourceIds.forEach((id) => allSourceIds.add(id))
    }
  }
  const citations: string[] = []
  for (const sourceId of allSourceIds) {
    citations.push(formatIEEECitation(sourceId))
  }
  return citations
}