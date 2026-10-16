import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// No ambiente de nuvem do Claude Code o Chromium já vem instalado neste caminho.
const chromiumLocal = '/opt/pw-browsers/chromium';
const launchOptions = !process.env.CI && existsSync(chromiumLocal) ? { executablePath: chromiumLocal } : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173/', trace: 'retain-on-failure', launchOptions },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: 'celular', use: { browserName: 'chromium', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
  ],
});
