
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
const req = createRequire(resolve('apps/carbon-acx-web/package.json'))
const { chromium } = req('@playwright/test')
const root = resolve('dist/site')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }
const server = createServer(async (req2, res) => {
  const path = decodeURIComponent(new URL(req2.url ?? '/', 'http://x').pathname)
  const cands = [join(root, path)]
  if (!extname(path)) cands.push(join(root, path.replace(/\/$/, '') + '.html'))
  if (path.endsWith('/')) cands.push(join(root, path, 'index.html'))
  for (const f of cands) { try { const d = await readFile(f); res.writeHead(200, {'content-type': MIME[extname(f)] ?? 'app/oct'}); return res.end(d) } catch {} }
  res.writeHead(404); res.end()
})
await new Promise(ok => server.listen(0, '127.0.0.1', ok))
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto(base + '/methodology', { waitUntil: 'load' })
await page.waitForTimeout(1000)
const info = await page.evaluate(() => {
  const layout = document.querySelector('.methodology-layout')
  const rs = document.querySelector('.reference-scroll')
  const rail = document.querySelector('.methodology-rail')
  const shell = document.querySelector('.page-shell--reading')
  const cs = layout ? getComputedStyle(layout) : null
  return {
    layoutDisplay: cs?.display,
    cols: cs?.gridTemplateColumns?.split(' ').length,
    shellW: Math.round(shell.getBoundingClientRect().width),
    railH: rail ? Math.round(rail.getBoundingClientRect().height) : null,
    railScroll: rail ? [rail.clientHeight, rail.scrollHeight] : null,
    rsFound: !!rs,
    rsBox: rs ? [rs.clientHeight, rs.scrollHeight] : null,
    total: document.documentElement.scrollHeight,
  }
})
console.log(JSON.stringify(info, null, 1))
await browser.close(); server.close()
