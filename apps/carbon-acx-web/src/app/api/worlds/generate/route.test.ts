import { beforeEach, describe, expect, it, vi } from 'vitest'

const generateWorldForScenarioMock = vi.fn()

vi.mock('@/lib/worldLabs.server', () => ({
  generateWorldForScenario: generateWorldForScenarioMock,
  WorldLabsServiceError: class MockWorldLabsServiceError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

describe('POST /api/worlds/generate', () => {
  beforeEach(() => {
    generateWorldForScenarioMock.mockReset()
  })

  it('rejects invalid JSON payloads', async () => {
    const { POST } = await import('@/app/api/worlds/generate/route')
    const response = await POST(
      new Request('http://localhost/api/worlds/generate', {
        method: 'POST',
        body: 'not-json',
      })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Request body must be valid JSON.',
    })
  })

  it('rejects requests without a scenarioId', async () => {
    const { POST } = await import('@/app/api/worlds/generate/route')
    const response = await POST(
      new Request('http://localhost/api/worlds/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Request body must include a string scenarioId.',
    })
  })

  it('returns the started operation for valid requests', async () => {
    generateWorldForScenarioMock.mockResolvedValueOnce({
      id: 'op-77',
      status: 'pending',
      startedAt: '2026-01-26T12:00:00Z',
    })

    const { POST } = await import('@/app/api/worlds/generate/route')
    const response = await POST(
      new Request('http://localhost/api/worlds/generate', {
        method: 'POST',
        body: JSON.stringify({ scenarioId: 'current-state' }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.operation.id).toBe('op-77')
    expect(generateWorldForScenarioMock).toHaveBeenCalledWith('current-state')
  })

  it('maps service failures to the route status code', async () => {
    generateWorldForScenarioMock.mockRejectedValueOnce(
      Object.assign(new Error('World Labs generation is unavailable.'), {
        status: 503,
      })
    )

    const { POST } = await import('@/app/api/worlds/generate/route')
    const response = await POST(
      new Request('http://localhost/api/worlds/generate', {
        method: 'POST',
        body: JSON.stringify({ scenarioId: 'current-state' }),
      })
    )

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: 'World Labs generation is unavailable.',
    })
  })
})
