/**
 * World Labs domain model shared by the client and server integrations.
 *
 * @see ACX100 World Labs 3D World Integration Specification
 */

export type WorldModel = 'Marble 0.1-mini' | 'Marble 0.1-plus'
export type WorldStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type WorldAspectRatio = '16:9' | '9:16' | '1:1'
export type WorldResolution = '1080p' | '720p'
export type WorldCategory = 'emissions' | 'renewable' | 'industrial' | 'personal'
export type WorldsBackendMode = 'live' | 'demo' | 'unavailable'

export interface World {
  id: string
  displayName: string
  description?: string
  tags: string[]
  prompt: string
  seed?: number
  status: WorldStatus
  videoUrl?: string
  thumbnailUrl?: string
  createdAt: string
  updatedAt?: string
  model?: WorldModel
  scenarioId?: string
  category?: WorldCategory
}

export interface Operation {
  id: string
  status: WorldStatus
  worldId?: string
  progress?: number
  error?: string
  startedAt?: string
}

export interface GenerateOptions {
  prompt: string
  displayName?: string
  tags?: string[]
  seed?: number
  model?: WorldModel
  aspectRatio?: WorldAspectRatio
  resolution?: WorldResolution
  wait?: boolean
}

export interface ScenarioPreset {
  id: string
  name: string
  description: string
  prompt: string
  thumbnailColor: string
  category: WorldCategory
}

export interface WorldsBackendStatus {
  mode: WorldsBackendMode
  canGenerate: boolean
  message?: string
}

export interface WorldsResponse {
  worlds: World[]
  backend: WorldsBackendStatus
}

export interface GenerateWorldRequest {
  scenarioId: string
}

export interface GenerateWorldResponse {
  operation: Operation
  backend: WorldsBackendStatus
}

export interface OperationsResponse {
  operations: Operation[]
  backend: WorldsBackendStatus
}

export const WORLD_LABS_GENERATION_DEFAULTS = {
  model: 'Marble 0.1-mini',
  aspectRatio: '16:9',
  resolution: '720p',
} as const satisfies {
  model: WorldModel
  aspectRatio: WorldAspectRatio
  resolution: WorldResolution
}

export const CARBON_SCENARIOS: ScenarioPreset[] = [
  {
    id: 'current-state',
    name: 'Current State',
    description: 'High-emission industrial landscape with factories, traffic, and smog',
    prompt: 'Urban industrial landscape with factories, traffic congestion, brown smog, coal power plants, showing high carbon emissions and pollution',
    thumbnailColor: '#ef4444',
    category: 'emissions',
  },
  {
    id: 'net-zero-2050',
    name: 'Net Zero 2050',
    description: 'Renewable energy future with solar, wind, and sustainable cities',
    prompt: 'Sustainable city with solar panels on rooftops, wind turbines in the distance, green buildings with vertical gardens, electric vehicles, clear blue sky',
    thumbnailColor: '#10b981',
    category: 'renewable',
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain',
    description: 'Global emission sources from manufacturing to shipping',
    prompt: 'Global supply chain showing factories with smoke stacks, cargo ships at port, freight trains, data centers, power transmission lines connecting industrial zones',
    thumbnailColor: '#f59e0b',
    category: 'industrial',
  },
  {
    id: 'personal-footprint',
    name: 'Personal Footprint',
    description: 'Individual carbon activities and consumption patterns',
    prompt: 'Modern suburban home with family car in driveway, appliances visible through windows, backyard barbecue, showing personal energy consumption and carbon footprint',
    thumbnailColor: '#6366f1',
    category: 'personal',
  },
  {
    id: 'renewable-transition',
    name: 'Renewable Transition',
    description: 'Halfway point between fossil fuels and clean energy',
    prompt: 'Mixed energy landscape with solar farm next to coal plant, wind turbines beside oil refinery, showing the transition from fossil fuels to renewable energy',
    thumbnailColor: '#8b5cf6',
    category: 'renewable',
  },
  {
    id: 'data-center',
    name: 'Data Infrastructure',
    description: 'Digital carbon footprint from cloud computing',
    prompt: 'Large data center complex with cooling towers, server rooms visible, massive power lines, showing the carbon footprint of digital infrastructure',
    thumbnailColor: '#06b6d4',
    category: 'industrial',
  },
]

// ============================================================================
// Demo Worlds (for development/preview)
// ============================================================================

export const DEMO_WORLDS: World[] = [
  {
    id: 'demo-current-state',
    displayName: 'Carbon Scenario: Current State',
    description: 'High-emission industrial landscape',
    tags: ['carbon-acx', 'scenario', 'current-state', 'demo'],
    prompt: CARBON_SCENARIOS[0].prompt,
    seed: 42,
    status: 'completed',
    createdAt: '2026-01-25T12:00:00Z',
    model: 'Marble 0.1-mini',
    scenarioId: 'current-state',
    category: 'emissions',
  },
  {
    id: 'demo-net-zero',
    displayName: 'Carbon Scenario: Net Zero 2050',
    description: 'Sustainable city of the future',
    tags: ['carbon-acx', 'scenario', 'net-zero', 'demo'],
    prompt: CARBON_SCENARIOS[1].prompt,
    seed: 43,
    status: 'completed',
    createdAt: '2026-01-25T12:05:00Z',
    model: 'Marble 0.1-mini',
    scenarioId: 'net-zero-2050',
    category: 'renewable',
  },
]

export function getScenarioById(id: string): ScenarioPreset | undefined {
  return CARBON_SCENARIOS.find((s) => s.id === id)
}

export function getScenarioEmoji(category: WorldCategory): string {
  const emojis: Record<WorldCategory, string> = {
    emissions: '🏭',
    renewable: '🌱',
    industrial: '🚢',
    personal: '🏠',
  }
  return emojis[category]
}

export function getScenarioTags(scenarioId: string): string[] {
  return ['carbon-acx', 'scenario', scenarioId]
}

export function getScenarioForTags(tags: string[]): ScenarioPreset | undefined {
  return CARBON_SCENARIOS.find((scenario) => tags.includes(scenario.id))
}

export function createTransientWorld(
  scenario: ScenarioPreset,
  operation: Operation
): World {
  const description = operation.error ?? scenario.description

  return {
    id: `operation-${operation.id}`,
    displayName: `Carbon Scenario: ${scenario.name}`,
    description,
    tags: [...getScenarioTags(scenario.id), 'transient'],
    prompt: scenario.prompt,
    status: operation.status,
    createdAt: operation.startedAt ?? new Date().toISOString(),
    model: WORLD_LABS_GENERATION_DEFAULTS.model,
    scenarioId: scenario.id,
    category: scenario.category,
  }
}

export function isTerminalOperation(operation: Operation | undefined): boolean {
  return operation?.status === 'completed' || operation?.status === 'failed'
}

export function getStatusLabel(status: WorldStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'processing':
      return 'Processing'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
  }
}

export function formatWorldDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusColor(status: World['status']): string {
  const colors: Record<WorldStatus, string> = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444',
  }
  return colors[status]
}
