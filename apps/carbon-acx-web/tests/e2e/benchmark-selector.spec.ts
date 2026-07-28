import { expect, test } from '@playwright/test'

test('calculator traces a 1000 km annual estimate to evidence and Ontario comparison', async ({ page }) => {
  await page.goto('/calculator')
  await page.getByRole('button', { name: /Transport/ }).click()
  await page.getByRole('button', { name: 'Add School run by car' }).click()
  await page.locator('#TRAN\\.SCHOOLRUN\\.CAR\\.KM-quantity').fill('1000')
  await expect(page.getByText('180.0 kg CO₂e/year')).toBeVisible()
  await page.getByRole('button', { name: 'Factor evidence' }).click()
  await expect(page.getByText('EF.CAR.KM')).toBeVisible()
  await page.getByRole('combobox', { name: 'Comparison basis' }).selectOption('ontario_average')
  await expect(page.getByText('production-based, excluding LULUCF')).toBeVisible()
})
