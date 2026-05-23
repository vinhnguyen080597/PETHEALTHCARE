import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_WEB_PORT ?? 19006);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const slowMo = Number(process.env.E2E_SLOW_MO_MS ?? 0);

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: slowMo > 0 ? { slowMo } : undefined,
  },
  webServer: {
    command: `npx expo start --web --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
