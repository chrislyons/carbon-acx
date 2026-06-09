import { describe, expect, it, vi } from 'vitest'

const listWorldsMock = vi.fn()

vi.mock('@/lib/worldLabs.server', () => ({
  listWorlds: listWorldsMock,
}))

describe('GET /api/worlds', () => {
  it('returns the worlds response from the server layer', async () => {
    listWorldsMock.mockResolvedValueOnce({
      worlds: [
        {
          id: 'demo-world',
          displayName: 'Demo World',
          tags: ['carbon-acx', 'demo'],
          prompt: 'demo prompt',
          status: 'completed',
          createdAt: '2026-01-26T12:00:00Z',
        },
      ],
      backend: {
        mode: 'demo',
        canGenerate: false,
        message: 'Showing demo worlds only.',
      },
    })

    const { GET } = await import('@/app/api/worlds/route')
    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.backend.mode).toBe('demo')
    expect(payload.worlds[0].id).toBe('demo-world')
  })
})
