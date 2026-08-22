import { expect, test } from '@playwright/test'

test('published scenario joins the annual total with full evidence', async ({ page }) => {
  await page.goto('/calculator')
  await page.getByLabel('AI activity').selectOption({ label: 'LLM inference scenario' })
  const totalBefore = await page.locator('.result-composition h2').innerText()

  await page.getByLabel('Scenario', { exact: true }).selectOption('SCN.GOOGLE.GEMINI.APPS.PROMPT.2025')
  await page.getByLabel(/Annual quantity/).fill('100')

  await expect(page.getByText(/Included in your total/)).toBeVisible()
  await expect(page.getByText('Scope boundary')).toBeVisible()

  const totalAfter = await page.locator('.result-composition h2').innerText()
  expect(totalAfter).not.toEqual(totalBefore)
})

test('estimate scenarios stay evidence-only and leave the total unchanged', async ({ page }) => {
  await page.goto('/calculator')
  await page.getByLabel('AI activity').selectOption({ label: 'LLM inference scenario' })
  await page.getByLabel('Scenario', { exact: true }).selectOption('SCN.JEGHAM.GPT41.100+300')

  await page.getByLabel(/Annual quantity/).fill('1000')
  await expect(page.getByText(/Estimate — not included in your total/)).toBeVisible()
  await expect(page.locator('.result-composition h2')).toHaveText('Add a valid annual quantity')
})

test('unavailable scenarios explain themselves instead of zeroing', async ({ page }) => {
  await page.goto('/calculator')
  await page.getByLabel('AI activity').selectOption({ label: 'LLM inference scenario' })
  await page.getByLabel('Scenario', { exact: true }).selectOption('SCN.ANTHROPIC.CLAUDE3.UNAVAILABLE.2024')

  await expect(page.getByText(/not disclosed per-query energy or carbon data/i)).toBeVisible()
})

test('scenario selector is keyboard operable', async ({ page }) => {
  await page.goto('/calculator')
  const activity = page.getByLabel('AI activity')
  await activity.focus()
  await page.keyboard.type('LLM inference scenario')
  await expect(activity).toHaveValue('AI.USAGE.LLM.SCENARIO')
  await expect(page.getByLabel('Scenario', { exact: true })).toBeEnabled()
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
