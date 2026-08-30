import { expect, test } from '@playwright/test'

test('published Atlas and calculator records expose narrative detail and linked evidence', async ({ page }) => {
  await page.goto('/explore')
  await page.getByRole('button', { name: 'School run by car Published' }).click()
  for (const heading of ['What this measures', 'Where the data comes from', 'How to use this record', 'Limits', 'Worked arithmetic']) {
    await expect(page.locator('.detail-pane').getByRole('heading', { name: heading })).toBeVisible()
  }
  await expect(page.locator('.detail-pane').getByRole('link', { name: /Environment and Climate Change Canada/ })).toHaveAttribute('href', /canada\.ca\/en\/environment-climate-change/)

  await page.goto('/calculator')
  await page.getByRole('button', { name: /Transport/ }).click()
  await page.getByRole('button', { name: 'Add School run by car to the worksheet' }).click()
  await page.locator('[id="TRAN.SCHOOLRUN.CAR.KM-quantity"]').fill('1000')
  await page.getByRole('button', { name: 'Factor evidence' }).click()
  await expect(page.getByRole('heading', { name: 'What this measures' })).toBeVisible()
  await expect(page.getByText(/1,000 km × 180 g CO₂e/)).toBeVisible()
  await expect(page.locator('.worksheet-evidence-pane').getByRole('link', { name: /Environment and Climate Change Canada/ })).toHaveAttribute('href', /canada\.ca\/en\/environment-climate-change/)
})

test('Activity Atlas labels Not available data instead of zero', async ({ page }) => {
  await page.goto('/explore')
  await page.getByRole('button', { name: /Services & infrastructure/ }).click()
  await page.locator('.atlas-record').filter({ hasText: 'Not available' }).first().click()
  await expect(page.locator('.detail-pane .evidence-badge')).toHaveText('Not available')
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
  await expect(page.locator('.three-d-page__detail').getByText(/Environment and Climate Change Canada/)).toBeVisible()
})
