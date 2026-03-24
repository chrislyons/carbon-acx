import { describe, expect, it } from 'vitest'

import { getManifests, getRootManifest } from '@/lib/manifests'

describe('manifest loaders', () => {
  it('reads the packaged root manifest', async () => {
    const manifest = await getRootManifest()
    expect(Array.isArray(manifest.figures)).toBe(true)
    expect(manifest.figures.length).toBeGreaterThan(0)
  })

  it('lists packaged figure manifests', async () => {
    const manifests = await getManifests()
    expect(manifests.length).toBeGreaterThan(0)
    expect(manifests[0]?.figure_id).toBeTruthy()
    expect(manifests[0]?.manifest_path).toContain('manifests/')
  })
})
