import { expect, test } from '@playwright/test'

test('public routes use six-link adaptive evidence-first navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Compare a year of travel' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav.getByRole('link')).toHaveCount(6)
  for (const label of ['Home', 'Calculator', 'Explore', 'Learn', 'Methodology', 'Evidence']) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible()
  }
  await expect(page.getByRole('button', { name: /navigation/i })).toHaveCount(0)

  await expect(page.locator('.site-header__inner > *')).toHaveCount(3)
  const headerOrder = await page.locator('.site-header__inner > *').evaluateAll((elements) => elements.map((element) => element.className))
  expect(headerOrder).toEqual([
    'site-header__brand',
    'site-header__nav',
    'mode-switcher__button',
  ])
  const themeButton = page.getByRole('button', { name: /Switch to (dark|light) mode/ })
  await expect(themeButton).toBeVisible()
  await expect(themeButton).toHaveText('')
  await expect(page.locator('.site-footer')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Reference' })).toBeVisible()
})
