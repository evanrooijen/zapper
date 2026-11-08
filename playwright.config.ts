import { defineConfig, devices } from '@playwright/test'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for browser tests')

const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
const port = new URL(baseURL).port || '80'

export default defineConfig({
  testDir: './e2e',
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  webServer: {
    reuseExistingServer: false,
    env: {
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${new URL('./e2e/omdb-preload.mjs', import.meta.url).pathname}`,
      OMDB_API_KEY: 'browser-test-key',
    },
    command: `pnpm exec vite dev --host localhost --port ${port} --strictPort`,
    url: baseURL,
    timeout: 120_000,
  },
})
