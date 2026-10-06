import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Fresh fictional demo store for every run, against a production build.
    command: `rm -rf .demo-e2e && npx next build && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATA_MODE: 'demo',
      NEXT_PUBLIC_DATA_MODE: 'demo',
      ALLOW_PRODUCTION_DEMO: 'true',
      DEMO_DATA_DIR: '.demo-e2e',
      DEMO_SESSION_SECRET: 'e2e-only-secret',
    },
  },
});
