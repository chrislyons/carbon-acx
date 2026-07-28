import { expect, test } from '@playwright/test'

test('calculator surfaces an invalid annual quantity accessibly', async ({ page }) => {
  await page.goto('/calculator')
  await page.getByRole('button', { name: /Transport/ }).click()
  await page.getByRole('button', { name: 'Add School run by car' }).click()
  const input = page.locator('#TRAN\\.SCHOOLRUN\\.CAR\\.KM-quantity')
  const error = page.locator('#TRAN\\.SCHOOLRUN\\.CAR\\.KM-quantity-error')
  await input.fill('-5')
  await expect(error).toHaveText('Enter a positive annual quantity.')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await input.fill('10')
  await expect(error).toHaveCount(0)
  await expect(input).not.toHaveAttribute('aria-invalid', 'true')
})
