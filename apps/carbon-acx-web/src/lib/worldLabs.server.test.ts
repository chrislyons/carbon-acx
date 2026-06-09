import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateWorldForScenario,
  listWorlds,
  pollOperations,
} from '@/lib/worldLabs.server'

const originalFetch = global.fetch

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  })
}

describe('worldLabs.server', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    global.fetch = originalFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    global.fetch = originalFetch
  })

  it('returns demo mode when no API key is configured', async () => {
    const response = await listWorlds()

    expect(response.backend.mode).toBe('demo')
    expect(response.backend.canGenerate).toBe(false)
    expect(response.worlds).toHaveLength(2)
  })

  it('lists and normalizes live worlds when the API responds successfully', async () => {
    vi.stubEnv('WORLD_LABS_API_KEY', 'test-key')
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        worlds: [
          {
            id: 'world-live-1',
            display_name: 'Carbon Scenario: Net Zero 2050',
            description: 'Live renewable scenario',
            tags: ['carbon-acx', 'scenario', 'net-zero-2050'],
            prompt: 'A renewable future',
            create_time: '2026-01-26T12:00:00Z',
            update_time: '2026-01-26T12:05:00Z',
            output: {
              thumbnail: {
                url: 'https://example.com/thumb.png',
              },
            },
            state: 'COMPLETED',
            model: 'Marble 0.1-mini',
          },
        ],
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await listWorlds()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.worldlabs.ai/marble/v1/worlds:list',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'WLT-Api-Key': 'test-key',
        }),
      })
    )
    expect(response.backend.mode).toBe('live')
    expect(response.worlds[0]).toMatchObject({
      id: 'world-live-1',
      displayName: 'Carbon Scenario: Net Zero 2050',
      status: 'completed',
      scenarioId: 'net-zero-2050',
      category: 'renewable',
      thumbnailUrl: 'https://example.com/thumb.png',
    })
  })

  it('falls back to unavailable mode with demo worlds when the API returns an error', async () => {
    vi.stubEnv('WORLD_LABS_API_KEY', 'test-key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: 503,
              message: 'Renderer unavailable',
            },
          },
          { status: 503 }
        )
      )
    )

    const response = await listWorlds()

    expect(response.backend.mode).toBe('unavailable')
    expect(response.backend.message).toContain('Renderer unavailable')
    expect(response.worlds).toHaveLength(2)
  })

  it('sends the expected generate request for a known scenario', async () => {
    vi.stubEnv('WORLD_LABS_API_KEY', 'test-key')
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        name: 'operations/op-42',
        done: false,
        metadata: {
          status: 'PENDING',
          progress: 0,
        },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const operation = await generateWorldForScenario('current-state')

    expect(operation.id).toBe('op-42')
    expect(operation.status).toBe('pending')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.worldlabs.ai/marble/v1/worlds:generate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: 'Marble 0.1-mini',
          prompt:
            'Urban industrial landscape with factories, traffic congestion, brown smog, coal power plants, showing high carbon emissions and pollution',
          display_name: 'Carbon Scenario: Current State',
          tags: ['carbon-acx', 'scenario', 'current-state'],
          is_public: false,
          aspect_ratio: '16:9',
          output_settings: {
            resolution: '720p',
          },
        }),
      })
    )
  })

  it('normalizes polling results and marks individual fetch failures as failed operations', async () => {
    vi.stubEnv('WORLD_LABS_API_KEY', 'test-key')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          name: 'operations/op-1',
          done: true,
          result: {
            world: {
              id: 'world-1',
              create_time: '2026-01-26T12:00:00Z',
              state: 'COMPLETED',
            },
          },
        })
      )
      .mockRejectedValueOnce(new Error('Timed out'))
    vi.stubGlobal('fetch', fetchMock)

    const operations = await pollOperations(['op-1', 'op-2'])

    expect(operations).toEqual([
      expect.objectContaining({
        id: 'op-1',
        status: 'completed',
        worldId: 'world-1',
      }),
      expect.objectContaining({
        id: 'op-2',
        status: 'failed',
        error: 'Timed out',
      }),
    ])
  })
})
