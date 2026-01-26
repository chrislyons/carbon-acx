'use client'

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ACTIVITIES,
  CATEGORY_INFO,
  calculateEmissions,
  formatEmissions,
  getActivitiesByCategory,
  type ActivityCategory,
  type CalculatorInput,
  type CalculatorSummary,
} from '@/lib/calculator'

const STORAGE_KEY = 'carbon-acx-calculator-inputs'

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
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-64 mb-8" />
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded-lg w-24" />
          ))}
        </div>
        <div className="bg-gray-100 rounded-xl p-6 mb-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
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
  const [isLoaded, setIsLoaded] = useState(false)
  const [isShared, setIsShared] = useState(false)

  // Load inputs from URL params or localStorage on mount
  useEffect(() => {
    const sharedData = searchParams.get('data')
    if (sharedData) {
      // Load from shared URL
      const decoded = decodeInputs(sharedData)
      if (Object.keys(decoded).length > 0) {
        setInputs(decoded)
        setIsShared(true)
        setStep('results') // Go directly to results for shared links
      }
    } else {
      // Load from localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (typeof parsed === 'object' && parsed !== null) {
            setInputs(parsed)
          }
        }
      } catch {
        // Ignore localStorage errors
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
      // Ignore localStorage errors
    }
  }, [inputs, isLoaded])

  // Calculate results
  const summary = useMemo(() => {
    const calculatorInputs: CalculatorInput[] = Object.entries(inputs)
      .filter(([_, qty]) => qty > 0)
      .map(([activityId, quantity]) => ({ activityId, quantity }))
    return calculateEmissions(calculatorInputs)
  }, [inputs])

  const hasInputs = Object.values(inputs).some((v) => v > 0)

  const handleInputChange = (activityId: string, value: string) => {
    const num = parseFloat(value) || 0
    setInputs((prev) => ({
      ...prev,
      [activityId]: num,
    }))
  }

  const handleReset = () => {
    setInputs({})
    setStep('input')
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore localStorage errors
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
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Carbon Calculator
        </h1>
        <p className="text-gray-600">
          Enter your activities to calculate your carbon footprint.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const info = CATEGORY_INFO[cat]
          const categoryTotal = summary.byCategory[cat]
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{info.emoji}</span>
              <span>{info.name}</span>
              {categoryTotal > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-xs rounded ${
                    activeCategory === cat
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-600'
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
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{CATEGORY_INFO[activeCategory].emoji}</span>
          <h2 className="text-lg font-semibold text-gray-900">
            {CATEGORY_INFO[activeCategory].name}
          </h2>
        </div>

        <div className="space-y-4">
          {getActivitiesByCategory(activeCategory).map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{activity.name}</div>
                {activity.description && (
                  <div className="text-sm text-gray-500">{activity.description}</div>
                )}
                <div className="text-xs text-gray-400 mt-0.5">
                  {formatEmissions(activity.emissionFactor)} per {activity.unit}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={inputs[activity.id] || ''}
                  onChange={(e) => handleInputChange(activity.id, e.target.value)}
                  placeholder="0"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-500 w-16">{activity.unitLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Current Total</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatEmissions(summary.totalEmissions)}
          </div>
          {summary.totalEmissions > 0 && (
            <div className="text-xs text-gray-500">
              CO₂ equivalent
            </div>
          )}
        </div>
        <div className="flex gap-3">
          {hasInputs && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => setStep('results')}
            disabled={!hasInputs}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              hasInputs
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            View Results →
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              About This Calculator
            </h3>
            <p className="text-sm text-blue-800">
              Emission factors sourced from ECCC National Inventory Report, IPCC, EPA,
              and peer-reviewed literature. All values are CO₂ equivalent using GWP100 (AR6).
            </p>
          </div>
          {hasInputs && (
            <div className="flex items-center gap-1.5 text-xs text-green-700 whitespace-nowrap">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Auto-saved
            </div>
          )}
        </div>
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
}

function ResultsView({ summary, inputs, isShared, onBack, onReset }: ResultsViewProps) {
  const [copied, setCopied] = useState(false)
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
      // Fallback for older browsers
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Shared Banner */}
      {isShared && (
        <div className="mb-6 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
          You're viewing a shared carbon footprint. Click "Edit inputs" to modify and save your own.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 text-sm mb-2 flex items-center gap-1"
          >
            ← Edit inputs
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Your Carbon Footprint</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </>
            )}
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Start Over
          </button>
        </div>
      </div>

      {/* Total Card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-8 mb-8">
        <div className="text-center">
          <div className="text-5xl font-bold mb-2">
            {formatEmissions(summary.totalEmissions)}
          </div>
          <div className="text-gray-400 mb-4">Total CO₂ equivalent</div>

          {summary.comparisonToAverage > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm">
              <span>
                {summary.comparisonToAverage < 100 ? '🌱' : '⚠️'}
              </span>
              <span>
                {summary.comparisonToAverage.toFixed(1)}% of Canadian annual average
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                    <span>{info.emoji}</span>
                    <span className="font-medium text-gray-900">{info.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatEmissions(emissions)}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
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
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Activity Details
        </h2>
        <div className="divide-y divide-gray-100">
          {summary.results.map((result) => {
            const info = CATEGORY_INFO[result.category]
            return (
              <div
                key={result.activityId}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                    style={{ backgroundColor: `${info.color}20` }}
                  >
                    {info.emoji}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">{result.activityName}</div>
                    <div className="text-sm text-gray-500">
                      {result.quantity} {result.unit}
                      {result.quantity !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {formatEmissions(result.emissions)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/explore/3d"
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg text-center font-medium hover:bg-blue-700 transition-colors"
        >
          Visualize in 3D Universe →
        </Link>
        <Link
          href="/explore/worlds"
          className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg text-center font-medium hover:bg-gray-200 transition-colors"
        >
          Explore Carbon Worlds
        </Link>
      </div>

      {/* Methodology Link */}
      <div className="mt-8 text-center">
        <Link
          href="/methodology"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Learn about our methodology →
        </Link>
      </div>
    </div>
  )
}
