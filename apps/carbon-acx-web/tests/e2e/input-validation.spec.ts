import { expect, test } from '@playwright/test'

test('calculator surfaces invalid routine terms and focuses the first error', async ({ page }) => {
  await page.goto('/calculator')
  await page.getByRole('button', { name: /Travel.*Trace/ }).click()
  await page.getByRole('button', { name: /Commute/ }).click()
  await page.getByRole('button', { name: /School run by car/ }).click()
  const distance = page.getByLabel(/One-way distance/)
  await distance.fill('-5')
  await page.getByRole('button', { name: 'Save routine' }).click()
  await expect(distance).toHaveAttribute('aria-invalid', 'true')
  await expect(distance).toBeFocused()
  await expect(page.locator('.routine-line--active .field-error').first()).toContainText('greater than zero')
  await distance.fill('8')
  await page.getByLabel(/Travel days per week/).fill('5')
  await expect(page.getByText(/3,840 passenger-kilometres\/year/)).toBeVisible()
  await page.getByRole('button', { name: 'Save routine' }).click()
  await expect(page.locator('.routine-line--compact')).toBeVisible()
})
