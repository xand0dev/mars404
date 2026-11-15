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

/** На телефоні нижні панелі — у шторці «Details»: відкрити (true) або закрити (false). */
async function sheet(page: Page, open: boolean) {
  const handle = page.getByRole('button', { name: 'Details', exact: true });
  if ((await handle.count()) === 0 || !(await handle.isVisible())) return;
  if (((await handle.getAttribute('aria-expanded')) === 'true') !== open) await handle.click();
}

/** Панель «Crew map notes»: відкрити шторку (телефон) і розгорнути панель, якщо згорнута. */
async function expand(page: Page, name: string) {
  await sheet(page, true);
  const head = page.getByRole('button', { name, exact: true });
  if ((await head.count()) > 0 && (await head.getAttribute('aria-expanded')) === 'false') await head.click();
}

async function backToGlobe(page: Page) {
  await sheet(page, false);
  await openLocation(page);
  const back = page.getByRole('button', { name: 'Back to globe' });
  await back.scrollIntoViewIfNeeded();
  await back.click();
  await expect(page.getByRole('region', { name: 'Mars globe' })).toBeVisible();
}

test('мітки привʼязані до району: Blocked на Gale не зʼявляється в Columbia Hills і повертається на Gale', async ({ page }) => {
  await chooseSite(page, 'Gale / Mount Sharp');
  await expect(page.getByRole('region', { name: 'Gale terrain' })).toBeVisible();
  await expand(page, 'Crew map notes');
  const notes = page.getByRole('region', { name: 'Crew map notes' });
  await notes.getByLabel('Mark type').selectOption('impassable');
  await notes.getByLabel('Mark text').fill('sand trap');
  await notes.getByRole('button', { name: 'Add mark' }).click();
  await expect(notes.getByRole('list', { name: 'Crew marks' })).toContainText('sand trap');

  await backToGlobe(page);
  await chooseSite(page, 'Columbia Hills (Gusev)');
  await expect(page.getByRole('region', { name: 'Columbia Hills terrain' })).toBeVisible();
  await expand(page, 'Crew map notes');
  await expect(notes).toContainText('No marks yet.');
  await expect(notes.getByRole('list', { name: 'Crew marks' })).toHaveCount(0);

  await backToGlobe(page);
  await chooseSite(page, 'Gale / Mount Sharp');
  await expect(page.getByRole('region', { name: 'Gale terrain' })).toBeVisible();
  await expand(page, 'Crew map notes');
  await expect(notes.getByRole('list', { name: 'Crew marks' })).toContainText('sand trap');
});
