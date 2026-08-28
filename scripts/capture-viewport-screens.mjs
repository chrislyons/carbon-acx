import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { mkdir } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
const { chromium } = createRequire(resolve('apps/carbon-acx-web/package.json'))('@playwright/test')
const root = resolve('dist/site')
const outDir = resolve('dist/viewport-screens')
await mkdir(outDir, { recursive: true })
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  const candidates = [join(root, path)]
  if (!extname(path)) candidates.push(join(root, `${path.replace(/\/$/, '')}.html`))
  if (path.endsWith('/')) candidates.push(join(root, path, 'index.html'))
  for (const file of candidates) {
    try {
      const data = await readFile(file)
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
      res.end(data)
      return
    } catch { /* next */ }
  }
  res.writeHead(404).end()
})
await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
const port = server.address().port
const base = `http://127.0.0.1:${port}`
const browser = await chromium.launch()
const ROUTES = ['/', '/calculator', '/explore', '/explore/3d', '/learn', '/methodology', '/evidence']
const VIEWPORTS = [
  [1280, 720], [1440, 900], [1920, 1080], [720, 1280], [844, 390], [768, 1024], [320, 800], [390, 844],
]
for (const [w, h] of VIEWPORTS) {
  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    await page.goto(base + route, { waitUntil: 'load' })
    await page.waitForTimeout(900)
    const name = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '')
    await page.screenshot({ path: join(outDir, `${w}x${h}_${name}.png`), fullPage: false })
    await page.close()
  }
}
await browser.close()
server.close()
console.log('done')
