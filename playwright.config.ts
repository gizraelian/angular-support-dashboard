import { defineConfig } from '@playwright/test';
if (!process.env.M5_PROJECT?.startsWith('workorder-m5-'))
  throw new Error('Use pnpm e2e: isolated stack required.');
export default defineConfig({
  globalTimeout: 600_000,
  testDir: './e2e',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: true,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: './e2e/safe-reporter.ts',
  use: {
    baseURL: 'http://127.0.0.1:4200',
    browserName: 'chromium',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    viewport: { width: 1440, height: 1000 },
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  webServer: {
    command: `"${process.execPath}" node_modules/@angular/cli/bin/ng.js serve --configuration local-browser --port 4200`,
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
