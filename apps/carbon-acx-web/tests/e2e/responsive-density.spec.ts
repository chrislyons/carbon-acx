import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const BASE_VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 720, height: 1280 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
] as const

const BOUNDARY_VIEWPORTS = [767, 768, 959, 960, 1151, 1152] as const
const ROUTES = ['/', '/calculator', '/explore', '/explore/3d', '/learn', '/methodology', '/evidence'] as const
const WIDE_WORKSPACES = ['/', '/calculator', '/explore', '/explore/3d'] as const
const READING_ROUTES = ['/learn', '/methodology', '/evidence'] as const

async function routeMetrics(page: Page) {
  return page.evaluate(() => ({
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    controls: [...document.querySelectorAll('header button, main button, main a')]
      .map((control) => {
        const rect = control.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      })
      .filter((rect) => rect.width > 0 && rect.height > 0),
  }))
}

for (const viewport of BASE_VIEWPORTS) {
  test.describe(`responsive density at ${viewport.width} × ${viewport.height}`, () => {
    test.use({ viewport })

    for (const route of ROUTES) {
      test(`${route} keeps document width and visible control contracts`, async ({ page }) => {
        await page.goto(route)
        const metrics = await routeMetrics(page)
        expect(metrics.documentWidth, `${route} introduces document horizontal overflow`).toBeLessThanOrEqual(metrics.width)
        expect(metrics.controls.every((control) => control.height >= 44), `${route} has a visible control below 44px`).toBe(true)
        if (viewport.width >= 1280 && WIDE_WORKSPACES.includes(route as (typeof WIDE_WORKSPACES)[number])) {
          expect(metrics.documentHeight / metrics.viewportHeight, `${route} exceeds the wide master-scroll budget`).toBeLessThanOrEqual(1.1)
        }
        if (READING_ROUTES.includes(route as (typeof READING_ROUTES)[number])) {
          const proseScrollers = await page.locator('.reading-page [data-panel-scroll]').evaluateAll(
            (elements) => elements.filter((element) => element.scrollHeight > element.clientHeight + 1).length,
          )
          expect(proseScrollers, `${route} uses a bounded prose scroller`).toBe(0)
        }
      })
    }
  })
}

for (const width of BOUNDARY_VIEWPORTS) {
  test(`breakpoint boundary ${width}px keeps source order and no overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/explore')
    const metrics = await routeMetrics(page)
    expect(metrics.documentWidth).toBeLessThanOrEqual(width)
    await expect(page.locator('.atlas__layout')).toBeVisible()
    await expect(page.locator('.atlas__center')).toBeVisible()
  })
}

test('workspace panel scroll regions remain named and keyboard focusable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/calculator')
  const panels = await page.locator('[data-panel-scroll]').evaluateAll((elements) => elements.map((element) => ({
    tabIndex: element.getAttribute('tabindex'),
    role: element.getAttribute('role'),
    label: element.getAttribute('aria-label'),
  })))
  expect(panels.length).toBeGreaterThan(0)
  for (const panel of panels) {
    expect(panel.tabIndex).toBe('0')
    expect(panel.role).toBe('region')
    expect(panel.label).toBeTruthy()
  }
})

test('manifest detail preserves surface, utility, and theme token styles', async ({ page }) => {
  await page.goto('/evidence')
  const manifestLink = page.locator('#manifests a').first()
  await expect(manifestLink).toBeVisible()
  await manifestLink.click()
  await page.waitForURL(/\/evidence\/.+/)
  const styles = await page.evaluate(() => {
    const card = document.querySelector('.surface-card')
    const utility = document.querySelector('.mt-4')
    const muted = document.querySelector('.manifest-detail__grid p.text-foreground-muted')
    if (!card || !utility || !muted) throw new Error('Manifest detail style probe selectors are missing')
    const tokenProbe = document.createElement('span')
    tokenProbe.style.color = 'var(--ink-muted)'
    document.body.append(tokenProbe)
    const tokenColor = getComputedStyle(tokenProbe).color
    tokenProbe.remove()
    return {
      border: getComputedStyle(card).borderTopWidth,
      background: getComputedStyle(card).backgroundColor,
      padding: getComputedStyle(card).paddingTop,
      marginTop: getComputedStyle(utility).marginTop,
      mutedColor: getComputedStyle(muted).color,
      tokenColor,
    }
  })
  expect(styles.border).not.toBe('0px')
  expect(styles.background).not.toBe('rgba(0, 0, 0, 0)')
  expect(styles.padding).not.toBe('0px')
  expect(styles.marginTop).toBe('16px')
  expect(styles.mutedColor).toBe(styles.tokenColor)
})

test('Evidence discovers a manifest detail link from the generated page', async ({ page }) => {
  await page.goto('/evidence')
  const href = await page.locator('#manifests a').first().getAttribute('href')
  expect(href).toMatch(/^\/evidence\/.+/)
  await page.goto(href!)
  await expect(page.getByRole('link', { name: 'Back to Evidence' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Verify downloaded bytes' })).toBeVisible()
})
