import { expect, test } from '@playwright/test'

const demoWorldsPayload = {
  worlds: [
    {
      id: 'demo-current-state',
      displayName: 'Carbon Scenario: Current State',
      description: 'High-emission industrial landscape',
      tags: ['carbon-acx', 'scenario', 'current-state', 'demo'],
      prompt:
        'Urban industrial landscape with factories, traffic congestion, brown smog, coal power plants, showing high carbon emissions and pollution',
      status: 'completed',
      createdAt: '2026-01-25T12:00:00Z',
      model: 'Marble 0.1-mini',
      scenarioId: 'current-state',
      category: 'emissions',
    },
    {
      id: 'demo-net-zero',
      displayName: 'Carbon Scenario: Net Zero 2050',
      description: 'Sustainable city of the future',
      tags: ['carbon-acx', 'scenario', 'net-zero-2050', 'demo'],
      prompt:
        'Sustainable city with solar panels on rooftops, wind turbines in the distance, green buildings with vertical gardens, electric vehicles, clear blue sky',
      status: 'completed',
      createdAt: '2026-01-25T12:05:00Z',
      model: 'Marble 0.1-mini',
      scenarioId: 'net-zero-2050',
      category: 'renewable',
    },
  ],
  backend: {
    mode: 'demo',
    canGenerate: false,
    message: 'WORLD_LABS_API_KEY is not configured. Showing demo worlds only.',
  },
}

test('worlds demo fallback renders demo data and disables live generation', async ({
  page,
}) => {
  await page.route('**/api/worlds', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(demoWorldsPayload),
    })
  })

  await page.goto('/explore/worlds')
  await expect(
    page.getByText('WORLD_LABS_API_KEY is not configured. Showing demo worlds only.')
  ).toBeVisible()

  await page.getByRole('button', { name: 'Current State' }).click()
  await expect(
    page.getByRole('button', { name: 'Live Generation Unavailable' })
  ).toBeDisabled()

  await page.getByRole('button', { name: /Gallery/ }).click()
  await expect(page.getByText('Carbon Scenario: Current State')).toBeVisible()
})

test('worlds live mode queues and completes a generated world', async ({ page }) => {
  let worldReady = false
  let pollCount = 0

  await page.route('**/api/worlds', async (route) => {
    const payload = worldReady
      ? {
          worlds: [
            {
              id: 'world-live-1',
              displayName: 'Carbon Scenario: Net Zero 2050',
              description: 'Live renewable scenario',
              tags: ['carbon-acx', 'scenario', 'net-zero-2050'],
              prompt:
                'Sustainable city with solar panels on rooftops, wind turbines in the distance, green buildings with vertical gardens, electric vehicles, clear blue sky',
              status: 'completed',
              createdAt: '2026-01-26T12:00:00Z',
              thumbnailUrl: 'https://example.com/thumb.png',
              videoUrl: 'https://example.com/video.mp4',
              model: 'Marble 0.1-mini',
              scenarioId: 'net-zero-2050',
              category: 'renewable',
            },
          ],
          backend: {
            mode: 'live',
            canGenerate: true,
            message: 'Connected to the World Labs API.',
          },
        }
      : {
          worlds: [],
          backend: {
            mode: 'live',
            canGenerate: true,
            message: 'Connected to the World Labs API.',
          },
        }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })

  await page.route('**/api/worlds/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        operation: {
          id: 'op-live-1',
          status: 'pending',
          startedAt: '2026-01-26T12:00:00Z',
        },
        backend: {
          mode: 'live',
          canGenerate: true,
          message: 'Generation request accepted by the World Labs API.',
        },
      }),
    })
  })

  await page.route('**/api/worlds/operations?*', async (route) => {
    pollCount += 1

    const payload =
      pollCount >= 2
        ? {
            operations: [
              {
                id: 'op-live-1',
                status: 'completed',
                worldId: 'world-live-1',
              },
            ],
            backend: {
              mode: 'live',
              canGenerate: true,
              message: 'Polling World Labs operation status.',
            },
          }
        : {
            operations: [
              {
                id: 'op-live-1',
                status: 'processing',
                progress: 45,
              },
            ],
            backend: {
              mode: 'live',
              canGenerate: true,
              message: 'Polling World Labs operation status.',
            },
          }

    if (pollCount >= 2) {
      worldReady = true
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })

  await page.goto('/explore/worlds')
  await page.getByRole('button', { name: 'Net Zero 2050' }).click()
  await page.getByRole('button', { name: 'Generate World' }).click()

  await expect(page.getByText('Carbon Scenario: Net Zero 2050')).toBeVisible()
  await expect(page.getByText('Open rendered output →')).toBeVisible()
  await expect(page.getByText('Connected to the World Labs API.')).toBeVisible()
})
