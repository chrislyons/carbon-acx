import { expect, test } from '@playwright/test'

test('public routes use editorial evidence-first navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your annual commute.' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Calculator' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Explore' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Methodology' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Evidence' })).toBeVisible()
})
