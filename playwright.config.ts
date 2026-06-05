import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  projects: [
    {
      name: 'chromium',
      use: {
        baseURL: 'http://localhost:5173',
        viewport: { width: 1440, height: 900 },
        screenshot: 'on',
        trace: 'on-first-retry',
      },
    },
  ],
  outputDir: 'test-results',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
