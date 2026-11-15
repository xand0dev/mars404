// E2E F1: глобус на телефоні (400 px) і в Glove mode — усі 6 точок вибираються, переліт, «Back to globe».
import { expect, test, type Page } from '@playwright/test';

const START = process.env.CI ? './?2d' : './';

test.skip(({ isMobile }) => !isMobile, 'лише телефон (phone-400)');

const OPEN = [
  { name: 'Gale / Mount Sharp', terrain: 'Gale terrain' },
  { name: 'Columbia Hills (Gusev)', terrain: 'Columbia Hills terrain' },
  { name: 'Olympus Mons', terrain: 'Olympus Mons terrain' },
  { name: 'Valles Marineris', terrain: 'Valles Marineris terrain' },
];
const CARDS = ['Jezero', 'Meridiani Planum'];

/** У Glove mode панель Location — у «More panels»; далі — розгорнути саму панель. */
async function openLocation(page: Page) {
  const more = page.locator('details.shell__more');
  if ((await more.count()) > 0 && !(await more.evaluate((d) => (d as HTMLDetailsElement).open))) {
    await more.locator(':scope > summary').click();
  }
  const head = page.getByRole('button', { name: 'Location', exact: true });
  if ((await head.count()) > 0 && (await head.getAttribute('aria-expanded')) === 'false') await head.click();
}

async function tap(page: Page, name: string) {
  await openLocation(page);
  const btn = page.getByRole('button', { name, exact: true });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
}

const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

for (const glove of [false, true]) {
  test.describe(glove ? 'Glove mode' : 'звичайний режим', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((g) => {
        localStorage.setItem('mars404.onboarded', '1');
        localStorage.setItem('mars404.gloveMode', g ? '1' : '0');
      }, glove);
      await page.goto(START);
    });

    for (const s of OPEN) {
      test(`${s.name}: переліт → рельєф → «Back to globe»`, async ({ page }) => {
        await tap(page, s.name);
        await expect(page.getByRole('region', { name: s.terrain })).toBeVisible();
        expect(await noHScroll(page), 'без горизонтального скролу').toBe(true);
        await tap(page, 'Back to globe');
        await expect(page.getByRole('region', { name: 'Mars globe' })).toBeVisible();
        expect(await noHScroll(page)).toBe(true);
      });
    }

    for (const name of CARDS) {
      test(`${name}: лише картка, глобус лишається`, async ({ page }) => {
        await tap(page, name);
        await expect(page.getByRole('region', { name, exact: true })).toContainText('Card only');
        await expect(page.getByRole('region', { name: 'Mars globe' })).toBeVisible();
      });
    }

    if (glove) {
      test('кнопки точок і «Back to globe» — цілі дотику ≥ 64 px', async ({ page }) => {
        await openLocation(page);
        for (const name of [...OPEN.map((s) => s.name), ...CARDS]) {
          const box = await page.getByRole('button', { name, exact: true }).boundingBox();
          expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(64);
        }
        await tap(page, 'Gale / Mount Sharp');
        await expect(page.getByRole('region', { name: 'Gale terrain' })).toBeVisible();
        await openLocation(page);
        const back = await page.getByRole('button', { name: 'Back to globe' }).boundingBox();
        expect(back?.height ?? 0).toBeGreaterThanOrEqual(64);
      });
    }
  });
}
