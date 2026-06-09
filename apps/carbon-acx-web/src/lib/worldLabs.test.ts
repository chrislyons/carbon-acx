import { describe, expect, it } from 'vitest'
import {
  createTransientWorld,
  getScenarioForTags,
  getScenarioTags,
} from '@/lib/worldLabs'

describe('worldLabs shared helpers', () => {
  it('builds consistent scenario tags for generated worlds', () => {
    expect(getScenarioTags('net-zero-2050')).toEqual([
      'carbon-acx',
      'scenario',
      'net-zero-2050',
    ])
  })

  it('detects the matching scenario from world tags', () => {
    const scenario = getScenarioForTags(['carbon-acx', 'scenario', 'supply-chain'])

    expect(scenario?.id).toBe('supply-chain')
    expect(scenario?.category).toBe('industrial')
  })

  it('creates transient worlds that surface failed operation errors', () => {
    const scenario = getScenarioForTags(['current-state'])
    if (!scenario) {
      throw new Error('Expected current-state scenario to exist.')
    }

    const world = createTransientWorld(scenario, {
      id: 'op-1',
      status: 'failed',
      error: 'The upstream renderer timed out.',
      startedAt: '2026-01-26T12:00:00Z',
    })

    expect(world.id).toBe('operation-op-1')
    expect(world.description).toBe('The upstream renderer timed out.')
    expect(world.status).toBe('failed')
  })
})
