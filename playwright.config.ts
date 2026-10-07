import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// No ambiente de nuvem o Chromium já vem instalado neste caminho.
const localChromium = '/opt/pw-browsers/chromium';
const launchOptions = !process.env.CI && existsSync(localChromium) ? { executablePath: localChromium } : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    trace: 'retain-on-failure',
    launchOptions,
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'iphone',
      use: { ...devices['iPhone 13'], browserName: 'chromium', defaultBrowserType: 'chromium' },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
