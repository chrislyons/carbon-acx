import type {
  GenerateWorldRequest,
  GenerateWorldResponse,
  OperationsResponse,
  WorldsResponse,
} from '@/lib/worldLabs'

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json()

  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : typeof payload?.message === 'string'
          ? payload.message
          : 'World Labs request failed.'

    throw new Error(message)
  }

  return payload as T
}

export async function fetchWorlds(): Promise<WorldsResponse> {
  const response = await fetch('/api/worlds', {
    method: 'GET',
    cache: 'no-store',
  })

  return parseJsonResponse<WorldsResponse>(response)
}

export async function generateWorld(
  request: GenerateWorldRequest
): Promise<GenerateWorldResponse> {
  const response = await fetch('/api/worlds/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  return parseJsonResponse<GenerateWorldResponse>(response)
}

export async function pollWorldOperations(
  operationIds: string[]
): Promise<OperationsResponse> {
  const params = new URLSearchParams({
    ids: operationIds.join(','),
  })

  const response = await fetch(`/api/worlds/operations?${params.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  })

  return parseJsonResponse<OperationsResponse>(response)
}
