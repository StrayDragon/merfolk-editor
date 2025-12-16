import { defineConfig, devices } from '@playwright/test';

const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const devServerPort = 5173;
const devServerHost = '127.0.0.1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  timeout: 60000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: `http://${devServerHost}:${devServerPort}`,
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        ...(chromiumExecutable
          ? { launchOptions: { executablePath: chromiumExecutable } }
          : {}),
      },
    },
  ],
  webServer: {
    command: `pnpm dev -- --host ${devServerHost} --port ${devServerPort} --strictPort`,
    url: `http://${devServerHost}:${devServerPort}`,
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120000,
  },
});
