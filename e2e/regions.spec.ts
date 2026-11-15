// E2E #101: кілька районів. Columbia Hills відкривається з глобуса так само, як Gale; повернення до Gale не ламає демо.
import { expect, test, type Page } from '@playwright/test';

const START = process.env.CI ? './?2d' : './';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mars404.onboarded', '1'));
  await page.goto(START);
});

/** Панель Location згортається на пізніших кроках — розгорнути, якщо треба. */
async function openLocation(page: Page) {
  const head = page.getByRole('button', { name: 'Location', exact: true });
  if ((await head.count()) > 0 && (await head.getAttribute('aria-expanded')) === 'false') await head.click();
}

async function chooseSite(page: Page, name: string) {
  await openLocation(page);
  const btn = page.getByRole('button', { name });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
}

test('глобус → Columbia Hills: реальний рельєф району, дані verified, без MOCK', async ({ page }) => {
  await chooseSite(page, 'Columbia Hills (Gusev)');
  await expect(page.getByRole('region', { name: 'Columbia Hills terrain' })).toBeVisible();
  await expect(page.locator('.shell__title')).toHaveText(/Columbia Hills/);
  const map = page.getByRole('region', { name: 'Columbia Hills terrain' });
  await expect(map).toContainText(/Data:\s*verified/);
  await expect(page.getByRole('button', { name: /Map data/ })).toContainText('GO');
  await openLocation(page);
  await expect(page.getByRole('button', { name: 'Columbia Hills (Gusev)' })).toHaveAttribute('aria-pressed', 'true');
});

test('Gale без змін після Columbia Hills: Brantôme + Mont Mercou → Build route → Return in', async ({ page }) => {
  await chooseSite(page, 'Columbia Hills (Gusev)');
  await expect(page.getByRole('region', { name: 'Columbia Hills terrain' })).toBeVisible();
  await chooseSite(page, 'Gale / Mount Sharp');
  await expect(page.getByRole('region', { name: 'Gale terrain' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Brantôme' }).click();
  await page.getByRole('button', { name: 'Add Mont Mercou' }).click();
  await page.getByRole('button', { name: 'Build route' }).first().click();
  await expect(page.locator('.hud__return')).toHaveText(/Return in \d+ min/);
  await expect(page.getByRole('list', { name: 'Route legs' })).toBeVisible();
});
