import { expect, test } from '@playwright/test'

test('Activity Atlas labels unavailable data instead of zero', async ({ page }) => {
  await page.goto('/explore')
  await page.getByRole('button', { name: /Canadian systems/ }).click()
  await page.getByRole('button', { name: 'stream Not available' }).click()
  await expect(page.locator('.detail-pane').getByText('Not available')).toBeVisible()
  await expect(page.getByText('No numeric zero is substituted.')).toBeVisible()
})

test('3D route falls back to the same accessible calculated result', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    localStorage.setItem('carbon-acx-calculator-inputs', JSON.stringify({ 'TRAN.SCHOOLRUN.CAR.KM': 1000 }))
  })
  await page.goto('/explore/3d')

  await expect(page.getByText('2D representation in use')).toBeVisible()
  await expect(page.getByText('180.0 kg CO₂e').first()).toBeVisible()
  await page.getByRole('button', { name: 'Inspect evidence' }).click()
  await expect(page.locator('details[open]').getByText(/Environment and Climate Change Canada/)).toBeVisible()
})
