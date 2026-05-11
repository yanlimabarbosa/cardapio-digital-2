import { defineConfig, devices } from '@playwright/test';

const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3848';
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';

export default defineConfig({
  testDir: './tests',
  timeout: 75_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: webBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'PAGBANK_EVIDENCE_ENABLED=true PAGBANK_EVIDENCE_DIR=test-results/pagbank-homologation pnpm --filter api dev',
      url: `${apiBaseUrl}/api/store/status`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `NEXT_PUBLIC_API_URL=${apiBaseUrl} pnpm --filter web dev`,
      url: webBaseUrl,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
