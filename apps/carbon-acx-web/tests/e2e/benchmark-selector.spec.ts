import { expect, test } from '@playwright/test'

test('calculator keeps benchmark arithmetic separate from routine composition', async ({ page }) => {
  await page.goto('/calculator')
  await expect(page.getByRole('button', { name: 'Change comparison basis' })).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: /Travel.*Trace/ }).click()
  await page.getByRole('button', { name: /Commute/ }).click()
  await page.getByRole('button', { name: /School run by car/ }).click()
  await page.getByLabel(/One-way distance/).fill('8')
  await page.getByLabel(/Travel days per week/).fill('5')
  await page.getByRole('button', { name: 'Save routine' }).click()
  await expect(page.getByText(/691\.2 kg CO₂e\/year/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Change comparison basis' }).click()
  await page.getByRole('combobox', { name: 'Comparison basis' }).selectOption('ontario_average')
  await expect(page.getByText(/Ontario \(2023\)/)).toBeVisible()
  await expect(page.getByText(/context-only territorial production scale/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'See full composition' })).toHaveAttribute('aria-expanded', 'false')
})
