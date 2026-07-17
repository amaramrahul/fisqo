import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Exercises the real delivery model: the API serving the built SPA.
    command: 'npm run build && node scripts/start-e2e.mjs',
    url: `${BASE_URL}/api/v1/tax-users`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
