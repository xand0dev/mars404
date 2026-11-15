// E2E #105 (F1): режими точок глобуса — EVA, Overview, лише картка.
import { expect, test, type Page } from '@playwright/test';

const START = process.env.CI ? './?2d' : './';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mars404.onboarded', '1'));
  await page.goto(START);
});

/** Панель Location згортається після відкриття району — розгорнути, якщо треба. */
async function openLocation(page: Page) {
  const head = page.getByRole('button', { name: 'Location', exact: true });
  if ((await head.count()) > 0 && (await head.getAttribute('aria-expanded')) === 'false') await head.click();
}

async function chooseSite(page: Page, name: string) {
  await openLocation(page);
  const btn = page.getByRole('button', { name, exact: true });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
}

test('глобус → Columbia Hills відкривається як EVA: рельєф і картка «EVA site — plan a route»', async ({ page }) => {
  await chooseSite(page, 'Columbia Hills (Gusev)');
  await expect(page.getByRole('region', { name: 'Columbia Hills terrain' })).toBeVisible();
  await openLocation(page);
  await expect(page.getByRole('region', { name: 'Columbia Hills (Gusev)' })).toContainText('EVA site — plan a route');
});

test('глобус → Olympus Mons відкривається як Overview: рельєф, «terrain only»', async ({ page }) => {
  await chooseSite(page, 'Olympus Mons');
  await expect(page.getByRole('region', { name: 'Olympus Mons terrain' })).toBeVisible();
  await openLocation(page);
  await expect(page.getByRole('region', { name: 'Olympus Mons', exact: true })).toContainText('Overview — terrain only');
});

test('Jezero — лише картка, глобус лишається', async ({ page }) => {
  await chooseSite(page, 'Jezero');
  await expect(page.getByRole('region', { name: 'Jezero', exact: true })).toContainText('Card only');
  await expect(page.getByRole('region', { name: 'Mars globe' })).toBeVisible();
});
