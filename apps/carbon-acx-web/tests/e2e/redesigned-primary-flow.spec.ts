import { expect, test } from '@playwright/test'

test('front door presents three explicit jobs', async ({ page }) => {
  await page.goto('/')
  const jobs = [
    ['Understand a carbon estimate', '/methodology#primer'],
    ['Estimate an activity', '/calculator'],
    ['Inspect the evidence', '/explore'],
  ] as const
  for (const [name, href] of jobs) {
    await expect(page.getByRole('link', { name, exact: true })).toHaveAttribute('href', href)
  }
})
test('methodology primer explains the derived school-run record', async ({ page }) => {
  await page.goto('/methodology#primer')
  await expect(page.getByRole('heading', { name: 'Learn how to read a carbon estimate' })).toBeVisible()
  for (const question of [
    'What is the equation?',
    'What period does it cover?',
    'What is inside the boundary?',
    'Which region and vintage apply?',
    'How should uncertainty be read?',
    'What happens when evidence is missing?',
  ]) {
    await expect(page.getByRole('heading', { name: question })).toBeVisible()
  }
  await expect(page.getByText('1,000 kilometres × 180 g CO₂e / kilometre = 180.0 kg CO₂e/year', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Unavailable evidence is excluded from totals rather than converted to zero.')).toBeVisible()
  await expect(page.locator('#primer details[open]')).toHaveCount(1)
})

test('methodology shows the offline OWID context and release links', async ({ page }) => {
  await page.route('**/*ourworldindata.org/**', (route) => route.abort())
  await page.goto('/methodology')
  await expect(page.getByRole('heading', { name: 'Our World in Data context' })).toBeVisible()
  await expect(page.getByText('Latest Canada value', { exact: true })).toBeVisible()
  await expect(page.getByText('territorial', { exact: true })).toBeVisible()
  await expect(page.getByText('excluded', { exact: true })).toBeVisible()
  await expect(page.getByText('country production', { exact: true })).toBeVisible()
  await expect(page.getByText('tonnes', { exact: true })).toBeVisible()
  await expect(page.getByText('Inspect the latest five annual values')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open the offline context record' })).toHaveAttribute(
    'href',
    '/data/owid-context.json',
  )
  await expect(page.getByRole('link', { name: 'Open the release manifest' })).toHaveAttribute(
    'href',
    '/data/release.json',
  )
  await expect(page.locator('.owid-context a[href="/data/owid/annual-co2-emissions-per-country.csv"]')).toHaveCount(1)
  await expect(page.locator('.owid-context a[href="/data/owid/annual-co2-emissions-per-country.metadata.json"]')).toHaveCount(1)
  await expect(page.locator('.owid-context a[href="/data/owid/manifest.json"]')).toHaveCount(1)
  await expect(page.locator('.owid-context a[href="https://ourworldindata.org/grapher/annual-co2-emissions-per-country"]')).toHaveCount(1)
})

test('learn route renders offline published case studies when OWID is unreachable', async ({ page }) => {
  await page.route('**/*ourworldindata.org/**', (route) => route.abort())
  await page.goto('/learn')
  await expect(page.getByRole('heading', { name: 'Read a carbon estimate from the record outward.' })).toBeVisible()
  await expect(page.getByText('Household school travel')).toBeVisible()
  await expect(page.getByText('Small-organization office area')).toBeVisible()
  await expect(page.getByText('Canadian-system electricity')).toBeVisible()
  await expect(page.getByText(/8\.00 t CO₂e/)).toBeVisible()
  await expect(page.getByText(/2\.8 kg CO₂e/)).toBeVisible()
  await expect(page.getByText('No numeric value is substituted.')).toHaveCount(0)
})

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
] as const) {
  test(`mobile navigation disclosure works at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const openButton = page.getByRole('button', { name: 'Open navigation' })
    await expect(openButton).toHaveAttribute('aria-expanded', 'false')
    await expect(openButton).toHaveAttribute('aria-controls', 'mobile-primary-navigation')
    await openButton.click()
    const mobileNavigation = page.locator('#mobile-primary-navigation')
    await expect(mobileNavigation).toBeVisible()
    await expect(mobileNavigation.getByRole('link')).toHaveCount(5)
    await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true')
    await mobileNavigation.getByRole('link', { name: 'Learn', exact: true }).click()
    await expect(page).toHaveURL(/\/learn$/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
  })
}

test('preserves the home, calculator, and Atlas flow at 390 × 844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.impact-trace__marker-label')).toContainText('1,000 kilometres')
  await expect(page.getByText('180.0 kg CO₂e/year', { exact: true })).toBeVisible()
  await page.getByLabel('Annual distance').fill('1250')
  await expect(page.getByText('225.0 kg CO₂e/year', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Continue with this estimate' }).click()
  await expect(page).toHaveURL(/\/calculator\?data=/)
  await expect(page.locator('#TRAN\\.SCHOOLRUN\\.CAR\\.KM-quantity')).toHaveValue('1250')

  await page.getByRole('button', { name: /Transport/ }).click()
  await page.locator('#TRAN\\.SCHOOLRUN\\.CAR\\.KM-quantity').fill('1000')
  await expect(page.getByText('180.0 kg CO₂e/year', { exact: true })).toBeVisible()
  await expect(page.locator('.compact-reference-list').getByText('Transport')).toBeVisible()
  await expect(page.getByText('1000 kilometres × 180 g CO₂e / kilometres = 180.0 kg CO₂e')).toBeVisible()

  await page.goto('/explore')
  await expect(page.getByRole('button', { name: /Personal \/ household/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /Canadian systems/ }).click()
  await page.locator('.atlas-record').filter({ hasText: 'Unavailable' }).first().click()
  await expect(page.getByText('No numeric zero is substituted.')).toBeVisible()
  await page.getByRole('button', { name: /Industrial layers/ }).click()
  await expect(page.locator('.data-matrix').getByText(/Military/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Data table' }).click()
  await expect(page.getByRole('table')).toBeVisible()
})

for (const route of ['/', '/calculator', '/explore', '/explore/3d', '/learn', '/methodology', '/manifests']) {
  test(`mobile route ${route} has a visible main and no document overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(route)
    await expect(page.locator('main')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
}

test('traces a home estimate into an editable worksheet', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.impact-trace__marker-label')).toContainText('1,000 kilometres')
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
  await page.getByRole('button', { name: 'Add School run by car to your activity basket' }).click()
  await page.locator('#TRAN\\.SCHOOLRUN\\.CAR\\.KM-quantity').fill('1000')
  await expect(page.getByText('180.0 kg CO₂e/year', { exact: true })).toBeVisible()
  await expect(page.locator('.compact-reference-list').getByText('Transport')).toBeVisible()
  await expect(page.getByText('1000 kilometres × 180 g CO₂e / kilometres = 180.0 kg CO₂e')).toBeVisible()
})
test('basket composes cross-category impacts and benchmark context', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto('/calculator')
  await page.getByRole('button', { name: /Transport/ }).click()
  await page.getByRole('button', { name: 'Add School run by car to your activity basket' }).click()
  await page.getByRole('button', { name: /Food & drink/ }).click()
  await page.getByRole('button', { name: 'Add Meal with beef to your activity basket' }).click()
  await page.locator('[id="TRAN.SCHOOLRUN.CAR.KM-quantity"]').fill('1000')
  await page.locator('[id="FOOD.MEAL.BEEF.SERVING-quantity"]').fill('10')
  await expect(page.getByText('Your activity basket (2)', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Categories in basket: Transport, Food & drink' })).toBeVisible()
  await expect(page.getByText('270.0 kg CO₂e/year', { exact: true })).toBeVisible()
  await expect(page.getByText('Range: 54.0 kg CO₂e–123.0 kg CO₂e', { exact: true })).toBeVisible()
  await page.getByLabel('Comparison basis').selectOption('ontario_average')
  await expect(page.getByText(/2\.9% of this scale/)).toBeVisible()
  await expect(page.locator('.impact-rank__label')).toHaveCount(2)
  await expect(page.locator('.impact-flow svg')).toBeVisible()
})

test('uses explicit Atlas modes and preserves active-mode table scope', async ({ page }) => {
  await page.goto('/explore')
  await expect(page.getByRole('toolbar', { name: 'Activity Atlas filters' })).toBeVisible()
  await expect(page.getByText(/Military/)).toHaveCount(0)
  await page.getByRole('button', { name: /Canadian systems/ }).click()
  await page.locator('.atlas-record').filter({ hasText: 'Unavailable' }).first().click()
  await expect(page.getByText('No numeric zero is substituted.')).toBeVisible()
  await page.getByRole('button', { name: /Industrial layers/ }).click()
  await expect(page.locator('.data-matrix').getByText(/Military/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Data table' }).click()
  await expect(page.getByRole('table')).toBeVisible()
})

test('calculator keeps visual and DOM source order at 320 × 800', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/calculator')
  await expect(page.locator('main')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await expect(page.locator('.worksheet__body').evaluate((element) => [...element.children].map((child) => child.className))).resolves.toEqual([
    'worksheet__editors',
    'result-composition',
  ])
})

test('invalid Home input preserves the last valid result', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Annual distance').fill('1250')
  await expect(page.getByText('225.0 kg CO₂e/year', { exact: true })).toBeVisible()
  await page.getByLabel('Annual distance').fill('')
  await expect(page.locator('#trace-distance-error')).toContainText('Showing the last valid amount.')
  await expect(page.getByText('225.0 kg CO₂e/year', { exact: true })).toBeVisible()
})

test('basket prevents duplicate adds and restores evidence focus', async ({ page }) => {
  await page.goto('/calculator')
  const addButton = page.getByRole('button', { name: 'Add School run by car to your activity basket' })
  await addButton.click()
  await expect(addButton).toBeFocused()
  await addButton.evaluate((button) => (button as HTMLButtonElement).click())
  await expect(page.locator('.sr-only[aria-live="polite"]')).toContainText('already in your activity basket')
  await expect(page.getByText('Your activity basket (1)', { exact: true })).toBeVisible()
  await page.locator('[id="TRAN.SCHOOLRUN.CAR.KM-quantity"]').fill('1000')
  const trigger = page.getByRole('button', { name: 'Factor evidence' })
  await trigger.click()
  await expect(page.locator('.detail-pane').getByRole('heading', { name: 'School run by car' })).toBeFocused()
  await page.getByRole('button', { name: 'Close evidence' }).click()
  await expect(trigger).toBeFocused()
})

test('published bicycle zero stays ranked without entering the flow', async ({ page }) => {
  await page.goto('/calculator')
  await page.getByRole('button', { name: /Transport/ }).click()
  await page.getByRole('button', { name: 'Add School run by bike to your activity basket' }).click()
  await page.locator('[id="TRAN.SCHOOLRUN.BIKE.KM-quantity"]').fill('1000')
  await expect(page.getByText('0 g CO₂e/year', { exact: true })).toBeVisible()
  await expect(page.locator('.impact-rank__zero')).toContainText('Published zero')
  await expect(page.locator('.impact-flow svg')).toHaveCount(0)
})
