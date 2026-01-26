'use client'

/**
 * 3D Data Universe Page
 * Interactive 3D visualization of carbon emissions data
 *
 * Features:
 * - Dynamic import for SSR safety (Three.js requires browser APIs)
 * - Suspense boundary for loading state
 * - Sample emissions data from common activities
 * - User calculator data integration
 * - Manifest integration for provenance tracking
 *
 * NOTE: This page is client-only and cannot be statically rendered
 * due to Three.js WebGL requirements. Dynamic rendering is forced.
 */

import * as React from 'react'
import Link from 'next/link'
import type { Activity, ManifestInfo } from '@/components/viz/DataUniverse'
import { ACTIVITIES as CALCULATOR_ACTIVITIES, CATEGORY_INFO } from '@/lib/calculator'

const STORAGE_KEY = 'carbon-acx-calculator-inputs'

// Map calculator categories to colors
const CATEGORY_COLORS: Record<string, string> = {
  transport: '#3b82f6', // blue
  food: '#22c55e',      // green
  digital: '#a855f7',   // purple
  home: '#f59e0b',      // amber
  shopping: '#ec4899',  // pink
}

// Force dynamic rendering (no static generation)
// Required because Three.js needs browser APIs (WebGL)
export const dynamic = 'force-dynamic'

// Sample carbon emissions data
// These activities represent realistic annual emissions for common sources
const SAMPLE_ACTIVITIES = [
  {
    id: 'commute-car',
    name: 'Daily Car Commute',
    annualEmissions: 2400, // kg CO₂ (20 miles/day, 250 days/year)
    category: 'Transport',
    manifestId: 'abc123', // Will integrate with real manifests
  },
  {
    id: 'home-electricity',
    name: 'Home Electricity',
    annualEmissions: 4200, // kg CO₂ (average US household)
    category: 'Energy',
    manifestId: 'def456',
  },
  {
    id: 'natural-gas',
    name: 'Natural Gas Heating',
    annualEmissions: 2100, // kg CO₂
    category: 'Energy',
    manifestId: 'ghi789',
  },
  {
    id: 'flights',
    name: 'Air Travel',
    annualEmissions: 1800, // kg CO₂ (3 round-trip domestic flights)
    category: 'Transport',
    manifestId: 'jkl012',
  },
  {
    id: 'food-meat',
    name: 'Meat Consumption',
    annualEmissions: 1500, // kg CO₂ (high-meat diet)
    category: 'Food',
    manifestId: 'mno345',
  },
  {
    id: 'shopping',
    name: 'Consumer Goods',
    annualEmissions: 1200, // kg CO₂
    category: 'Consumption',
    manifestId: 'pqr678',
  },
  {
    id: 'waste',
    name: 'Household Waste',
    annualEmissions: 600, // kg CO₂
    category: 'Waste',
    manifestId: 'stu901',
  },
  {
    id: 'water',
    name: 'Water Usage',
    annualEmissions: 300, // kg CO₂
    category: 'Utilities',
    manifestId: 'vwx234',
  },
  {
    id: 'streaming',
    name: 'Digital Services',
    annualEmissions: 150, // kg CO₂ (streaming, cloud storage)
    category: 'Digital',
    manifestId: 'yz5678',
  },
]

type DataSource = 'sample' | 'calculator'

export default function ThreeDVisualizationPage() {
  const [selectedActivity, setSelectedActivity] = React.useState<string | null>(null)
  const [DataUniverse, setDataUniverse] = React.useState<React.ComponentType<any> | null>(null)
  const [isClient, setIsClient] = React.useState(false)
  const [manifest, setManifest] = React.useState<ManifestInfo | null>(null)
  const [dataSource, setDataSource] = React.useState<DataSource>('sample')
  const [calculatorInputs, setCalculatorInputs] = React.useState<Record<string, number>>({})
  const [hasCalculatorData, setHasCalculatorData] = React.useState(false)

  // Client-side only mount
  React.useEffect(() => {
    setIsClient(true)
    // Dynamically import DataUniverse only on client
    import('@/components/viz/DataUniverse').then((mod) => {
      setDataUniverse(() => mod.DataUniverse)
    })

    // Load calculator data from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed === 'object' && parsed !== null) {
          const hasData = Object.values(parsed).some((v) => (v as number) > 0)
          if (hasData) {
            setCalculatorInputs(parsed)
            setHasCalculatorData(true)
            setDataSource('calculator') // Auto-select if user has data
          }
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Fetch manifest data
  React.useEffect(() => {
    fetch('/api/manifests')
      .then((res) => res.json())
      .then((data) => {
        if (data.manifests && data.manifests.length > 0) {
          const m = data.manifests[0]
          setManifest({
            datasetId: m.id,
            title: m.figure_id,
            manifestPath: m.manifest_path,
            manifestSha256: m.hash_prefix,
            generatedAt: m.generated_at,
          })
        }
      })
      .catch((err) => console.error('Failed to load manifest:', err))
  }, [])

  // Convert calculator inputs to activities for 3D visualization
  const calculatorActivities: Activity[] = React.useMemo(() => {
    return Object.entries(calculatorInputs)
      .filter(([_, qty]) => qty > 0)
      .map(([activityId, quantity]) => {
        const activity = CALCULATOR_ACTIVITIES.find((a) => a.id === activityId)
        if (!activity) return null
        // Calculator uses grams, DataUniverse uses kg
        const emissionsKg = (activity.emissionFactor * quantity) / 1000
        return {
          id: activity.id,
          name: activity.name,
          annualEmissions: emissionsKg,
          category: CATEGORY_INFO[activity.category].name,
          color: CATEGORY_COLORS[activity.category],
        }
      })
      .filter((a): a is Activity => a !== null)
  }, [calculatorInputs])

  // Select which activities to display based on source
  const displayActivities = dataSource === 'calculator' ? calculatorActivities : SAMPLE_ACTIVITIES

  // Calculate total emissions
  const totalEmissions = displayActivities.reduce(
    (sum, activity) => sum + activity.annualEmissions,
    0
  )

  const handleActivityClick = (activity: {
    id: string
    name: string
    annualEmissions: number
    category?: string
    manifestId?: string
  }) => {
    setSelectedActivity(activity.id)
    console.log('Activity clicked:', activity)
    // Future: Show manifest details in a modal or side panel
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-gray-900 text-white border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">3D Data Universe</h1>
              <p className="text-gray-400 text-sm">
                Interactive visualization of carbon emissions data
              </p>
            </div>
            <Link
              href="/explore"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              ← Back to Explore
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Data Source Toggle */}
            <div className="flex items-center gap-2 p-1 bg-gray-200 rounded-lg">
              <button
                onClick={() => setDataSource('sample')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dataSource === 'sample'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sample Data
              </button>
              <button
                onClick={() => setDataSource('calculator')}
                disabled={!hasCalculatorData}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dataSource === 'calculator'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : hasCalculatorData
                      ? 'text-gray-600 hover:text-gray-900'
                      : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                My Footprint
                {hasCalculatorData && (
                  <span className="ml-1.5 w-2 h-2 bg-green-500 rounded-full inline-block" />
                )}
              </button>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                  Total Emissions
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {totalEmissions >= 1000
                    ? `${(totalEmissions / 1000).toFixed(1)} t`
                    : `${totalEmissions.toFixed(0)} kg`} CO₂
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                  Activities
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {displayActivities.length}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                  Data Source
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {dataSource === 'calculator' ? 'Personal' : 'Sample'}
                </div>
              </div>
            </div>
          </div>

          {/* CTA if no calculator data */}
          {!hasCalculatorData && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <span className="text-sm text-blue-800">
                Want to see your own carbon footprint in 3D?
              </span>
              <Link
                href="/calculator"
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Calculate Your Footprint →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 3D Visualization */}
      <div className="flex-1 relative">
        {!isClient || !DataUniverse ? (
          <div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center bg-gray-900 text-white">
            <div className="mb-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-lg font-semibold">Loading 3D Universe...</div>
            <div className="text-sm text-gray-400 mt-2">
              Initializing WebGL and Three.js
            </div>
          </div>
        ) : (
          <DataUniverse
            totalEmissions={totalEmissions}
            activities={displayActivities}
            manifest={manifest || undefined}
            onActivityClick={handleActivityClick}
            enableIntroAnimation={true}
            enableClickToFly={true}
          />
        )}
      </div>

      {/* Controls Info */}
      <div className="bg-gray-900 text-white border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-semibold mb-1 text-blue-400">🖱️ Orbit Controls</div>
              <div className="text-gray-400">
                Drag to rotate • Scroll to zoom • Right-drag to pan
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-green-400">🎯 Interactions</div>
              <div className="text-gray-400">
                Hover spheres for details • Click to fly to activity
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-purple-400">🎨 Visual Legend</div>
              <div className="text-gray-400">
                Green: Low (&lt;1t) • Amber: Moderate (1-5t) • Red: High (&gt;5t)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Activity Panel */}
      {selectedActivity && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-sm">
          <div className="text-xs text-gray-600 uppercase tracking-wide mb-2">
            Selected Activity
          </div>
          <div className="font-semibold text-gray-900 mb-1">
            {displayActivities.find((a) => a.id === selectedActivity)?.name}
          </div>
          <div className="text-sm text-gray-700">
            {(() => {
              const emissions = displayActivities.find((a) => a.id === selectedActivity)?.annualEmissions ?? 0
              return emissions >= 1000
                ? `${(emissions / 1000).toFixed(2)} t CO₂`
                : `${emissions.toFixed(1)} kg CO₂`
            })()}
          </div>
          <button
            onClick={() => setSelectedActivity(null)}
            className="mt-3 w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
