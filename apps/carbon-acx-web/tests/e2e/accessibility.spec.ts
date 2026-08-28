import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const routes = ['/', '/calculator', '/explore', '/explore/3d', '/learn', '/methodology']
const themes = ['light', 'dark'] as const
const viewports = [
  { name: 'default', size: null },
  { name: '390 × 844', size: { width: 390, height: 844 } },
] as const

for (const theme of themes) {
  for (const viewport of viewports) {
    for (const route of routes) {
      test(`no serious or critical accessibility violations on ${route} in ${theme} at ${viewport.name}`, async ({ page }) => {
        await page.addInitScript((savedTheme) => localStorage.setItem('carbon-acx-theme', savedTheme), theme)
        if (viewport.size) await page.setViewportSize(viewport.size)
        await page.goto(route)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await page.waitForTimeout(250)
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
    test(`calculator action controls are touch-sized and non-overlapping in ${theme} at ${viewport.name}`, async ({ page }) => {
      await page.addInitScript((savedTheme) => localStorage.setItem('carbon-acx-theme', savedTheme), theme)
      if (viewport.size) await page.setViewportSize(viewport.size)
      await page.goto('/calculator')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await page.locator('.category-button').first().click()
      await page.getByRole('button', { name: /^Add / }).first().click()

      const actionBoxes = await page.locator('.category-button, button.text-link, .worksheet__actions button').evaluateAll(
        (controls) => controls.map((control) => {
          const { left, right, top, bottom, height } = control.getBoundingClientRect()
          return { left, right, top, bottom, height }
        }),
      )
      expect(actionBoxes).not.toEqual([])
      expect(actionBoxes.every((box) => box.height >= 44)).toBe(true)

      const [evidence, remove] = await Promise.all([
        page.getByRole('button', { name: 'Factor evidence' }).boundingBox(),
        page.getByRole('button', { name: 'Remove' }).boundingBox(),
      ])
      expect(evidence).not.toBeNull()
      expect(remove).not.toBeNull()
      expect(
        evidence!.x + evidence!.width <= remove!.x
        || remove!.x + remove!.width <= evidence!.x
        || evidence!.y + evidence!.height <= remove!.y
        || remove!.y + remove!.height <= evidence!.y,
      ).toBe(true)
    })
  }
}

for (const theme of themes) {
  for (const route of routes) {
    test(`visible action controls meet the touch target on ${route} in ${theme}`, async ({ page }) => {
      await page.addInitScript((savedTheme) => localStorage.setItem('carbon-acx-theme', savedTheme), theme)
      await page.goto(route)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      const undersized = await page.locator('header button, main button').evaluateAll(
        (controls) => controls
          .map((control) => {
            const { height, width } = control.getBoundingClientRect()
            return { name: control.getAttribute('aria-label') ?? control.textContent?.trim(), height, width }
          })
          .filter((control) => control.width > 0 && control.height > 0 && control.height < 44),
      )
      expect(undersized).toEqual([])
    })
  }
}

test('methodology primer disclosure is open and navigable', async ({ page }) => {
  await page.goto('/methodology#primer')
  const primer = page.locator('#primer')
  await expect(primer.locator('details')).toHaveCount(0)
  await expect(primer.getByRole('heading', { name: 'What is the equation?' })).toBeVisible()
})
