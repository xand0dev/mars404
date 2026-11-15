// E2E / UX-тести: справжній браузер (Chrome) проти зібраного сайту (vite preview), як у журі.
// Запуск: npm run e2e (збирає й піднімає preview сам). Три екрани: ноутбук демо, менший ноутбук, телефон.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173/',
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'laptop-1280', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'phone-400', use: { viewport: { width: 400, height: 800 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
