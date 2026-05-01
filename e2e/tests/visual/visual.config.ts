import { defineConfig } from '@playwright/test'
import path from 'path'

const rootDir = path.resolve(__dirname, '../../..')

export default defineConfig({
  testDir: '.',
  testMatch: '*.visual.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['json', { outputFile: '../../reports/results-visual.json' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run dev:server',
      port: 3001,
      timeout: 30000,
      reuseExistingServer: true,
      cwd: rootDir,
    },
    {
      command: 'npm run dev:client',
      port: 5173,
      timeout: 30000,
      reuseExistingServer: true,
      cwd: rootDir,
    },
  ],
})
