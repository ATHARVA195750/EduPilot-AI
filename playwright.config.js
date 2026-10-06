import { defineConfig, devices } from '@playwright/test';

// EduPilot production-regression suite: real Chromium against the local stack
// (Vite :5173 -> FastAPI :8000 -> PostgreSQL/Neon). Servers are managed by
// START_EDUPILOT.bat / STOP_EDUPILOT.bat, so no webServer is spawned here.
// Rules: real UI login only — no JWT/localStorage injection, no API mocks,
// no Supabase. See tests/regression/.
export default defineConfig({
  testDir: './tests/regression',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
    trace: 'off',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
