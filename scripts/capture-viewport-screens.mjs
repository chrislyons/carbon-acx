import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir, readFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

const { chromium } = createRequire(resolve('apps/carbon-acx-web/package.json'))('@playwright/test')
const root = resolve('dist/site')
const ROOT_ABS = resolve(root)
const contained = (file) => {
  const abs = resolve(file)
  return abs === ROOT_ABS || abs.startsWith(ROOT_ABS + sep) ? abs : null
}
const outDir = resolve('dist/viewport-screens')
await mkdir(outDir, { recursive: true })
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  const candidates = [join(root, path)]
  if (!extname(path)) candidates.push(join(root, `${path.replace(/\/$/, '')}.html`))
  if (path.endsWith('/')) candidates.push(join(root, path, 'index.html'))
  for (const candidate of candidates) {
    const file = contained(candidate)
    if (!file) continue
    try {
      const data = await readFile(file)
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
      res.end(data)
      return
    } catch {
      // Try the next static-export candidate.
    }
  }
  res.writeHead(404).end()
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const port = server.address().port
const base = `http://127.0.0.1:${port}`
const BASE_ROUTES = ['/', '/calculator', '/explore', '/explore/3d', '/learn', '/methodology', '/evidence']
const VIEWPORTS = [
  [320, 800], [390, 844], [720, 1280], [768, 1024], [844, 390],
  [1280, 720], [1440, 900], [1600, 900], [1920, 1080],
]
const THEMES = ['light', 'dark']
let browser
try {
  browser = await chromium.launch()
  const discoveryContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await discoveryContext.addInitScript(() => localStorage.setItem('carbon-acx-theme', 'light'))
  const discoveryPage = await discoveryContext.newPage()
  await discoveryPage.goto(`${base}/evidence`, { waitUntil: 'load' })
  const manifestLink = discoveryPage.locator('#manifests a').first()
  const manifestRoute = await manifestLink.count() > 0 ? await manifestLink.getAttribute('href') : null
  await discoveryContext.close()
  const routes = manifestRoute ? [...BASE_ROUTES, manifestRoute] : BASE_ROUTES

  for (const theme of THEMES) {
    for (const [width, height] of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width, height } })
      await context.addInitScript((savedTheme) => localStorage.setItem('carbon-acx-theme', savedTheme), theme)
      for (const route of routes) {
        const page = await context.newPage()
        try {
          await page.goto(base + route, { waitUntil: 'load' })
          await page.waitForTimeout(900)
          const name = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '')
          await page.screenshot({ path: join(outDir, `${theme}_${width}x${height}_${name}.png`), fullPage: false })
        } finally {
          await page.close()
        }
      }
      await context.close()
    }
  }
  console.log(`captured ${THEMES.length * VIEWPORTS.length * routes.length} screens`)
} finally {
  if (browser) await browser.close().catch(() => {})
  await new Promise((ok) => server.close(ok))
}
