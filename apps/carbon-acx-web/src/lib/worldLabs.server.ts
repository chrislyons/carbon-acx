import {
  DEMO_WORLDS,
  WORLD_LABS_GENERATION_DEFAULTS,
  getScenarioById,
  getScenarioForTags,
  getScenarioTags,
  type Operation,
  type World,
  type WorldModel,
  type WorldStatus,
  type WorldsBackendStatus,
  type WorldsResponse,
} from '@/lib/worldLabs'

const DEFAULT_WORLD_LABS_API_BASE_URL = 'https://api.worldlabs.ai/marble/v1'
const WORLD_LIST_PAGE_SIZE = 20

interface WorldLabsConfig {
  apiKey?: string
  baseUrl: string
}

interface WorldLabsApiErrorBody {
  error?: {
    code?: number
    message?: string
    status?: string
  }
}

interface WorldLabsMediaAsset {
  url: string
}

interface WorldLabsOutput {
  video?: WorldLabsMediaAsset
  thumbnail?: WorldLabsMediaAsset
}

interface WorldLabsWorld {
  name?: string
  id: string
  create_time: string
  update_time?: string
  display_name?: string
  description?: string
  tags?: string[]
  model?: WorldModel
  seed?: number
  prompt?: string
  output?: WorldLabsOutput
  state?: string
}

interface WorldLabsListResponse {
  worlds?: WorldLabsWorld[]
}

interface WorldLabsOperation {
  name: string
  done: boolean
  metadata?: {
    progress?: number
    status?: string
  }
  result?: {
    world?: WorldLabsWorld
  }
  error?: {
    code?: number
    message?: string
  }
}

export class WorldLabsServiceError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'WorldLabsServiceError'
    this.status = status
  }
}

function getWorldLabsConfig(): WorldLabsConfig {
  return {
    apiKey: process.env.WORLD_LABS_API_KEY,
    baseUrl: process.env.WORLD_LABS_API_BASE_URL || DEFAULT_WORLD_LABS_API_BASE_URL,
  }
}

function buildBackendStatus(
  mode: WorldsBackendStatus['mode'],
  canGenerate: boolean,
  message?: string
): WorldsBackendStatus {
  return { mode, canGenerate, message }
}

function extractOperationId(name: string): string {
  const trimmed = name.trim()
  if (!trimmed.includes('/')) {
    return trimmed
  }

  const parts = trimmed.split('/')
  return parts[parts.length - 1] || trimmed
}

function normalizeWorldStatus(state: string | undefined): WorldStatus {
  switch ((state || '').toUpperCase()) {
    case 'PROCESSING':
      return 'processing'
    case 'COMPLETED':
      return 'completed'
    case 'FAILED':
      return 'failed'
    case 'PENDING':
      return 'pending'
    default:
      return 'pending'
  }
}

function normalizeWorld(world: WorldLabsWorld): World {
  const tags = world.tags ?? []
  const scenario = getScenarioForTags(tags)

  return {
    id: world.id,
    displayName: world.display_name || world.name || 'Untitled world',
    description: world.description,
    tags,
    prompt: world.prompt || '',
    seed: world.seed,
    status: normalizeWorldStatus(world.state),
    videoUrl: world.output?.video?.url,
    thumbnailUrl: world.output?.thumbnail?.url,
    createdAt: world.create_time,
    updatedAt: world.update_time,
    model: world.model,
    scenarioId: scenario?.id,
    category: scenario?.category,
  }
}

function normalizeOperationStatus(operation: WorldLabsOperation): WorldStatus {
  if (operation.error) {
    return 'failed'
  }

  const worldState = operation.result?.world?.state
  if (worldState) {
    return normalizeWorldStatus(worldState)
  }

  const metadataStatus = (operation.metadata?.status || '').toUpperCase()
  if (metadataStatus.includes('FAIL')) {
    return 'failed'
  }
  if (metadataStatus.includes('PROCESS')) {
    return 'processing'
  }
  if (metadataStatus.includes('COMPLETE')) {
    return 'completed'
  }

  return operation.done ? 'completed' : 'pending'
}

function normalizeOperation(operation: WorldLabsOperation): Operation {
  return {
    id: extractOperationId(operation.name),
    status: normalizeOperationStatus(operation),
    worldId: operation.result?.world?.id,
    progress: operation.metadata?.progress,
    error: operation.error?.message,
  }
}

function getPublicErrorMessage(error: unknown): string {
  if (error instanceof WorldLabsServiceError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'World Labs is temporarily unavailable.'
}

async function requestWorldLabs<T>(
  config: WorldLabsConfig,
  endpoint: string,
  init: RequestInit = {}
): Promise<T> {
  if (!config.apiKey) {
    throw new WorldLabsServiceError(
      'WORLD_LABS_API_KEY is not configured. Showing demo worlds only.',
      503
    )
  }

  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'WLT-Api-Key': config.apiKey,
      ...(init.headers || {}),
    },
  })

  if (!response.ok) {
    let errorMessage = `World Labs request failed with status ${response.status}.`
    try {
      const body = (await response.json()) as WorldLabsApiErrorBody
      if (body.error?.message) {
        errorMessage = body.error.message
      }
    } catch {
      // Keep the generic message if the error body is not JSON.
    }

    throw new WorldLabsServiceError(errorMessage, response.status)
  }

  return (await response.json()) as T
}

export function isWorldLabsGenerationAvailable(): boolean {
  return Boolean(getWorldLabsConfig().apiKey)
}

export async function listWorlds(): Promise<WorldsResponse> {
  const config = getWorldLabsConfig()

  if (!config.apiKey) {
    return {
      worlds: DEMO_WORLDS,
      backend: buildBackendStatus(
        'demo',
        false,
        'WORLD_LABS_API_KEY is not configured. Showing demo worlds only.'
      ),
    }
  }

  try {
    const response = await requestWorldLabs<WorldLabsListResponse>(config, '/worlds:list', {
      method: 'POST',
      body: JSON.stringify({
        page_size: WORLD_LIST_PAGE_SIZE,
        filter: 'tags:carbon-acx',
        order_by: '-create_time',
      }),
    })

    const worlds = (response.worlds ?? []).map(normalizeWorld)

    return {
      worlds,
      backend: buildBackendStatus('live', true, 'Connected to the World Labs API.'),
    }
  } catch (error) {
    return {
      worlds: DEMO_WORLDS,
      backend: buildBackendStatus(
        'unavailable',
        false,
        `${getPublicErrorMessage(error)} Showing demo worlds instead.`
      ),
    }
  }
}

export async function generateWorldForScenario(scenarioId: string): Promise<Operation> {
  const scenario = getScenarioById(scenarioId)
  if (!scenario) {
    throw new WorldLabsServiceError(`Unknown carbon scenario: ${scenarioId}`, 400)
  }

  const config = getWorldLabsConfig()
  if (!config.apiKey) {
    throw new WorldLabsServiceError(
      'World Labs generation is unavailable because WORLD_LABS_API_KEY is not configured.',
      503
    )
  }

  const operation = await requestWorldLabs<WorldLabsOperation>(config, '/worlds:generate', {
    method: 'POST',
    body: JSON.stringify({
      model: WORLD_LABS_GENERATION_DEFAULTS.model,
      prompt: scenario.prompt,
      display_name: `Carbon Scenario: ${scenario.name}`,
      tags: getScenarioTags(scenario.id),
      is_public: false,
      aspect_ratio: WORLD_LABS_GENERATION_DEFAULTS.aspectRatio,
      output_settings: {
        resolution: WORLD_LABS_GENERATION_DEFAULTS.resolution,
      },
    }),
  })

  return {
    ...normalizeOperation(operation),
    startedAt: new Date().toISOString(),
  }
}

export async function pollOperations(operationIds: string[]): Promise<Operation[]> {
  const config = getWorldLabsConfig()
  if (!config.apiKey) {
    throw new WorldLabsServiceError(
      'World Labs polling is unavailable because WORLD_LABS_API_KEY is not configured.',
      503
    )
  }

  const normalized = await Promise.all(
    operationIds.map(async (operationId) => {
      try {
        const operation = await requestWorldLabs<WorldLabsOperation>(
          config,
          `/operations/${extractOperationId(operationId)}`
        )

        return normalizeOperation(operation)
      } catch (error) {
        return {
          id: extractOperationId(operationId),
          status: 'failed' as const,
          error: getPublicErrorMessage(error),
        }
      }
    })
  )

  return normalized
}
