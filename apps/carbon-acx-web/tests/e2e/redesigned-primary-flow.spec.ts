import { expect, test, type Page } from '@playwright/test'

async function chooseActivity(page: Page, activityName: string) {
  await page.getByRole('button', { name: /Travel.*Trace a familiar pattern/ }).click()
  await page.getByRole('button', { name: /Commute/ }).click()
  await page.getByRole('button', { name: new RegExp(activityName) }).click()
}

async function fillCommute(page: Page) {
  await page.getByLabel(/One-way distance/).fill('8')
  await page.getByLabel(/Travel days per week/).fill('5')
}

test('front door leads with the worked commute routine', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'What does one school run look like over a year?' })).toBeVisible()
  await expect(page.getByLabel(/One-way distance/)).toHaveValue('8')
  await expect(page.getByLabel(/Legs per travel day/)).toHaveValue('2')
  await expect(page.getByLabel(/Travel days per week/)).toHaveValue('5')
  await expect(page.getByLabel(/Weeks per year/)).toHaveValue('48')
  await expect(page.getByText('3,840 passenger-kilometres/year', { exact: true })).toBeVisible()
  await expect(page.getByText(/691\.2 kg CO₂e\/year/).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Continue with this routine' })).toHaveAttribute('href', /\/calculator\?data=/)
  await expect(page.getByRole('link', { name: 'Learn how the equation works' })).toHaveAttribute('href', '/methodology#primer')
  await expect(page.getByRole('link', { name: 'Inspect the evidence library' })).toHaveAttribute('href', '/explore')
})

test('homepage mode changes preserve commute cadence', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Subway/ }).click()
  await expect(page.getByLabel(/One-way distance/)).toHaveValue('8')
  await expect(page.getByLabel(/Legs per travel day/)).toHaveValue('2')
  await expect(page.getByLabel(/Travel days per week/)).toHaveValue('5')
  await expect(page.getByLabel(/Weeks per year/)).toHaveValue('48')
  await expect(page.getByText(/18\.3 kg CO₂e\/year/).first()).toBeVisible()
})

test('methodology explains routine grammar and car assumption', async ({ page }) => {
  await page.goto('/methodology#primer')
  await expect(page.getByRole('heading', { name: 'What is the equation?' })).toBeVisible()
  await expect(page.getByText(/8 km\/leg × 2 legs\/travel day × 5 travel days\/week × 48 weeks\/year/).first()).toBeVisible()
  await expect(page.getByText(/one passenger when occupancy is unspecified/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open this routine in the calculator' })).toHaveAttribute('href', /\/calculator\?data=/)
})

test('Learn shows one focused card and a guided next example', async ({ page }) => {
  await page.goto('/learn')
  await expect(page.locator('.learning-card')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'School run by car' })).toBeFocused()
  await page.getByRole('button', { name: 'Next example' }).click()
  await expect(page.getByRole('heading', { name: /Office building energy/ })).toBeFocused()
  await page.getByRole('button', { name: 'Browse all examples' }).click()
  await expect(page.locator('.learning-sequence__list')).toBeVisible()
})

test('calculator saves a worked commute and keeps the first viewport compact', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/calculator')
  await chooseActivity(page, 'School run by car')
  await fillCommute(page)
  await expect(page.getByText(/3,840 passenger-kilometres\/year/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Save routine' }).click()
  await page.goto('/calculator')
  await expect(page.locator('.routine-line--compact')).toContainText('School run by car')
  await expect(page.getByText(/691\.2 kg CO₂e\/year/).first()).toBeVisible()
  const boxes = await page.locator('.routine-line--compact, .routine-summary--inline, .routine-continuation').evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect()
    return { top: rect.top, bottom: rect.bottom }
  }))
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  expect(boxes.every((box) => box.top >= 0 && box.bottom <= 844)).toBe(true)
})

test('different-return commute creates two independent lines', async ({ page }) => {
  await page.goto('/calculator')
  await chooseActivity(page, 'School run by car')
  await fillCommute(page)
  await page.getByRole('button', { name: 'My return journey differs' }).click()
  await expect(page.getByRole('heading', { name: 'Choose your return journey' })).toBeVisible()
  await expect(page.getByRole('button', { name: /School run by car/ })).toHaveCount(0)
  await page.getByRole('button', { name: /Toronto subway/ }).click()
  await expect(page.getByLabel(/Legs per travel day/)).toHaveValue('1')
  await page.getByRole('button', { name: 'Save both journeys' }).click()
  await expect(page.locator('.routine-line--compact')).toHaveCount(2)
  await expect(page.locator('.routine-line--compact').nth(0)).toContainText('School run by car')
  await expect(page.locator('.routine-line--compact').nth(1)).toContainText('Toronto subway')
})

test('compatible commute comparison clones cadence into a second line', async ({ page }) => {
  await page.goto('/calculator')
  await chooseActivity(page, 'School run by car')
  await fillCommute(page)
  await page.getByRole('button', { name: 'Save routine' }).click()
  await page.getByRole('button', { name: /Compare with School run by bike/ }).click()
  await expect(page.getByLabel(/One-way distance/)).toHaveValue('8')
  await expect(page.getByLabel(/Legs per travel day/)).toHaveValue('2')
  await expect(page.getByLabel(/Travel days per week/)).toHaveValue('5')
  await expect(page.getByLabel(/Weeks per year/)).toHaveValue('48')
  await page.getByRole('button', { name: 'Save routine' }).click()
  await expect(page.locator('.routine-line--compact')).toHaveCount(2)
  await expect(page.locator('.routine-line--compact').nth(1)).toContainText('School run by bike')
})

test('browse, duplicate, evidence, benchmark, and composition disclosures remain operable', async ({ page }) => {
  await page.goto('/calculator')
  await chooseActivity(page, 'School run by car')
  await fillCommute(page)
  await page.getByRole('button', { name: 'Save routine' }).click()
  await page.getByText('Browse all activities', { exact: true }).click()
  await expect(page.getByRole('button', { name: 'Edit School run by car routine' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit School run by car routine' }).click()
  await expect(page.locator('.sr-only[aria-live="polite"]')).toContainText('already in your routines')
  await page.getByRole('button', { name: 'Cancel' }).click()
  const evidence = page.locator('button[id^="evidence-trigger-"]').first()
  await evidence.click()
  await expect(page.locator('.detail-pane h2')).toBeFocused()
  await page.getByRole('button', { name: 'Close evidence' }).click()
  await expect(evidence).toBeFocused()
  await page.getByRole('button', { name: 'Change comparison basis' }).click()
  await page.getByRole('combobox', { name: 'Comparison basis' }).selectOption('ontario_average')
  await expect(page.getByText(/Ontario \(2023\)/)).toBeVisible()
  await page.getByRole('button', { name: 'See full composition' }).click()
  await expect(page.locator('.impact-composition')).toBeVisible()
  await page.getByRole('button', { name: 'Clear worksheet' }).click()
  await expect(page.getByRole('heading', { name: 'What would you like to trace?' })).toBeVisible()
  await expect(page.locator('.routine-line')).toHaveCount(0)
})

test('invalid home input preserves the last valid routine result', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/One-way distance/).fill('10')
  await expect(page.getByText(/864\.0 kg CO₂e\/year/).first()).toBeVisible()
  await page.getByLabel(/One-way distance/).fill('')
  await expect(page.locator('p.field-error[role="alert"]')).toContainText('positive values')
  await expect(page.getByText(/864\.0 kg CO₂e\/year/).first()).toBeVisible()
})

for (const route of ['/', '/calculator', '/explore', '/explore/3d', '/learn', '/methodology', '/manifests']) {
  test(`mobile route ${route} has no document overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(route)
    await expect(page.locator('main')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
}
