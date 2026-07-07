import { test, expect } from '@playwright/test'

// Verifies the calculator surfaces invalid input instead of silently coercing
// it to zero (the trust-bug fix). Drives the first activity quantity field.
test('calculator surfaces invalid quantity input', async ({ page }) => {
  await page.goto('/calculator')

  // The first activity quantity input (transport category is the default tab).
  const input = page.locator('input[type="number"]').first()
  await expect(input).toBeVisible()

  // The error message is tied to this field via aria-describedby → its id.
  // Activity ids contain dots, so use an attribute selector (not a #id CSS
  // selector, which would parse the dots as class separators).
  const inputId = await input.getAttribute('id')
  const errorId = `error-${inputId?.replace('input-', '')}`
  const fieldError = page.locator(`[id="${errorId}"]`)

  // Negative value → accessible error, field flagged invalid.
  await input.fill('-5')
  await expect(fieldError).toBeVisible()
  await expect(fieldError).toHaveText(/zero or greater/i)
  await expect(input).toHaveAttribute('aria-invalid', 'true')

  // Valid value → the field-scoped error clears, field no longer invalid.
  await input.fill('10')
  await expect(fieldError).toHaveCount(0)
  await expect(input).not.toHaveAttribute('aria-invalid', 'true')
})
