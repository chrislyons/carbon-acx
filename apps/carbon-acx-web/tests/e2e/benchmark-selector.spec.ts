import { test, expect } from '@playwright/test'

// Verifies the calculator lets the user compare their footprint against
// multiple sourced per-capita baselines (national + provincial), and that
// switching the baseline changes the reported percentage.
test('calculator compares against selectable benchmarks', async ({ page }) => {
  await page.goto('/calculator')

  // Enter a footprint so the comparison chip renders.
  await page.locator('input[type="number"]').first().fill('100')

  // Move to the results view.
  await page.getByRole('button', { name: /view results/i }).click()

  const selector = page.locator('#benchmark-select')
  await expect(selector).toBeVisible()

  // National default present, plus provincial options.
  const optionCount = await selector.locator('option').count()
  expect(optionCount).toBeGreaterThanOrEqual(6)

  // The comparison text reflects the selected baseline label.
  const comparison = page.getByText(/per-capita average/i)
  await expect(comparison).toBeVisible()

  // Switch to Quebec (lowest baseline) → percentage should be higher than
  // against Alberta (a much higher baseline) for the same footprint.
  await selector.selectOption('quebec_average')
  const quebecText = (await comparison.textContent()) ?? ''
  const quebecPct = parseFloat(quebecText.match(/([\d.]+)%/)?.[1] ?? '0')

  await selector.selectOption('alberta_average')
  const albertaText = (await comparison.textContent()) ?? ''
  const albertaPct = parseFloat(albertaText.match(/([\d.]+)%/)?.[1] ?? '0')

  expect(quebecPct).toBeGreaterThan(albertaPct)
})
