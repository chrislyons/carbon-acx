#!/usr/bin/env node
/**
 * measure-viewport-fit.mjs — landscape-viewport fit harness for carbon-acx-web.
 *
 * Measures master-scroll ratio (document scrollHeight / window innerHeight),
 * sticky header height, and horizontal overflow against the FRESHLY BUILT
 * static export (`dist/site`), served locally. Never run against the Next dev
 * server: dev overlays/hydration noise skew heights; static export matches how
 * the production baseline was captured.
 *
 * Usage:
 *   node scripts/measure-viewport-fit.mjs [--site <dir>] [--out <file>] [--json] [--update]
 *
 * Defaults: --site dist/site (repo root), --out scripts/viewport-fit-baseline.json
 *
 * Baseline contract: when the baseline file exists, the run is a CHECK —
 * every route/viewport ratio must be <= baseline + 0.05 and no route may
 * gain horizontal overflow; violations exit 1 and nothing is written.
 * Pass --update to overwrite the baseline (route/behavior changes only).
 */
import { createServer } from 'node:http'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { createRequire } from 'node:module'
import process from 'node:process'

const ROUTES = ['/', '/calculator', '/explore', '/explore/3d', '/learn', '/methodology', '/evidence']
// @playwright/test resolves from apps/carbon-acx-web (pnpm workspace), not this
// script's location — anchor a require there.
const { chromium } = createRequire(resolve('apps/carbon-acx-web/package.json'))('@playwright/test')

// Landscape targets + band-2 regression baselines (portrait/rotated).
const VIEWPORTS = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1600x900', width: 1600, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '720x1280', width: 720, height: 1280 },
  { name: '844x390', width: 844, height: 390 }, // rotated phone (landscape dims)
  { name: '768x1024', width: 768, height: 1024 },
]

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain',
  '.csv': 'text/csv', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
}

function parseArgs(argv) {
  const args = { site: resolve('dist/site'), out: resolve('scripts/viewport-fit-baseline.json'), json: false, update: false }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--site') args.site = resolve(argv[++i])
    else if (argv[i] === '--out') args.out = resolve(argv[++i])
    else if (argv[i] === '--json') args.json = true
    else if (argv[i] === '--update') args.update = true
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true
  }
  return args
}

async function serveStatic(root) {
  try {
    const s = await stat(join(root, 'index.html'))
    if (!s.isFile()) throw new Error('not a file')
  } catch {
    console.error(`No static export at ${root}. Build first: pnpm --filter carbon-acx-web build`)
    process.exit(1)
  }
  const ROOT_ABS = resolve(root)
  const contained = (file) => {
    const abs = resolve(file)
    return abs === ROOT_ABS || abs.startsWith(ROOT_ABS + sep) ? abs : null
  }
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    let path = decodeURIComponent(url.pathname)
    // Static-export friendly URLs: '/' -> index.html; extensionless -> route.html
    let candidates = [join(root, path)]
    if (path.endsWith('/')) candidates.push(join(root, path, 'index.html'))
    if (!extname(path)) {
      candidates.push(join(root, `${path.replace(/\/$/, '')}.html`))
      if (path.endsWith('/')) candidates.push(join(root, path.replace(/\/$/, ''), 'index.html'))
    }
    for (const candidate of candidates) {
      const file = contained(candidate)
      if (!file) continue
      try {
        const data = await readFile(file)
        res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
        res.end(data)
        return
      } catch { /* try next candidate */ }
    }
    res.writeHead(404).end('Not found')
  })
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
  const port = server.address().port
  return { server, base: `http://127.0.0.1:${port}`, close: () => new Promise((ok) => server.close(ok)) }
}

/** Wait until document scrollHeight is unchanged across two consecutive polls (250ms apart). */
async function waitForStability(page) {
  let last = -1
  let stable = 0
  for (let i = 0; i < 40 && stable < 2; i++) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight)
    if (h === last) stable++
    else { last = h; stable = 0 }
    await page.waitForTimeout(250)
  }
}

async function measureRoute(browser, base, route, vp) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  try {
    await page.goto(base + route, { waitUntil: 'load', timeout: 30000 })
    await waitForStability(page)
    return await page.evaluate(() => {
      const de = document.documentElement
      const header = document.querySelector('.site-header')
      return {
        scrollHeight: de.scrollHeight,
        innerHeight: window.innerHeight,
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
        hScroll: de.scrollWidth > window.innerWidth,
        scrollWidth: de.scrollWidth,
      }
    })
  } finally {
    await page.close()
  }
}

async function main() {
  const args = parseArgs(process.argv)
  if (args.help) { console.log('See header comment in scripts/measure-viewport-fit.mjs'); return }
  const { server, base, close } = await serveStatic(args.site)
  const browser = await chromium.launch()
  const results = {}
  try {
    try {
      for (const vp of VIEWPORTS) {
        results[vp.name] = results[vp.name] ?? {}
        for (const route of ROUTES) {
          const m = await measureRoute(browser, base, route, vp)
          results[vp.name][route] = { ratio: +(m.scrollHeight / m.innerHeight).toFixed(2), ...m }
          process.stdout.write(`${vp.name} ${route} ratio=${results[vp.name][route].ratio} hScroll=${m.hScroll}\n`)
        }
      }
    } finally {
      await browser.close().catch(() => {})
    }
  } finally {
    await close()
  }
  // Baseline check-or-update.
  let baseline = null
  try { baseline = JSON.parse(await readFile(args.out, 'utf8')) } catch { /* bootstrap */ }
  if (baseline && !args.update) {
    const RATIO_TOLERANCE = 0.05
    const violations = []
    for (const vp of VIEWPORTS) {
      for (const route of ROUTES) {
        const base0 = baseline[vp.name]?.[route]
        const now = results[vp.name][route]
        if (!base0) violations.push(`${vp.name} ${route}: missing from baseline`)
        else {
          if (now.ratio > base0.ratio + RATIO_TOLERANCE) violations.push(`${vp.name} ${route}: ratio ${now.ratio} > baseline ${base0.ratio} + ${RATIO_TOLERANCE}`)
          if (now.hScroll && !base0.hScroll) violations.push(`${vp.name} ${route}: new horizontal overflow`)
        }
      }
    }
    if (violations.length) {
      console.error(`Viewport-fit regressions (${violations.length}):`)
      for (const v of violations) console.error(`  - ${v}`)
      console.error('Baseline untouched. Fix the regression or re-run with --update after review.')
      process.exit(1)
    }
    console.log(`Baseline check passed (${VIEWPORTS.length * ROUTES.length} route/viewport pairs).`)
    return
  }
  if (!args.json) {
    // Console table per viewport: route | ratio | hScroll
    console.log('\n=== Summary ===')
    for (const vp of VIEWPORTS) {
      const rows = ROUTES.map((r) => ({ route: r, ...results[vp.name][r] }))
      console.log(`\n${vp.name}`)
      console.table(rows.map(({ route, ratio, hScroll }) => ({ route, ratio, hScroll })))
    }
  }
  await writeFile(args.out, JSON.stringify(results, null, 2) + '\n')
  console.error(`Saved ${args.out}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
