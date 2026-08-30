import { expect, test } from '@playwright/test'

test('front door presents three ordered jobs', async ({ page }) => {
  await page.goto('/')
  const jobs = [
    ['Read the six-step method', '/methodology#primer'],
    ['Build the worksheet', '/calculator'],
    ['Inspect the Activity Atlas', '/explore'],
  ] as const
  for (const [name, href] of jobs) {
    await expect(page.getByRole('link', { name, exact: true })).toHaveAttribute('href', href)
  }
})

test('backslash toggles theme outside text entry only', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('carbon-acx-theme'))
  await page.goto('/calculator')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Add School run by car to the worksheet' }).click()

  const quantity = page.locator('[id="TRAN.SCHOOLRUN.CAR.KM-quantity"]')
  await quantity.focus()
  await page.keyboard.press('\\')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.getByRole('heading', { name: 'Calculator' }).click()
  await page.keyboard.press('\\')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.keyboard.press('\\')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('theme precedence follows saved override, then system preference', async ({ browser }) => {
  const savedDarkContext = await browser.newContext({ colorScheme: 'light' })
  const savedDarkPage = await savedDarkContext.newPage()
  await savedDarkPage.addInitScript(() => localStorage.setItem('carbon-acx-theme', 'dark'))
  await savedDarkPage.goto('/')
  await expect(savedDarkPage.locator('html')).toHaveAttribute('data-theme', 'dark')
  await savedDarkContext.close()

  const savedLightContext = await browser.newContext({ colorScheme: 'dark' })
  const savedLightPage = await savedLightContext.newPage()
  await savedLightPage.addInitScript(() => localStorage.setItem('carbon-acx-theme', 'light'))
  await savedLightPage.goto('/')
  await expect(savedLightPage.locator('html')).toHaveAttribute('data-theme', 'light')
  await savedLightContext.close()

  const systemContext = await browser.newContext({ colorScheme: 'dark' })
  const systemPage = await systemContext.newPage()
  await systemPage.addInitScript(() => localStorage.removeItem('carbon-acx-theme'))
  await systemPage.goto('/')
  await expect(systemPage.locator('html')).toHaveAttribute('data-theme', 'dark')
  await systemContext.close()
})

test('methodology presents the six-step generated worked example', async ({ page }) => {
  await page.goto('/methodology#primer')
  await expect(page.getByRole('heading', { name: 'Six rules keep an estimate legible' })).toBeVisible()
  for (const step of ['Quantity × factor', 'Annual period', 'Boundary', 'Region + vintage', 'Uncertainty', 'Missing evidence']) {
    await expect(page.getByRole('heading', { name: step })).toBeVisible()
  }
  await expect(page.getByText('1,000 km × 180 g CO₂e / km = 180.0 kg CO₂e/yr', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/Not available evidence is excluded from totals/)).toBeVisible()
  await expect(page.locator('#primer details')).toHaveCount(0)
  await expect(page.locator('#benchmarks')).toBeVisible()
})

test('evidence shows the derived trust path, context, release, and manifest links', async ({ page }) => {
  await page.route('**/*ourworldindata.org/**', (route) => route.abort())
  await page.goto('/evidence')
  for (const label of ['Published records', 'Registered sources', 'Context/benchmarks', 'Versioned artifacts']) {
    await expect(page.locator('.trust-path strong').filter({ hasText: label })).toBeVisible()
  }
  await expect(page.getByRole('heading', { name: 'Our World in Data context' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open the data-stream catalog' })).toHaveAttribute('href', '/data/stream-catalog.json')
  await expect(page.locator('#release')).toContainText('Offline release metadata')
  await expect(page.locator('#manifests a').first()).toHaveAttribute('href', /\/evidence\/.+/)
})

test('learn route renders the three generated scale examples', async ({ page }) => {
  await page.goto('/learn')
  await expect(page.getByText('Three scales, not a magnitude ranking.', { exact: false })).toBeVisible()
  for (const label of ['Household activity', 'Small organization', 'Canadian system']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }
  await expect(page.locator('.learning-card')).toHaveCount(3)
  await expect(page.locator('.learning-card .evidence-facts')).toHaveCount(3)
  await expect(page.locator('.learning-card details')).toHaveCount(3)
})

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
] as const) {
  test(`compact navigation is an ordinary six-link rail at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Primary' })
    await expect(nav.getByRole('link')).toHaveCount(6)
    await expect(page.getByRole('button', { name: /navigation/i })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
  })
}

test('Home invalid distance suppresses the chart and continuation until recovery', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(250)
  const distance = page.getByLabel('Annual distance (km)')
  await distance.fill('9')
  await expect(page.locator('#annual-distance-error')).toContainText('Enter a distance from 10 to 200,000 km.')
  await expect(page.locator('.impact-trace')).toHaveCount(0)
  await expect(page.locator('.trace-estimate a')).toHaveCount(0)
  await expect(page.getByText('Enter a valid distance to continue', { exact: true })).toBeVisible()

  await distance.fill('1250')
  await expect(page.locator('.impact-trace__value')).toContainText('1,250 km · 225.0 kg CO₂e/yr')
  await expect(page.getByRole('link', { name: 'Open this estimate in the calculator' })).toHaveAttribute('href', /\/calculator\?data=/)
})

test('Home numeric fallback remains functional without optional pointer APIs', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: undefined })
    Object.defineProperty(Element.prototype, 'setPointerCapture', { configurable: true, value: undefined })
    Object.defineProperty(Element.prototype, 'releasePointerCapture', { configurable: true, value: undefined })
    Object.defineProperty(Element.prototype, 'hasPointerCapture', { configurable: true, value: undefined })
  })
  await page.goto('/')
  await page.waitForTimeout(250)
  const distance = page.getByLabel('Annual distance (km)')
  await distance.fill('1250')
  await expect(page.locator('.impact-trace__value')).toContainText('1,250 km · 225.0 kg CO₂e/yr')
  await expect(page.getByRole('link', { name: 'Open this estimate in the calculator' })).toBeVisible()
})

test('Home marker drag uses bounded ten-kilometre steps', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const marker = page.locator('.impact-trace__slider')
  await marker.scrollIntoViewIfNeeded()
  const box = await marker.boundingBox()
  if (!box) throw new Error('Home marker is not measurable')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(Math.min(box.x + box.width / 2 + 40, box.x + box.width - 2), box.y + box.height / 2)
  await page.mouse.up()
  const distance = Number(await page.getByLabel('Annual distance (km)').inputValue())
  expect(distance).toBeGreaterThanOrEqual(10)
  expect(distance).toBeLessThanOrEqual(200_000)
  expect(distance % 10).toBe(0)
})

test('Home mode controls retain attached evidence and visible chart labels', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: 'Toronto bus' }).click()
  await expect(page.locator('.trace-mode[aria-pressed="true"]')).toContainText('Toronto bus')
  await expect(page.locator('.impact-trace__line-label')).toHaveText(['Car', 'Toronto bus', 'Toronto subway'])
  await expect(page.getByText('Transit uses passenger-kilometres; the car example assumes one occupant.')).toBeVisible()
})

test('compact Calculator Browse switches to focused Worksheet and explicit Done', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => localStorage.removeItem('carbon-acx-calculator-inputs'))
  await page.goto('/calculator')
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: 'Add School run by car to the worksheet' }).click()
  await expect(page.getByRole('button', { name: 'Worksheet', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const quantity = page.locator('[id="TRAN.SCHOOLRUN.CAR.KM-quantity"]')
  await expect(quantity).toBeFocused()
  await quantity.fill('1000')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('.activity-line__summary')).toBeFocused()
  await expect(page.locator('.activity-line')).toBeVisible()
  await page.getByRole('button', { name: 'Add another activity' }).click()
  await expect(page.getByRole('button', { name: 'Browse activities' })).toHaveAttribute('aria-pressed', 'true')
})

test('shared Calculator inputs open a collapsed Worksheet directly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/calculator?data=VFJBTi5TQ0hPT0xSVU4uQ0FSLktNOjEwMDA=')
  await expect(page.getByRole('button', { name: 'Worksheet', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.activity-line')).toBeVisible()
  await expect(page.locator('[id="TRAN.SCHOOLRUN.CAR.KM-quantity"]')).toHaveCount(0)
})

test('Calculator loads the optional flow chunk only after disclosure opens', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP/resource assertions are Chromium-only')
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.addInitScript(() => localStorage.removeItem('carbon-acx-calculator-inputs'))
  const requests: string[] = []
  const counts = new Map<string, number>()
  page.on('request', (request) => {
    const url = request.url()
    requests.push(url)
    counts.set(url, (counts.get(url) ?? 0) + 1)
  })
  await page.goto('/calculator')
  await page.getByRole('button', { name: 'Add School run by car to the worksheet' }).click()
  await page.getByRole('button', { name: /Food & drink/ }).click()
  await page.getByRole('button', { name: 'Add Meal with beef to the worksheet' }).click()
  await page.locator('[id="TRAN.SCHOOLRUN.CAR.KM-quantity"]').fill('1000')
  await page.locator('[id="FOOD.MEAL.BEEF.SERVING-quantity"]').fill('10')
  const initialRequests = new Set(requests)
  expect([...initialRequests].some((url) => /d3-sankey|ImpactFlow|impact-flow/i.test(url))).toBe(false)
  await page.getByText('Show activity → category flow', { exact: true }).click()
  await expect(page.locator('.impact-flow__svg')).toBeVisible()
  const newScripts = [...new Set(requests)].filter((url) => !initialRequests.has(url) && new URL(url).pathname.endsWith('.js'))
  expect(newScripts.length).toBeGreaterThan(0)
  expect(newScripts.every((url) => counts.get(url) === 1)).toBe(true)
})

test('Calculator composes categories, ranked impacts, and lazy flow context', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.addInitScript(() => localStorage.removeItem('carbon-acx-calculator-inputs'))
  await page.goto('/calculator')
  await page.getByRole('button', { name: 'Add School run by car to the worksheet' }).click()
  await page.getByRole('button', { name: /Food & drink/ }).click()
  await page.getByRole('button', { name: 'Add Meal with beef to the worksheet' }).click()
  await expect(page.locator('[id="TRAN.SCHOOLRUN.CAR.KM-quantity"]')).toBeVisible()
  await page.locator('[id="TRAN.SCHOOLRUN.CAR.KM-quantity"]').fill('1000')
  await expect(page.locator('[id="TRAN.SCHOOLRUN.CAR.KM-quantity"]')).toHaveValue('1000')
  await page.locator('[id="FOOD.MEAL.BEEF.SERVING-quantity"]').fill('10')
  await expect(page.locator('[id="FOOD.MEAL.BEEF.SERVING-quantity"]')).toHaveValue('10')
  await expect(page.getByRole('heading', { name: 'Worksheet (2)' })).toBeVisible()
  await expect(page.getByText('270.0 kg CO₂e/yr', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Range: 54.0 kg CO₂e–123.0 kg CO₂e', { exact: true })).toBeVisible()
  await expect(page.locator('.impact-flow__svg')).toHaveCount(0)
  await page.getByText('Show activity → category flow', { exact: true }).click()
  await expect(page.locator('.impact-flow__svg')).toBeVisible()
})

test('Explore derives mode groups and reconciles compact record selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/explore')
  await expect(page.getByRole('button', { name: /Household activities/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /Services & infrastructure/ }).click()
  await expect(page.getByRole('heading', { name: 'Professional services' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Not available/ }).first()).toBeVisible()
  const record = page.locator('.atlas-record').first()
  const recordName = await record.locator('.atlas-record__name').textContent()
  await record.click()
  await expect(page.getByRole('button', { name: 'Record detail' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.atlas__detail h2')).toBeFocused()
  await page.getByRole('button', { name: 'Back to records' }).click()
  await expect(page.getByRole('button', { name: 'Browse records' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.atlas-record').filter({ hasText: recordName ?? '' }).first()).toBeFocused()
})

test('Explore industrial mode and data table stay in the same authority scope', async ({ page }) => {
  await page.goto('/explore')
  await page.getByRole('button', { name: /Industry & earth systems/ }).click()
  await expect(page.getByRole('heading', { name: 'Heavy industry' })).toBeVisible()
  await expect(page.getByText('Professional services', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Data table' }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('table').getByText('Heavy industry', { exact: true }).first()).toBeVisible()
})

test('published bicycle zero stays ranked without entering the lazy flow', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('carbon-acx-calculator-inputs'))
  await page.goto('/calculator')
  await page.getByRole('button', { name: 'Add School run by bike to the worksheet' }).click()
  await page.locator('[id="TRAN.SCHOOLRUN.BIKE.KM-quantity"]').fill('1000')
  await expect(page.getByText('0 g CO₂e/yr', { exact: true }).first()).toBeVisible()
  await expect(page.locator('.impact-rank__zero')).toContainText('Published zero')
  await expect(page.getByText('Show activity → category flow', { exact: true })).toHaveCount(0)
})
