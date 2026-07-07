import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
  },
  webServer: {
    // The app is a static export (output: 'export'), so `next start` cannot
    // serve it. Use the dev server for e2e — it renders the same client
    // components the static build ships. Reuses an already-running dev server
    // locally; starts its own in CI.
    command: 'pnpm dev --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
