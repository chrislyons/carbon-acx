'use client'

import Link from 'next/link'
import { useState } from 'react'

/**
 * Carbon Worlds Gallery
 * Displays AI-generated carbon scenario worlds from World Labs
 *
 * Phase 1: Placeholder UI with scenario presets
 * Phase 2: Full World Labs MCP integration
 *
 * @see ACX100 World Labs 3D World Integration Specification
 */

interface Scenario {
  id: string
  name: string
  description: string
  prompt: string
  status: 'available' | 'generating' | 'coming-soon'
  thumbnailColor: string
}

const SCENARIOS: Scenario[] = [
  {
    id: 'current-state',
    name: 'Current State',
    description: 'High-emission industrial landscape with factories, traffic, and smog',
    prompt: 'Urban industrial landscape with factories, traffic, brown smog, coal power plants, showing high carbon emissions',
    status: 'coming-soon',
    thumbnailColor: '#ef4444',
  },
  {
    id: 'net-zero-2050',
    name: 'Net Zero 2050',
    description: 'Renewable energy future with solar, wind, and sustainable cities',
    prompt: 'Sustainable city with solar panels, wind turbines, green buildings, clear skies, electric vehicles',
    status: 'coming-soon',
    thumbnailColor: '#10b981',
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain',
    description: 'Global emission sources from manufacturing to shipping',
    prompt: 'Global supply chain showing factories, shipping ports, cargo ships, data centers, power lines',
    status: 'coming-soon',
    thumbnailColor: '#f59e0b',
  },
  {
    id: 'personal-footprint',
    name: 'Personal Footprint',
    description: 'Individual carbon activities and consumption patterns',
    prompt: 'Modern home with car, appliances, food, showing energy consumption and personal carbon footprint',
    status: 'coming-soon',
    thumbnailColor: '#6366f1',
  },
]

export default function WorldsPage() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/explore"
                className="text-white/60 hover:text-white text-sm mb-2 inline-block"
              >
                ← Back to Explore
              </Link>
              <h1 className="text-2xl font-bold text-white">Carbon Worlds</h1>
              <p className="text-white/60 text-sm mt-1">
                AI-generated 3D worlds visualizing carbon scenarios
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">
                Phase 1 Preview
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MCP Status Banner */}
      <div className="border-b border-white/10 bg-blue-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-400">ℹ️</span>
            <span className="text-white/80">
              World Labs MCP integration ready. Reload MCP servers to enable generation.
            </span>
          </div>
        </div>
      </div>

      {/* Scenario Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-lg font-semibold text-white mb-4">Carbon Scenarios</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => setSelectedScenario(scenario.id)}
              className={`
                relative p-4 rounded-lg border transition-all text-left
                ${selectedScenario === scenario.id
                  ? 'border-white/40 bg-white/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                }
              `}
            >
              {/* Thumbnail placeholder */}
              <div
                className="w-full aspect-video rounded-md mb-3 flex items-center justify-center"
                style={{ backgroundColor: `${scenario.thumbnailColor}20` }}
              >
                <span
                  className="text-4xl opacity-60"
                  style={{ color: scenario.thumbnailColor }}
                >
                  {scenario.id === 'current-state' && '🏭'}
                  {scenario.id === 'net-zero-2050' && '🌱'}
                  {scenario.id === 'supply-chain' && '🚢'}
                  {scenario.id === 'personal-footprint' && '🏠'}
                </span>
              </div>

              <h3 className="font-medium text-white text-sm mb-1">
                {scenario.name}
              </h3>
              <p className="text-white/50 text-xs leading-relaxed">
                {scenario.description}
              </p>

              {/* Status badge */}
              <div className="absolute top-2 right-2">
                {scenario.status === 'coming-soon' && (
                  <span className="px-2 py-0.5 bg-white/10 text-white/60 text-[10px] rounded-full">
                    Soon
                  </span>
                )}
                {scenario.status === 'generating' && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded-full animate-pulse">
                    Generating...
                  </span>
                )}
                {scenario.status === 'available' && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded-full">
                    Ready
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Selected scenario detail */}
        {selectedScenario && (
          <div className="mt-8 p-6 rounded-lg border border-white/10 bg-white/5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {SCENARIOS.find((s) => s.id === selectedScenario)?.name}
                </h3>
                <p className="text-white/60 text-sm mt-1">
                  {SCENARIOS.find((s) => s.id === selectedScenario)?.description}
                </p>
              </div>
              <button
                onClick={() => setSelectedScenario(null)}
                className="text-white/40 hover:text-white text-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                  Generation Prompt
                </div>
                <div className="text-white/80 text-sm font-mono bg-black/30 rounded p-3">
                  {SCENARIOS.find((s) => s.id === selectedScenario)?.prompt}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  disabled
                  className="px-4 py-2 bg-blue-600/50 text-white/50 rounded text-sm font-medium cursor-not-allowed"
                >
                  Generate World
                </button>
                <Link
                  href="/explore/3d"
                  className="px-4 py-2 bg-white/10 text-white hover:bg-white/20 rounded text-sm font-medium transition-colors"
                >
                  View DataUniverse →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Integration info */}
        <div className="mt-8 p-6 rounded-lg border border-white/10 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
          <h3 className="text-base font-semibold text-white mb-3">
            World Labs Integration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                MCP Server
              </div>
              <div className="text-white/80 font-mono">worlds</div>
            </div>
            <div>
              <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                Primary Tool
              </div>
              <div className="text-white/80 font-mono">world_generate_from_text</div>
            </div>
            <div>
              <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                Status
              </div>
              <div className="text-yellow-400">Awaiting MCP reload</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
