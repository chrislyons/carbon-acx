import { beforeEach, describe, expect, it, vi } from 'vitest'

const pollOperationsMock = vi.fn()

vi.mock('@/lib/worldLabs.server', () => ({
  pollOperations: pollOperationsMock,
}))

describe('GET /api/worlds/operations', () => {
  beforeEach(() => {
    pollOperationsMock.mockReset()
  })

  it('requires at least one operation id', async () => {
    const { GET } = await import('@/app/api/worlds/operations/route')
    const response = await GET(
      new Request('http://localhost/api/worlds/operations')
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Query parameter "ids" is required.',
    })
  })

  it('returns normalized operations from the server layer', async () => {
    pollOperationsMock.mockResolvedValueOnce([
      {
        id: 'op-99',
        status: 'processing',
        progress: 45,
      },
    ])

    const { GET } = await import('@/app/api/worlds/operations/route')
    const response = await GET(
      new Request('http://localhost/api/worlds/operations?ids=op-99')
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.operations).toEqual([
      expect.objectContaining({
        id: 'op-99',
        status: 'processing',
      }),
    ])
  })
})
