import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Landscape density acceptance spec.
 *
 * Asserts the per-route master-scroll ratio targets from the landscape-viewport
 * optimization plan at landscape viewports, no horizontal overflow anywhere,
 * keyboard-accessible [data-panel-scroll] regions, and 44px touch-target
 * heights at 1280x720. Portrait/tablet band viewports (<1024px wide) are
 * covered by the existing suite plus screenshot regression; they are NOT
 * allowed to change composition, so they are not asserted here beyond what
 * redesigned-primary-flow/accessibility already pin.
 *
 * 1600x900 shares the 1440x900 targets (it is exercised there because
 * redesigned-primary-flow runs a calculator flow at 1600x900).
 */

const LANDSCAPE_VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
] as const

// Ratio = document scrollHeight / window.innerHeight at that viewport.
// Landscape targets from the plan acceptance table:
const RATIO_TARGETS: Record<string, Record<number, number>> = {
  '/': { 1280: 1.05, 1440: 1.1 },
  '/calculator': { 1280: 1.3, 1440: 1.15 },
  '/explore': { 1280: 1.6, 1440: 1.4 },
  '/explore/3d': { 1280: 1.0, 1440: 1.0 },
  '/learn': { 1280: 1.3, 1440: 1.2 },
  '/methodology': { 1280: 2.0, 1440: 1.6 },
  '/manifests': { 1280: 1.1, 1440: 1.0 },
}

function ratioTarget(route: string, width: number): number {
  // 1600x900 uses the 1440x900 target row.
  if (!RATIO_TARGETS[route]) throw new Error(`No target configured for route ${route}`)
  return width <= 1280 ? RATIO_TARGETS[route][1280] : RATIO_TARGETS[route][1440]
}

/** Wait for render stability: scrollHeight unchanged across two 250ms polls. */
async function waitForRenderStability(page: Page) {
  let last = -1
  let stable = 0
  for (let i = 0; i < 40 && stable < 2; i++) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight)
    if (h === last) stable++
    else {
      last = h
      stable = 0
    }
    await page.waitForTimeout(250)
  }
}

for (const viewport of LANDSCAPE_VIEWPORTS) {
  test.describe(`landscape density @ ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport })

    for (const route of Object.keys(RATIO_TARGETS)) {
      test(`${route} fits its ratio target without horizontal overflow`, async ({ page }) => {
        await page.goto(route)
        await waitForRenderStability(page)
        const metrics = await page.evaluate(() => ({
          scrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight,
          hScroll: document.documentElement.scrollWidth > window.innerWidth,
        }))
        const ratio = metrics.scrollHeight / metrics.innerHeight
        // Slack covers subpixel round-up on exact-fit pages (e.g. /explore/3d):
        // applied to the budget only, never to the measured height.
        const slack = route === '/explore/3d' ? Math.ceil(metrics.innerHeight * 0.02) : 0
        const budget = Math.round(metrics.innerHeight * ratioTarget(route, viewport.width)) + slack
        expect(
          metrics.scrollHeight,
          `${route} @ ${viewport.width}x${viewport.height}: ratio ${ratio.toFixed(2)} exceeds target ${ratioTarget(route, viewport.width)} (scrollHeight ${metrics.scrollHeight}px vs budget ${budget}px)`,
        ).toBeLessThanOrEqual(budget)
        expect(metrics.hScroll, `${route} must not introduce horizontal overflow`).toBe(false)
      })
    }

    test('panel scroll regions are keyboard-focusable and named', async ({ page }) => {
      await page.goto('/calculator')
      await waitForRenderStability(page)
      const panels = await page.locator('[data-panel-scroll]').evaluateAll((els) =>
        els.map((el) => ({
          tabindex: el.getAttribute('tabindex'),
          label: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
          focusable: el.matches(':focus-visible, [tabindex]'),
        })),
      )
      for (const panel of panels) {
        expect(panel.tabindex, 'panel scroll region needs tabindex="0"').toBe('0')
        expect(panel.role ?? '').toBe('region')
        expect(panel.label, 'panel scroll region needs an accessible name').toBeTruthy()
      }
    })

    if (viewport.width === 1280 && viewport.height === 720) {
      test('touch-target contract holds at short landscape', async ({ page }) => {
        await page.goto('/calculator')
        await waitForRenderStability(page)
        const undersized = await page
          .locator('header button, main button')
          .evaluateAll((controls) =>
            controls
              .map((control) => {
                const { height, width } = control.getBoundingClientRect()
                return { height, width }
              })
              .filter((control) => control.width > 0 && control.height > 0 && control.height < 44),
          )
        expect(undersized).toEqual([])
      })
    }
  })
}
