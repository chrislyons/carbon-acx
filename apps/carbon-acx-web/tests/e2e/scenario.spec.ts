import { expect, test, type Page } from '@playwright/test'

async function chooseAi(page: Page, groupName: RegExp) {
  await page.getByRole('button', { name: /Digital use.*Trace/ }).click()
  await page.getByRole('button', { name: /AI/ }).click()
  await page.getByRole('button', { name: groupName }).click()
}

test('published AI scenario joins the annual total with evidence', async ({ page }) => {
  await page.goto('/calculator')
  await chooseAi(page, /Google · Gemini Apps/)
  await page.getByLabel(/Events per use day/).fill('12')
  await page.getByLabel(/Use days per month/).fill('12')
  await expect(page.getByText(/1,728 prompts per year/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Save routine' }).click()
  await expect(page.getByText(/52 g CO₂e\/year/).first()).toBeVisible()
  await expect(page.locator('.routine-line--compact')).toContainText('Google · Gemini Apps')
  await page.locator('.routine-line--compact').getByRole('button', { name: 'Evidence' }).click()
  await expect(page.getByText('Functional unit')).toBeVisible()
  await expect(page.getByText(/0\.03 g CO₂e/)).toBeVisible()
})

test('estimate AI scenarios stay evidence-only', async ({ page }) => {
  await page.goto('/calculator')
  await chooseAi(page, /OpenAI · ChatGPT/)
  await page.getByLabel(/Events per use day/).fill('1')
  await page.getByLabel(/Use days per month/).fill('1')
  await page.getByRole('button', { name: 'Save routine' }).click()
  await expect(page.locator('.routine-summary__notice--estimate')).toBeVisible()
  await expect(page.locator('.routine-summary h2')).toHaveText('Add a valid routine')
})

test('unavailable AI scenarios explain themselves without entering totals', async ({ page }) => {
  await page.goto('/calculator')
  await chooseAi(page, /Anthropic · Claude/)
  await page.getByLabel(/Events per use day/).fill('1')
  await page.getByLabel(/Use days per month/).fill('1')
  await page.getByRole('button', { name: 'Save routine' }).click()
  await expect(page.locator('.routine-summary__notice--unavailable')).toBeVisible()
  await expect(page.locator('.routine-line--compact')).toContainText('Unavailable')
})

test('AI provider groups expose a model selector only for multiple exact scenarios', async ({ page }) => {
  await page.goto('/calculator')
  await page.getByRole('button', { name: /Digital use.*Trace/ }).click()
  await page.getByRole('button', { name: /AI/ }).click()
  await page.getByRole('button', { name: /benchmark · inference benchmark/ }).click()
  await expect(page.getByLabel('Model or use case')).toBeVisible()
  await page.getByLabel('Model or use case').selectOption({ index: 1 })
  await expect(page.getByLabel(/Events per use day/)).toBeVisible()
})
