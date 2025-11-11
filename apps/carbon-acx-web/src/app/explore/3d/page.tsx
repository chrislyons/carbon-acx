'use client'

/**
 * 3D Data Universe Page
 * Interactive 3D visualization of carbon emissions data
 *
 * Features:
 * - Dynamic import for SSR safety (Three.js requires browser APIs)
 * - Suspense boundary for loading state
 * - Sample emissions data from common activities
 * - Manifest integration for provenance tracking
 *
 * NOTE: This page is client-only and cannot be statically rendered
 * due to Three.js WebGL requirements. Dynamic rendering is forced.
 */

import * as React from 'react'
import Link from 'next/link'
import type { Activity, ManifestInfo } from '@/components/viz/DataUniverse'

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

export default function ThreeDVisualizationPage() {
  const [selectedActivity, setSelectedActivity] = React.useState<string | null>(null)
  const [DataUniverse, setDataUniverse] = React.useState<React.ComponentType<any> | null>(null)
  const [isClient, setIsClient] = React.useState(false)
  const [manifest, setManifest] = React.useState<ManifestInfo | null>(null)

  // Client-side only mount
  React.useEffect(() => {
    setIsClient(true)
    // Dynamically import DataUniverse only on client
    import('@/components/viz/DataUniverse').then((mod) => {
      setDataUniverse(() => mod.DataUniverse)
    })
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

  // Calculate total emissions
  const totalEmissions = SAMPLE_ACTIVITIES.reduce(
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                Total Annual Emissions
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {(totalEmissions / 1000).toFixed(1)} t CO₂
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                Activities Tracked
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {SAMPLE_ACTIVITIES.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 uppercase tracking-wide mb-1">
                Visualization
              </div>
              <div className="text-2xl font-bold text-gray-900">
                Live 3D
              </div>
            </div>
          </div>
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
            activities={SAMPLE_ACTIVITIES}
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

      {/* Selected Activity Panel (Future: Modal with manifest details) */}
      {selectedActivity && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-sm">
          <div className="text-xs text-gray-600 uppercase tracking-wide mb-2">
            Selected Activity
          </div>
          <div className="font-semibold text-gray-900 mb-1">
            {SAMPLE_ACTIVITIES.find((a) => a.id === selectedActivity)?.name}
          </div>
          <div className="text-sm text-gray-700">
            {(
              (SAMPLE_ACTIVITIES.find((a) => a.id === selectedActivity)
                ?.annualEmissions ?? 0) / 1000
            ).toFixed(2)}{' '}
            t CO₂/yr
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
