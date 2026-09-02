#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createServer as createNetServer } from 'node:net'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from '../apps/carbon-acx-web/node_modules/@playwright/test/index.mjs'

const SAMPLE_COUNT = parseSampleCount(process.env.ACX_SAMPLE_COUNT)
function parseSampleCount(value) {
  if (value === undefined) return 3
  const count = Number(value)
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`ACX_SAMPLE_COUNT must be a positive integer; received ${JSON.stringify(value)}`)
  }
  return count
}
const NETWORK = {
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
}
const SITE_ROOT = resolve(process.env.ACX_SITE ?? 'dist/site')
const OUTPUT = resolve(process.env.ACX_PERFORMANCE_OUTPUT ?? 'dist/web-performance.json')

const OBSERVER_SCRIPT = () => {
  window.__acxPerformance = { lcp: [], cls: [], events: [] }
  const supported = PerformanceObserver.supportedEntryTypes ?? []
  if (supported.includes('largest-contentful-paint')) {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const element = entry.element
        window.__acxPerformance.lcp.push({
          startTime: entry.startTime,
          element: element?.tagName ?? null,
          text: element?.textContent?.trim().slice(0, 120) ?? null,
        })
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  }
  if (supported.includes('layout-shift')) {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__acxPerformance.cls.push(entry.value)
      }
    }).observe({ type: 'layout-shift', buffered: true })
  }
  if (supported.includes('event')) {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.interactionId) window.__acxPerformance.events.push({ duration: entry.duration, interactionId: entry.interactionId })
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 })
    } catch {
      // Missing Event Timing support is reported as a failed interaction sample.
    }
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

async function waitForServer(url) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status === 404) return
    } catch {
      // The static server is still starting.
    }
    await sleep(100)
  }
  throw new Error(`Static server did not become ready at ${url}`)
}

async function getFreePort() {
  const probe = createNetServer()
  await new Promise((resolvePort, reject) => {
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => resolvePort())
  })
  const address = probe.address()
  if (typeof address !== 'object' || !address) throw new Error('Could not determine static server port')
  await new Promise((resolveClose, rejectClose) => probe.close((error) => error ? rejectClose(error) : resolveClose()))
  return address.port
}

async function stopStaticServer(server) {
  if (!server || server.exitCode !== null) return
  await new Promise((resolveStop) => {
    const onExit = () => resolveStop()
    server.once('exit', onExit)
    try {
      if (!server.kill('SIGTERM') && server.exitCode !== null) {
        server.off('exit', onExit)
        resolveStop()
      }
    } catch {
      server.off('exit', onExit)
      resolveStop()
    }
  })
}

async function startStaticServer() {
  const port = await getFreePort()
  const server = spawn(process.execPath, ['scripts/serve-static.mjs', String(port), SITE_ROOT], {
    cwd: resolve('.'),
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  const base = `http://127.0.0.1:${port}`
  try {
    await waitForServer(`${base}/`)
    return { server, base }
  } catch (error) {
    await stopStaticServer(server)
    throw error
  }
}

async function measureSample(browser, base, definition, iteration) {

  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  await context.addInitScript({ content: `(${OBSERVER_SCRIPT.toString()})()` })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: NETWORK.latency,
    downloadThroughput: NETWORK.downloadThroughput,
    uploadThroughput: NETWORK.uploadThroughput,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  const resources = []
  const requestCounts = new Map()
  page.on('request', (request) => {
    const url = request.url()
    resources.push(url)
    requestCounts.set(url, (requestCounts.get(url) ?? 0) + 1)
  })

  await page.goto(`${base}${definition.path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(100)
  const initialResourceUrls = [...new Set(resources)]
  const exerciseResult = await definition.exercise(page)
  await page.waitForTimeout(250)
  const performance = await page.evaluate(() => {
    const state = window.__acxPerformance ?? { lcp: [], cls: [], events: [] }
    const lcpEntry = state.lcp.reduce((latest, entry) => entry.startTime > (latest?.startTime ?? -1) ? entry : latest, null)
    return {
      lcp: lcpEntry?.startTime ?? null,
      lcpElement: lcpEntry?.element ?? null,
      lcpText: lcpEntry?.text ?? null,
      cls: state.cls.reduce((sum, value) => sum + value, 0),
      events: state.events,
    }
  })
  const eventDurations = performance.events.map((entry) => entry.duration)
  const result = {
    name: definition.name,
    iteration,
    path: definition.path,
    lcp: performance.lcp,
    lcpElement: performance.lcpElement,
    lcpText: performance.lcpText,
    cls: performance.cls,
    eventTimingEntries: performance.events.length,
    maxInteractionDuration: eventDurations.length ? Math.max(...eventDurations) : null,
    eventExpected: definition.eventExpected,
    initialResourceUrls,
    resourceUrls: [...new Set(resources)],
    resourceRequestCounts: Object.fromEntries(requestCounts),
    flow: exerciseResult?.flow ?? null,
  }
  await context.close()
  return result
}

const definitions = [
  {
    name: 'home-load',
    path: '/',
    eventExpected: false,
    async exercise() {
      return null
    },
  },
  {
    name: 'calculator-edit',
    path: '/calculator?data=VFJBTi5TQ0hPT0xSVU4uQ0FSLktNOjEwMDAsRk9PRC5NRUFMLkJFRUYuU0VSVklORzoxMA==',
    async exercise(page) {
      await page.getByRole('button', { name: 'Edit' }).first().click()
      await page.locator('input[id$="-quantity"]').fill('1250')
      await page.waitForTimeout(100)
      const flowSummary = page.getByText('Show activity → category flow', { exact: true })
      const flowAvailable = await flowSummary.count() > 0
      const beforeFlow = new Set(await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name)))
      if (!flowAvailable) return { flow: { available: false, opened: false, newResources: [] } }
      await flowSummary.click()
      await page.locator('.impact-flow__svg').waitFor({ state: 'visible' })
      const afterFlow = new Set(await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name)))
      return {
        flow: {
          available: true,
          opened: true,
          newResources: [...afterFlow].filter((url) => !beforeFlow.has(url)),
        },
      }
    },
  },
  {
    name: 'explore-query',
    path: '/explore',
    eventExpected: true,
    async exercise(page) {
      await page.getByRole('searchbox', { name: 'Search records' }).pressSequentially('refrigerator')
      await page.waitForTimeout(100)
      return null
    },
  },
]

async function main() {
  await mkdir(resolve('dist'), { recursive: true })
  let server
  let browser
  let base
  let browserVersion
  const samples = []
  try {
    ({ server, base } = await startStaticServer())
    browser = await chromium.launch()
    browserVersion = browser.version()
    console.log(`Chromium: ${browserVersion}`)
    for (const definition of definitions) {
      for (let iteration = 1; iteration <= SAMPLE_COUNT; iteration += 1) {
        samples.push(await measureSample(browser, base, definition, iteration))
      }
    }
    for (const sample of samples) console.log(`${sample.name} #${sample.iteration} LCP ${sample.lcp}ms (${sample.lcpElement}: ${sample.lcpText}) CLS ${sample.cls} events ${sample.eventTimingEntries} flow ${sample.flow?.opened ?? false}`)
  } finally {
    await browser?.close().catch(() => {})
    await stopStaticServer(server)
  }

  const medians = Object.fromEntries(definitions.map((definition) => {
    const group = samples.filter((sample) => sample.name === definition.name)
    return [definition.name, {
      lcp: median(group.map((sample) => sample.lcp).filter((value) => value !== null)),
      cls: median(group.map((sample) => sample.cls)),
      maxInteractionDuration: median(group.map((sample) => sample.maxInteractionDuration).filter((value) => value !== null)),
    }]
  }))
  const report = {
    generatedAt: new Date().toISOString(),
    browser: `Chromium ${browserVersion}`,
    network: NETWORK,
    cpuThrottleRate: 4,
    samples,
    medians,
  }
  await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`)

  const errors = []
  for (const sample of samples) {
    if (sample.cls > 0.1) errors.push(`${sample.name} #${sample.iteration} CLS ${sample.cls} > 0.1`)
    if (sample.eventExpected && sample.eventTimingEntries === 0) errors.push(`${sample.name} #${sample.iteration} has no Event Timing interaction entry`)
    if (sample.maxInteractionDuration !== null && sample.maxInteractionDuration > 200) errors.push(`${sample.name} #${sample.iteration} lab interaction duration ${sample.maxInteractionDuration}ms > 200ms`)
  }
  for (const [name, summary] of Object.entries(medians)) {
    if (summary.lcp !== null && summary.lcp > 2500) errors.push(`${name} median LCP ${summary.lcp}ms > 2500ms`)
  }
  const calculatorSamples = samples.filter((sample) => sample.name === 'calculator-edit')
  if (calculatorSamples.some((sample) => sample.initialResourceUrls.some((url) => /d3-sankey|ImpactFlow|impact-flow/i.test(url)))) {
    errors.push('calculator-edit requested the flow chunk before its disclosure was opened')
  }
  if (calculatorSamples.some((sample) => sample.flow?.opened !== true || sample.flow.newResources.filter((url) => new URL(url).pathname.endsWith('.js')).length === 0)) {
    errors.push('calculator-edit did not request and render the lazy flow chunk after opening its disclosure')
  }
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  }
  console.log(JSON.stringify({ output: OUTPUT, medians }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
