import { expect, test } from '@playwright/test'

test('calculator and manifests smoke flow', async ({ page }) => {
  await page.goto('/calculator')
  await expect(page.getByRole('heading', { name: 'Carbon Calculator' })).toBeVisible()

  await page.locator('input[type="number"]').first().fill('5')
  await page.getByRole('button', { name: /view results/i }).click()
  await expect(page.getByRole('heading', { name: 'Your Carbon Footprint' })).toBeVisible()

  await page.goto('/manifests')
  await expect(page.getByRole('heading', { name: 'Manifest Explorer' })).toBeVisible()
})
