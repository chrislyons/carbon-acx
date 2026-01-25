'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  CARBON_SCENARIOS,
  DEMO_WORLDS,
  getScenarioEmoji,
  formatWorldDate,
  getStatusColor,
  type World,
  type ScenarioPreset,
} from '@/lib/worldLabs'

/**
 * Carbon Worlds Gallery
 * Displays AI-generated carbon scenario worlds from World Labs
 *
 * Phase 1: Scenario presets with demo worlds
 * Phase 2: Full World Labs MCP integration
 *
 * @see ACX100 World Labs 3D World Integration Specification
 */

type ViewMode = 'scenarios' | 'gallery'
type CategoryFilter = 'all' | ScenarioPreset['category']

export default function WorldsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('scenarios')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [worlds, setWorlds] = useState<World[]>(DEMO_WORLDS)
  const [isGenerating, setIsGenerating] = useState(false)
  const [mcpStatus, setMcpStatus] = useState<'connected' | 'error' | 'unknown'>('unknown')

  // Filter scenarios by category
  const filteredScenarios = categoryFilter === 'all'
    ? CARBON_SCENARIOS
    : CARBON_SCENARIOS.filter((s) => s.category === categoryFilter)

  // Filter worlds by tags matching category
  const filteredWorlds = categoryFilter === 'all'
    ? worlds
    : worlds.filter((w) => w.tags.some((t) => t.includes(categoryFilter)))

  const selectedScenarioData = CARBON_SCENARIOS.find((s) => s.id === selectedScenario)

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/explore"
                className="text-white/60 hover:text-white text-sm mb-2 inline-flex items-center gap-1 transition-colors"
              >
                <span>←</span> Back to Explore
              </Link>
              <h1 className="text-2xl font-bold text-white">Carbon Worlds</h1>
              <p className="text-white/60 text-sm mt-1">
                AI-generated 3D worlds visualizing carbon scenarios
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* View mode toggle */}
              <div className="flex bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('scenarios')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    viewMode === 'scenarios'
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Scenarios
                </button>
                <button
                  onClick={() => setViewMode('gallery')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    viewMode === 'gallery'
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Gallery ({worlds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(['all', 'emissions', 'renewable', 'industrial', 'personal'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'scenarios' ? (
          <>
            {/* Scenario Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isSelected={selectedScenario === scenario.id}
                  onClick={() => setSelectedScenario(
                    selectedScenario === scenario.id ? null : scenario.id
                  )}
                  isGenerating={isGenerating && selectedScenario === scenario.id}
                />
              ))}
            </div>

            {/* Selected Scenario Detail Panel */}
            {selectedScenarioData && (
              <div className="mt-8 p-6 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-3xl"
                      style={{ filter: `drop-shadow(0 0 8px ${selectedScenarioData.thumbnailColor}40)` }}
                    >
                      {getScenarioEmoji(selectedScenarioData.category)}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {selectedScenarioData.name}
                      </h3>
                      <p className="text-white/60 text-sm">
                        {selectedScenarioData.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedScenario(null)}
                    className="text-white/40 hover:text-white text-xl transition-colors"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-white/40 text-xs uppercase tracking-wide mb-1.5">
                      Generation Prompt
                    </div>
                    <div className="text-white/80 text-sm font-mono bg-black/30 rounded-lg p-4 leading-relaxed">
                      {selectedScenarioData.prompt}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                        Category
                      </div>
                      <div className="text-white/80 capitalize">
                        {selectedScenarioData.category}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                        Model
                      </div>
                      <div className="text-white/80 font-mono text-xs">
                        Marble 0.1-mini
                      </div>
                    </div>
                    <div>
                      <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                        Est. Time
                      </div>
                      <div className="text-white/80">
                        30-45 seconds
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      disabled={isGenerating}
                      onClick={() => {
                        setIsGenerating(true)
                        // TODO: Call World Labs MCP when API is ready
                        setTimeout(() => setIsGenerating(false), 2000)
                      }}
                      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isGenerating
                          ? 'bg-blue-600/50 text-white/50 cursor-wait'
                          : 'bg-blue-600 text-white hover:bg-blue-500'
                      }`}
                    >
                      {isGenerating ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        'Generate World'
                      )}
                    </button>
                    <Link
                      href="/explore/3d"
                      className="px-5 py-2.5 bg-white/10 text-white hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                    >
                      View DataUniverse →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Gallery View */}
            {filteredWorlds.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4 opacity-50">🌍</div>
                <h3 className="text-lg font-medium text-white mb-2">No worlds yet</h3>
                <p className="text-white/60 text-sm mb-6">
                  Generate your first carbon scenario world from the Scenarios tab
                </p>
                <button
                  onClick={() => setViewMode('scenarios')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
                >
                  View Scenarios
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWorlds.map((world) => (
                  <WorldCard key={world.id} world={world} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Integration Status Footer */}
        <div className="mt-12 p-6 rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
          <h3 className="text-base font-semibold text-white mb-4">
            World Labs Integration
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                MCP Server
              </div>
              <div className="text-white/80 font-mono">worlds</div>
            </div>
            <div>
              <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                Status
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-yellow-400">API Testing</span>
              </div>
            </div>
            <div>
              <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                Model
              </div>
              <div className="text-white/80 font-mono text-xs">Marble 0.1-mini</div>
            </div>
            <div>
              <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                Worlds Generated
              </div>
              <div className="text-white/80">{worlds.filter((w) => !w.tags.includes('demo')).length}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// Scenario Card Component
// ============================================================================

interface ScenarioCardProps {
  scenario: ScenarioPreset
  isSelected: boolean
  onClick: () => void
  isGenerating: boolean
}

function ScenarioCard({ scenario, isSelected, onClick, isGenerating }: ScenarioCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border text-left transition-all
        ${isSelected
          ? 'border-white/30 bg-white/10 ring-1 ring-white/20'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
        }
      `}
    >
      {/* Thumbnail */}
      <div
        className="w-full aspect-video rounded-lg mb-3 flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: `${scenario.thumbnailColor}15` }}
      >
        <span
          className="text-5xl"
          style={{
            color: scenario.thumbnailColor,
            filter: `drop-shadow(0 0 20px ${scenario.thumbnailColor}40)`,
          }}
        >
          {getScenarioEmoji(scenario.category)}
        </span>
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at center, ${scenario.thumbnailColor}20 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Content */}
      <h3 className="font-medium text-white text-sm mb-1">
        {scenario.name}
      </h3>
      <p className="text-white/50 text-xs leading-relaxed line-clamp-2">
        {scenario.description}
      </p>

      {/* Category badge */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide"
          style={{
            backgroundColor: `${scenario.thumbnailColor}20`,
            color: scenario.thumbnailColor,
          }}
        >
          {scenario.category}
        </span>
      </div>

      {/* Loading overlay */}
      {isGenerating && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <div className="flex items-center gap-2 text-white text-sm">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating...
          </div>
        </div>
      )}
    </button>
  )
}

// ============================================================================
// World Card Component
// ============================================================================

interface WorldCardProps {
  world: World
}

function WorldCard({ world }: WorldCardProps) {
  const isDemo = world.tags.includes('demo')

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors">
      {/* Thumbnail placeholder */}
      <div className="w-full aspect-video rounded-lg mb-3 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
        {world.status === 'completed' ? (
          <span className="text-4xl opacity-60">🎬</span>
        ) : (
          <span className="text-white/40 text-sm">
            {world.status === 'processing' ? 'Processing...' : 'Pending'}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-white text-sm line-clamp-1">
          {world.displayName}
        </h3>
        <span
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
          style={{ backgroundColor: getStatusColor(world.status) }}
          title={world.status}
        />
      </div>

      {world.description && (
        <p className="text-white/50 text-xs mb-2 line-clamp-2">
          {world.description}
        </p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-2 text-[10px] text-white/40">
        <span>{formatWorldDate(world.createdAt)}</span>
        {world.seed && <span>seed:{world.seed}</span>}
        {isDemo && (
          <span className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">
            Demo
          </span>
        )}
      </div>

      {/* Tags */}
      <div className="mt-2 flex flex-wrap gap-1">
        {world.tags.filter((t) => !['carbon-acx', 'demo'].includes(t)).slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-white/50"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
