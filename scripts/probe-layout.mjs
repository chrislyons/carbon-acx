import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
const { chromium } = createRequire(resolve('apps/carbon-acx-web/package.json'))('@playwright/test')
const root = resolve('dist/site')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = decodeURIComponent(url.pathname)
  const candidates = [join(root, path)]
  if (!extname(path)) candidates.push(join(root, `${path.replace(/\/$/, '')}.html`))
  if (path.endsWith('/')) candidates.push(join(root, path, 'index.html'), join(root, path.replace(/\/$/, ''), 'index.html'))
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

function dump(label, els) {
  console.log(`\n== ${label} ==`)
  let acc = 0
  for (const e of els) {
    acc += e.h + e.mt + e.mb
    console.log(`${e.d ? '  '.repeat(e.d) : ''}${e.label} h=${e.h}${e.mt ? ' mt=' + e.mt : ''}${e.mb ? ' mb=' + e.mb : ''}`)
  }
  console.log('-- accounted:', Math.round(acc))
}

for (const [route, w, h] of [['/', 1600, 900], ['/', 1440, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto(base + route, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  const data = await page.evaluate(() => {
    const out = []
    const walk = (el, depth, cap) => {
      if (depth > cap) return
      for (const c of el?.children ?? []) {
        const r = c.getBoundingClientRect()
        const cs = getComputedStyle(c)
        out.push({
          depth,
          label: c.tagName.toLowerCase() + (c.className && typeof c.className === 'string' && c.className ? '.' + c.className.trim().split(/\s+/).join('.') : ''),
          h: Math.round(r.height),
          mt: parseFloat(cs.marginTop),
          mb: parseFloat(cs.marginBottom),
          scrollH: c.scrollHeight,
          clientH: c.clientHeight,
        })
        walk(c, depth + 1, cap)
      }
    }
    walk(document.body, 0, 8)
    return out
  })
  dump(`${route} @ ${w}x${h}`, data.filter((d) => d.depth <= 7 && (d.h > 8 || d.mt > 4)))
  // key container scroll behavior
  const info = await page.evaluate(() => {
    const m = document.querySelector('main') ?? document.body
    const cs = getComputedStyle(m)
    const stage = document.querySelector('.app-stage')
    const cols = document.querySelector('.calculator__columns')
    const shelfScroll = document.querySelector('[data-panel-scroll]')
    return {
      mainDisplay: cs.display,
      mainMinH: cs.minHeight,
      mainH: Math.round(m.getBoundingClientRect().height),
      stageFound: !!stage,
      stageH: stage ? Math.round(stage.getBoundingClientRect().height) : null,
      colsH: cols ? Math.round(cols.getBoundingClientRect().height) : null,
      colsMinH: cols ? getComputedStyle(cols).minHeight : null,
      shelfScroll: shelfScroll ? {
        clientH: shelfScroll.clientHeight,
        scrollH: shelfScroll.scrollHeight,
        overflowY: getComputedStyle(shelfScroll).overflowY,
      } : null,
    }
  })
  console.log(JSON.stringify(info))
  await page.close()
}
await browser.close()
server.close()
