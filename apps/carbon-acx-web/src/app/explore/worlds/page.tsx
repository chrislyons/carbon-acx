'use client'

import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { fetchWorlds, generateWorld, pollWorldOperations } from '@/lib/worldLabs.client'
import {
  CARBON_SCENARIOS,
  createTransientWorld,
  formatWorldDate,
  getScenarioById,
  getScenarioEmoji,
  getStatusColor,
  getStatusLabel,
  isTerminalOperation,
  type Operation,
  type ScenarioPreset,
  type World,
  type WorldsBackendStatus,
} from '@/lib/worldLabs'

type ViewMode = 'scenarios' | 'gallery'
type CategoryFilter = 'all' | ScenarioPreset['category']

interface QueuedGeneration {
  operationId: string
  scenarioId: string
  startedAt: string
}

const CATEGORY_FILTERS = ['all', 'emissions', 'renewable', 'industrial', 'personal'] as const

const DEFAULT_BACKEND_STATUS: WorldsBackendStatus = {
  mode: 'demo',
  canGenerate: false,
  message: 'Loading the Carbon Worlds catalog…',
}

const BACKEND_STATUS_STYLES: Record<
  WorldsBackendStatus['mode'],
  { dot: string; text: string; label: string }
> = {
  live: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    label: 'Live',
  },
  demo: {
    dot: 'bg-sky-400',
    text: 'text-sky-400',
    label: 'Demo',
  },
  unavailable: {
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    label: 'Unavailable',
  },
}

export default function WorldsPage() {
  const queryClient = useQueryClient()
  const handledCompletedIdsRef = useRef<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('scenarios')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [generationQueue, setGenerationQueue] = useState<QueuedGeneration[]>([])
  const [operationStates, setOperationStates] = useState<Record<string, Operation>>({})

  const worldsQuery = useQuery({
    queryKey: ['worlds'],
    queryFn: fetchWorlds,
  })

  const activeOperationIds = generationQueue
    .filter((item) => !isTerminalOperation(operationStates[item.operationId]))
    .map((item) => item.operationId)

  const operationsQuery = useQuery({
    queryKey: ['world-operations', activeOperationIds],
    queryFn: () => pollWorldOperations(activeOperationIds),
    enabled: activeOperationIds.length > 0,
    refetchInterval: 3000,
  })

  useEffect(() => {
    const operations = operationsQuery.data?.operations
    if (!operations || operations.length === 0) {
      return
    }

    setOperationStates((current) => {
      const next = { ...current }
      for (const operation of operations) {
        next[operation.id] = operation
      }
      return next
    })

    const completedIds = operations
      .filter((operation) => operation.status === 'completed')
      .map((operation) => operation.id)
      .filter((id) => !handledCompletedIdsRef.current.has(id))

    if (completedIds.length === 0) {
      return
    }

    for (const id of completedIds) {
      handledCompletedIdsRef.current.add(id)
    }

    setGenerationQueue((current) =>
      current.filter((entry) => !completedIds.includes(entry.operationId))
    )
    void queryClient.invalidateQueries({ queryKey: ['worlds'] })
  }, [operationsQuery.data, queryClient])

  const generateMutation = useMutation({
    mutationFn: generateWorld,
    onSuccess: (response, request) => {
      const startedAt = response.operation.startedAt ?? new Date().toISOString()

      setOperationStates((current) => ({
        ...current,
        [response.operation.id]: {
          ...response.operation,
          startedAt,
        },
      }))

      setGenerationQueue((current) => {
        const next = current.filter((entry) => entry.operationId !== response.operation.id)
        return [
          {
            operationId: response.operation.id,
            scenarioId: request.scenarioId,
            startedAt,
          },
          ...next,
        ]
      })

      setSelectedScenarioId(null)
      setViewMode('gallery')
    },
  })

  const backend = worldsQuery.data?.backend ?? DEFAULT_BACKEND_STATUS
  const liveWorlds = worldsQuery.data?.worlds ?? []
  const transientWorlds = generationQueue
    .map((entry) => {
      const scenario = getScenarioById(entry.scenarioId)
      if (!scenario) {
        return null
      }

      return createTransientWorld(scenario, {
        id: entry.operationId,
        status: operationStates[entry.operationId]?.status ?? 'pending',
        error: operationStates[entry.operationId]?.error,
        progress: operationStates[entry.operationId]?.progress,
        worldId: operationStates[entry.operationId]?.worldId,
        startedAt: entry.startedAt,
      })
    })
    .filter((world): world is World => Boolean(world))

  const worlds = [...transientWorlds, ...liveWorlds]
  const selectedScenario = selectedScenarioId ? getScenarioById(selectedScenarioId) ?? null : null
  const filteredScenarios =
    categoryFilter === 'all'
      ? CARBON_SCENARIOS
      : CARBON_SCENARIOS.filter((scenario) => scenario.category === categoryFilter)
  const filteredWorlds =
    categoryFilter === 'all'
      ? worlds
      : worlds.filter(
          (world) =>
            world.category === categoryFilter ||
            world.tags.some((tag) => tag.includes(categoryFilter))
        )
  const liveWorldCount = liveWorlds.filter((world) => !world.tags.includes('demo')).length

  const scenarioIsGenerating = (scenarioId: string) =>
    generationQueue.some(
      (entry) =>
        entry.scenarioId === scenarioId &&
        !isTerminalOperation(operationStates[entry.operationId])
    )

  const selectedScenarioIsGenerating = selectedScenario
    ? scenarioIsGenerating(selectedScenario.id)
    : false

  return (
    <div className="min-h-screen bg-[#0a0e27]">
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
                  Gallery ({worldsQuery.isPending ? '…' : worlds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {CATEGORY_FILTERS.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  categoryFilter === category
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {category === 'all'
                  ? 'All Categories'
                  : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {worldsQuery.isError && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {worldsQuery.error.message}
          </div>
        )}

        {viewMode === 'scenarios' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isSelected={selectedScenarioId === scenario.id}
                  onClick={() =>
                    setSelectedScenarioId((current) =>
                      current === scenario.id ? null : scenario.id
                    )
                  }
                  isGenerating={scenarioIsGenerating(scenario.id)}
                />
              ))}
            </div>

            {selectedScenario && (
              <div className="mt-8 p-6 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02]">
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-3xl"
                      style={{
                        filter: `drop-shadow(0 0 8px ${selectedScenario.thumbnailColor}40)`,
                      }}
                    >
                      {getScenarioEmoji(selectedScenario.category)}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {selectedScenario.name}
                      </h3>
                      <p className="text-white/60 text-sm">
                        {selectedScenario.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedScenarioId(null)}
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
                      {selectedScenario.prompt}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
                        Category
                      </div>
                      <div className="text-white/80 capitalize">
                        {selectedScenario.category}
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
                      <div className="text-white/80">30-45 seconds</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <button
                      disabled={
                        generateMutation.isPending ||
                        selectedScenarioIsGenerating ||
                        !backend.canGenerate
                      }
                      onClick={() =>
                        generateMutation.mutate({ scenarioId: selectedScenario.id })
                      }
                      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        generateMutation.isPending || selectedScenarioIsGenerating
                          ? 'bg-blue-600/50 text-white/60 cursor-wait'
                          : backend.canGenerate
                            ? 'bg-blue-600 text-white hover:bg-blue-500'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                      }`}
                    >
                      {generateMutation.isPending || selectedScenarioIsGenerating
                        ? 'Generating…'
                        : backend.canGenerate
                          ? 'Generate World'
                          : 'Live Generation Unavailable'}
                    </button>
                    <Link
                      href="/explore/3d"
                      className="px-5 py-2.5 bg-white/10 text-white hover:bg-white/20 rounded-lg text-sm font-medium transition-colors text-center"
                    >
                      View DataUniverse →
                    </Link>
                  </div>

                  {generateMutation.isError && (
                    <p className="text-sm text-red-200" aria-live="polite">
                      {generateMutation.error.message}
                    </p>
                  )}

                  {!backend.canGenerate && backend.message && (
                    <p className="text-sm text-amber-200" aria-live="polite">
                      {backend.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {worldsQuery.isPending && worlds.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4 opacity-50">🌍</div>
                <h3 className="text-lg font-medium text-white mb-2">Loading worlds…</h3>
                <p className="text-white/60 text-sm">
                  Fetching the latest Carbon Worlds catalog.
                </p>
              </div>
            ) : filteredWorlds.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-4 opacity-50">🌍</div>
                <h3 className="text-lg font-medium text-white mb-2">No worlds yet</h3>
                <p className="text-white/60 text-sm mb-6">
                  {backend.canGenerate
                    ? 'Generate your first carbon scenario world from the Scenarios tab.'
                    : 'No live worlds are available yet. Switch to Scenarios to browse the catalog.'}
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

        <IntegrationFooter
          backend={backend}
          liveWorldCount={liveWorldCount}
          pendingCount={activeOperationIds.length}
        />
      </main>
    </div>
  )
}

interface ScenarioCardProps {
  scenario: ScenarioPreset
  isSelected: boolean
  onClick: () => void
  isGenerating: boolean
}

function ScenarioCard({
  scenario,
  isSelected,
  onClick,
  isGenerating,
}: ScenarioCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border text-left transition-all
        ${
          isSelected
            ? 'border-white/30 bg-white/10 ring-1 ring-white/20'
            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
        }
      `}
    >
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
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at center, ${scenario.thumbnailColor}20 0%, transparent 70%)`,
          }}
        />
      </div>

      <h3 className="font-medium text-white text-sm mb-1">{scenario.name}</h3>
      <p className="text-white/50 text-xs leading-relaxed line-clamp-2">
        {scenario.description}
      </p>

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

      {isGenerating && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <div className="flex items-center gap-2 text-white text-sm">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating…
          </div>
        </div>
      )}
    </button>
  )
}

interface WorldCardProps {
  world: World
}

function WorldCard({ world }: WorldCardProps) {
  const isDemo = world.tags.includes('demo')
  const statusLabel = getStatusLabel(world.status)
  const tagList = world.tags.filter(
    (tag) => !['carbon-acx', 'demo', 'scenario', 'transient'].includes(tag)
  )

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors">
      <div
        className="w-full aspect-video rounded-lg mb-3 flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5 overflow-hidden"
        style={
          world.thumbnailUrl
            ? {
                backgroundImage: `linear-gradient(rgba(10, 14, 39, 0.15), rgba(10, 14, 39, 0.4)), url("${world.thumbnailUrl}")`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }
            : undefined
        }
      >
        {!world.thumbnailUrl &&
          (world.status === 'completed' ? (
            <span className="text-4xl opacity-60">🎬</span>
          ) : (
            <span className="text-white/40 text-sm">{statusLabel}</span>
          ))}
      </div>

      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-medium text-white text-sm line-clamp-1">
          {world.displayName}
        </h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getStatusColor(world.status) }}
            title={statusLabel}
          />
          <span className="text-[10px] uppercase tracking-wide text-white/40">
            {statusLabel}
          </span>
        </div>
      </div>

      {world.description && (
        <p className="text-white/50 text-xs mb-2 line-clamp-2">{world.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/40">
        <span>{formatWorldDate(world.createdAt)}</span>
        {world.seed && <span>seed:{world.seed}</span>}
        {isDemo && (
          <span className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">Demo</span>
        )}
      </div>

      {tagList.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tagList.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-white/50"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {world.videoUrl && (
        <div className="mt-3">
          <a
            href={world.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-sky-300 hover:text-sky-200 transition-colors"
          >
            Open rendered output →
          </a>
        </div>
      )}
    </div>
  )
}

interface IntegrationFooterProps {
  backend: WorldsBackendStatus
  liveWorldCount: number
  pendingCount: number
}

function IntegrationFooter({
  backend,
  liveWorldCount,
  pendingCount,
}: IntegrationFooterProps) {
  const status = BACKEND_STATUS_STYLES[backend.mode]

  return (
    <div className="mt-12 p-6 rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
      <h3 className="text-base font-semibold text-white mb-4">World Labs Integration</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-white/40 text-xs uppercase tracking-wide mb-1">Service</div>
          <div className="text-white/80 font-mono text-xs">World Labs REST</div>
        </div>
        <div>
          <div className="text-white/40 text-xs uppercase tracking-wide mb-1">Status</div>
          <div className={`flex items-center gap-1.5 ${status.text}`}>
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            <span>{status.label}</span>
          </div>
        </div>
        <div>
          <div className="text-white/40 text-xs uppercase tracking-wide mb-1">Generation</div>
          <div className="text-white/80">
            {backend.canGenerate ? 'Enabled' : 'Read-only'}
          </div>
        </div>
        <div>
          <div className="text-white/40 text-xs uppercase tracking-wide mb-1">
            Live Worlds
          </div>
          <div className="text-white/80">
            {liveWorldCount}
            {pendingCount > 0 ? ` + ${pendingCount} in progress` : ''}
          </div>
        </div>
      </div>
      {backend.message && (
        <p className="mt-4 text-sm text-white/60" aria-live="polite">
          {backend.message}
        </p>
      )}
    </div>
  )
}
