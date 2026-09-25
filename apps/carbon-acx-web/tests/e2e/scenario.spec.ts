import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
async function openScenarioPane(page: Page) {
  await page.getByText('Add a documented AI scenario', { exact: true }).click()
}

test('published scenario joins the annual total with full evidence', async ({ page }) => {
  await page.goto('/calculator')
  await openScenarioPane(page)
  await page.getByLabel('AI activity').selectOption({ label: 'LLM inference scenario' })
  const totalBefore = await page.locator('.result-composition h2').innerText()

  await page.getByLabel('Scenario', { exact: true }).selectOption('SCN.GOOGLE.GEMINI.APPS.PROMPT.2025')
  await page.getByLabel(/Annual quantity/).fill('100')

  await expect(page.getByText(/Included in your total/)).toBeVisible()
  await expect(page.getByText('Scope boundary')).toBeVisible()

  const totalAfter = await page.locator('.result-composition h2').innerText()
  expect(totalAfter).not.toEqual(totalBefore)
})

test('closing a published scenario removes its contribution from the total', async ({ page }) => {
  await page.goto('/calculator')
  await openScenarioPane(page)
  await page.getByLabel('AI activity').selectOption({ label: 'LLM inference scenario' })
  const totalBefore = await page.locator('.result-composition h2').innerText()

  await page.getByLabel('Scenario', { exact: true }).selectOption('SCN.GOOGLE.GEMINI.APPS.PROMPT.2025')
  await page.locator('#scenario-quantity').fill('100')
  await expect(page.getByText(/Included in your total/)).toBeVisible()

  await openScenarioPane(page)

  await expect(page.locator('.scenario-pane')).toHaveCount(0)
  await expect(page.locator('.result-composition h2')).toHaveText(totalBefore)
  await expect(page.getByText(/Includes a published AI scenario/)).toHaveCount(0)
})

test('clearing a worksheet removes calculation and scenario state', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          document.documentElement.dataset.copiedCalculatorLink = text
          return Promise.resolve()
        },
      },
    })
  })
  await page.goto('/calculator')
  await page.getByRole('button', { name: 'Add School run by car to the worksheet' }).click()
  await page.locator('[id="TRAN.SCHOOLRUN.CAR.KM-quantity"]').fill('1000')
  await openScenarioPane(page)
  await page.getByLabel('AI activity').selectOption({ label: 'LLM inference scenario' })
  await page.getByLabel('Scenario', { exact: true }).selectOption('SCN.GOOGLE.GEMINI.APPS.PROMPT.2025')
  await page.locator('#scenario-quantity').fill('100')
  await expect(page.getByText(/Included in your total/)).toBeVisible()

  await page.getByRole('button', { name: 'Clear worksheet' }).click()

  await expect(page.locator('[id="TRAN.SCHOOLRUN.CAR.KM-quantity"]')).toHaveCount(0)
  await expect(page.locator('.scenario-pane')).toHaveCount(0)
  await expect(page.locator('.result-composition h2')).toHaveText('Add a valid annual quantity')
  await expect(page.getByText(/Includes a published AI scenario/)).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('carbon-acx-calculator-inputs'))).toBeNull()

  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-copied-calculator-link', 'http://127.0.0.1:3000/calculator?data=')
})

test('estimate scenarios stay evidence-only and leave the total unchanged', async ({ page }) => {
  await page.goto('/calculator')
  await openScenarioPane(page)
  await page.getByLabel('AI activity').selectOption({ label: 'LLM inference scenario' })
  await page.getByLabel('Scenario', { exact: true }).selectOption('SCN.JEGHAM.GPT41.100+300')

  await page.locator('#scenario-quantity').fill('1000')
  await expect(page.getByText(/Estimate — not included in your total/)).toBeVisible()
  await expect(page.locator('.result-composition h2')).toHaveText('Add a valid annual quantity')
})

test('Not available scenarios explain themselves instead of zeroing', async ({ page }) => {
  await page.goto('/calculator')
  await openScenarioPane(page)
  await page.getByLabel('AI activity').selectOption({ label: 'LLM inference scenario' })
  await page.getByLabel('Scenario', { exact: true }).selectOption('SCN.ANTHROPIC.CLAUDE3.UNAVAILABLE.2024')

  await expect(page.getByText(/not disclosed per-query energy or carbon data/i)).toBeVisible()
})

test('scenario selector is keyboard operable', async ({ page }) => {
  await page.goto('/calculator')
  await openScenarioPane(page)
  const activity = page.getByLabel('AI activity')
  await activity.focus()
  await expect(activity).toBeFocused()
  await activity.selectOption({ index: 1 })
  await expect(activity).not.toHaveValue('')
  await activity.press('Tab')
  await expect(page.getByLabel('Scenario', { exact: true })).toBeEnabled()
  await expect(page.getByLabel('Scenario', { exact: true })).toBeFocused()
})

test('digital shelf card routes into the scenario picker', async ({ page }) => {
  await page.goto('/calculator')
  await page.getByRole('button', { name: /^Digital/ }).click()

  const tile = page.locator('.activity-tile', { hasText: 'LLM inference scenario' })
  await expect(tile).toBeVisible()
  await expect(tile.getByText('Exact-match research scenarios')).toBeVisible()
  await expect(tile.getByRole('button', { name: /Choose an AI scenario/ })).toBeVisible()
  // the card must not be addable as a factor-backed activity
  await expect(tile.getByRole('button', { name: 'Add to basket' })).toHaveCount(0)

  await tile.getByRole('button', { name: /Choose an AI scenario/ }).click()
  await expect(page.getByLabel('AI activity')).toHaveValue('AI.USAGE.LLM.SCENARIO')

  await page.getByLabel('Scenario', { exact: true }).selectOption('SCN.GOOGLE.GEMINI.APPS.PROMPT.2025')
  await page.getByLabel(/Annual quantity/).fill('730')
  await expect(page.getByText(/Included in your total/)).toBeVisible()
})
