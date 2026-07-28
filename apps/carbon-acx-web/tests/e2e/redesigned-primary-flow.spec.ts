import { expect, test } from '@playwright/test'

test('traces a home estimate into an editable worksheet', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('1,000 kilometres')).toBeVisible()
  await expect(page.getByText('180.0 kg CO₂e/year', { exact: true })).toBeVisible()
  await page.getByLabel('Annual distance').fill('1250')
  await expect(page.getByText('225.0 kg CO₂e/year', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Continue with this estimate' }).click()
  await expect(page.locator('#TRAN\\.SCHOOLRUN\\.CAR\\.KM-quantity')).toHaveValue('1250')
})

test('selects an activity and retains its result in the editing path', async ({ page }) => {
  await page.goto('/calculator')
  await expect(page.getByLabel('Selected activities').getByRole('textbox')).toHaveCount(0)
  await page.getByRole('button', { name: /Transport/ }).click()
  await page.getByRole('button', { name: 'Add School run by car' }).click()
  await page.locator('#TRAN\\.SCHOOLRUN\\.CAR\\.KM-quantity').fill('1000')
  await expect(page.getByText('180.0 kg CO₂e/year', { exact: true })).toBeVisible()
  await expect(page.locator('.compact-reference-list').getByText('Transport')).toBeVisible()
  await expect(page.getByText('1000 kilometres × 180 g CO₂e / kilometres = 180.0 kg CO₂e')).toBeVisible()
})

test('uses explicit Atlas modes and preserves active-mode table scope', async ({ page }) => {
  await page.goto('/explore')
  await expect(page.getByRole('button', { name: /Personal \/ household/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/Military/)).toHaveCount(0)
  await page.getByRole('button', { name: /Canadian systems/ }).click()
  await page.getByRole('button', { name: 'stream Not available' }).click()
  await expect(page.getByText('No numeric zero is substituted.')).toBeVisible()
  await page.getByRole('button', { name: /Industrial layers/ }).click()
  await expect(page.getByText(/Military/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Data table' }).click()
  await expect(page.getByRole('table')).toBeVisible()
})
