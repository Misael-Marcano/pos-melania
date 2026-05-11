import { defineConfig, devices } from '@playwright/test';

/**
 * E2E: requiere frontend (`npm run dev` en apps/frontend) y API (`apps/backend`)
 * con la misma `NEXT_PUBLIC_API_URL` que use el cliente.
 *
 * Credenciales: `E2E_EMAIL` y `E2E_PASSWORD` (ver `e2e/README.md`).
 */
export default defineConfig({
  testDir:   './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries:   process.env.CI ? 1 : 0,
  workers:   1,
  timeout:   60_000,
  expect:    { timeout: 15_000 },
  reporter:  [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace:   'on-first-retry',
    video:   'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
