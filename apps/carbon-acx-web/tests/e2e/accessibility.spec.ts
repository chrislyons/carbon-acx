import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const routes = ['/', '/calculator', '/explore', '/explore/3d', '/learn', '/methodology']
const viewports = [
  { name: 'default', size: null },
  { name: '390 × 844', size: { width: 390, height: 844 } },
] as const

for (const viewport of viewports) {
  for (const route of routes) {
    test(`no serious or critical accessibility violations on ${route} at ${viewport.name}`, async ({ page }) => {
      if (viewport.size) await page.setViewportSize(viewport.size)
      await page.goto(route)
      const results = await new AxeBuilder({ page }).analyze()
      const seriousViolations = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      )
      expect(seriousViolations).toEqual([])
    })
  }
}

test('methodology primer disclosure is open and navigable', async ({ page }) => {
  await page.goto('/methodology#primer')
  const primer = page.locator('#primer')
  await expect(primer.locator('details[open]')).toHaveCount(1)
  await expect(primer.getByRole('heading', { name: 'What is the equation?' })).toBeVisible()
})
