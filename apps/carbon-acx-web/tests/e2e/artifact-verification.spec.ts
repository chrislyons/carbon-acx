import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

async function resolveArtifactPath(
  artifactsDirectory: string,
  primaryPath: string,
  fallbackPath?: string,
): Promise<string> {
  const candidates = [primaryPath, fallbackPath].filter((candidate): candidate is string => Boolean(candidate))
  for (const candidate of candidates) {
    try {
      await readFile(path.join(artifactsDirectory, candidate))
      return candidate
    } catch {
      // Try the next published path.
    }
  }
  throw new Error(`No published artifact exists for ${primaryPath}`)
}


test('browser verifier distinguishes matching and mismatched artifact bytes', async ({ page }) => {
  const artifactsDirectory = path.resolve(process.cwd(), '../../dist/artifacts')
  const root = JSON.parse(await readFile(path.join(artifactsDirectory, 'manifest.json'), 'utf-8'))
  const manifestReference = root.figures[0].manifests.find((item: { preferred?: boolean }) => item.preferred) ?? root.figures[0].manifests[0]
  const manifest = JSON.parse(await readFile(path.join(artifactsDirectory, manifestReference.path), 'utf-8'))
  const figurePath = await resolveArtifactPath(artifactsDirectory, manifest.figure_path, manifest.legacy_figure_path)
  const figure = await readFile(path.join(artifactsDirectory, figurePath))
  const artifactUrl = `**/artifacts/${figurePath}`

  await page.route(artifactUrl, async (route) => {
    await route.fulfill({ body: figure, contentType: 'application/json' })
  })
  await page.goto(`/evidence/${manifest.hash_prefix}`)
  await page.getByRole('button', { name: 'Verify downloaded bytes' }).click()
  await expect(page.getByText('Verified', { exact: true })).toBeVisible()

  await page.unroute(artifactUrl)
  await page.route(artifactUrl, async (route) => {
    await route.fulfill({ body: '{"corrupt":true}', contentType: 'application/json' })
  })
  await page.getByRole('button', { name: 'Verify again' }).click()
  await expect(page.getByText('Hash mismatch')).toBeVisible()
})
