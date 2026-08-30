import { expect, test } from '@playwright/test'

test('public routes use six-link adaptive evidence-first navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Compare a year of travel' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav.getByRole('link')).toHaveCount(6)
  for (const label of ['Home', 'Calculator', 'Explore', 'Learn', 'Methodology', 'Evidence']) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible()
  }
  await expect(page.getByRole('button', { name: /navigation/i })).toHaveCount(0)
})
