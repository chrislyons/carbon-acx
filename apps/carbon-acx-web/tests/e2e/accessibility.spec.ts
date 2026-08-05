import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const route of ['/', '/calculator', '/explore', '/explore/3d', '/learn', '/methodology']) {
  test(`no serious or critical accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route)
    const results = await new AxeBuilder({ page }).analyze()
    const seriousViolations = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    )
    expect(seriousViolations).toEqual([])
  })
}

test('methodology primer disclosure is open and navigable', async ({ page }) => {
  await page.goto('/methodology#primer')
  const primer = page.locator('#primer')
  await expect(primer.locator('details[open]')).toHaveCount(1)
  await expect(primer.getByRole('heading', { name: 'What is the equation?' })).toBeVisible()
})
