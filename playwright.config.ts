import { defineConfig } from '@playwright/test';

const SITE_PORT = Number(process.env.PLAYWRIGHT_SITE_PORT ?? 4173);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${SITE_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'npx wrangler dev --local --persist --port 8787',
      port: 8787,
      reuseExistingServer: true,
      timeout: 60_000
    },
    {
      command: `npm --prefix site run dev -- --host 127.0.0.1 --port ${SITE_PORT}`,
      port: SITE_PORT,
      reuseExistingServer: true,
      timeout: 60_000
    }
  ]
});
