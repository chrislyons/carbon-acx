import { expect, test } from '@playwright/test'

const routineShare = Buffer.from(JSON.stringify({
  v: 2,
  lines: [{
    key: 'activity:TRAN.SCHOOLRUN.CAR.KM',
    source: 'activity',
    activityId: 'TRAN.SCHOOLRUN.CAR.KM',
    recipeKind: 'commute',
    values: { oneWayKm: '8', legsPerDay: '2', travelDaysPerWeek: '5', weeksPerYear: '48' },
  }],
})).toString('base64url')

test('published Atlas records expose narrative detail and linked evidence', async ({ page }) => {
  await page.goto('/explore')
  await expect(page.getByRole('button', { name: /Personal \/ household/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('details').filter({ hasText: 'Narrow these results' })).not.toHaveAttribute('open', '')
  await page.locator('.atlas-record').filter({ hasText: 'School run by car' }).first().click()
  for (const heading of ['What this measures', 'Where the data comes from', 'How to use this record', 'Limits', 'Worked arithmetic']) {
    await expect(page.locator('.detail-pane').getByRole('heading', { name: heading })).toBeVisible()
  }
  await expect(page.locator('.detail-pane').getByRole('link', { name: /Environment and Climate Change Canada/ })).toHaveAttribute('href', /canada\.ca\/en\/environment-climate-change/)
})

test('Atlas filters and table are closed until deliberately opened', async ({ page }) => {
  await page.goto('/explore')
  await expect(page.locator('.atlas__filter-disclosure').getByText('Category', { exact: true })).toHaveCount(0)
  await page.getByText('Narrow these results', { exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Category' })).toBeVisible()
  await expect(page.getByText('View all records', { exact: true })).toBeVisible()
  await expect(page.getByRole('table')).toHaveCount(0)
  await page.getByText('View all records', { exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
})

test('3D route renders the same published routine result and evidence', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript((encoded) => localStorage.setItem('carbon-acx-routine-workbook-v2', encoded), routineShare)
  await page.goto('/explore/3d')
  await expect(page.getByText('2D representation in use')).toBeVisible()
  await expect(page.getByText(/691\.2 kg CO₂e/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Inspect evidence' }).click()
  await expect(page.getByRole('heading', { name: 'What this measures' })).toBeVisible()
  await expect(page.getByText(/Passengers default to one/)).toBeVisible()
})
