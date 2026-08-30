import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const routes = ['/', '/calculator', '/explore', '/explore/3d', '/learn', '/methodology', '/evidence']
const themes = ['light', 'dark'] as const
const viewports = [
  { name: 'default', size: null },
  { name: '390 × 844', size: { width: 390, height: 844 } },
  { name: '768 × 1024', size: { width: 768, height: 1024 } },
] as const

for (const theme of themes) {
  for (const viewport of viewports) {
    for (const route of routes) {
      test(`no serious or critical accessibility violations on ${route} in ${theme} at ${viewport.name}`, async ({ page }) => {
        await page.addInitScript((savedTheme) => localStorage.setItem('carbon-acx-theme', savedTheme), theme)
        if (viewport.size) await page.setViewportSize(viewport.size)
        await page.goto(route)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        const results = await new AxeBuilder({ page }).analyze()
        const seriousViolations = results.violations.filter(
          (violation) => violation.impact === 'serious' || violation.impact === 'critical',
        )
        expect(seriousViolations).toEqual([])
      })
    }
  }
}

for (const theme of themes) {
  for (const viewport of viewports) {
    test(`calculator controls are touch-sized in ${theme} at ${viewport.name}`, async ({ page }) => {
      await page.addInitScript((savedTheme) => {
        localStorage.setItem('carbon-acx-theme', savedTheme)
        localStorage.removeItem('carbon-acx-calculator-inputs')
      }, theme)
      if (viewport.size) await page.setViewportSize(viewport.size)
      await page.goto('/calculator')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await page.getByRole('button', { name: 'Add School run by car to the worksheet' }).click()

      const actionBoxes = await page.locator('.category-button, .tab-headerbar__actions button, .activity-editor__actions button, .activity-line__actions button').evaluateAll(
        (controls) => controls.map((control) => {
          const { height, width } = control.getBoundingClientRect()
          return { height, width }
        }).filter((box) => box.width > 0 && box.height > 0),
      )
      expect(actionBoxes).not.toEqual([])
      expect(actionBoxes.every((box) => box.height >= 44)).toBe(true)
    })
  }
}

for (const theme of themes) {
  test(`manifest detail preserves focusable verification in ${theme}`, async ({ page }) => {
    await page.addInitScript((savedTheme) => localStorage.setItem('carbon-acx-theme', savedTheme), theme)
    await page.goto('/evidence')
    const manifestHref = await page.locator('#manifests a').first().getAttribute('href')
    expect(manifestHref).toMatch(/^\/evidence\/.+/)
    await page.goto(manifestHref!)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect(page.getByRole('button', { name: 'Verify downloaded bytes' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to Evidence' })).toBeVisible()
  })
}

test('methodology reading path is open and navigable', async ({ page }) => {
  await page.goto('/methodology#primer')
  const primer = page.locator('#primer')
  await expect(primer.locator('details')).toHaveCount(0)
  await expect(primer.getByRole('heading', { name: 'Quantity × factor' })).toBeVisible()
  await expect(page.locator('#benchmarks')).toBeVisible()
})

test('forced colours and reduced motion keep the primary path available', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Forced-colour emulation is Chromium-only in this harness')
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce', contrast: 'more' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Compare a year of travel' })).toBeVisible()
  await expect(page.getByLabel('Annual distance (km)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Car' })).toBeVisible()
})
