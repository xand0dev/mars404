// E2E / UX: чи зрозуміло новій людині, що робити, і чи проходить демо SPEC §3 у справжньому браузері.
// Контракт UX: на кожному кроці видно, який крок зараз, і наступна дія — у полі зору без прокрутки (≥ 1200 px).
import { expect, test, type Locator, type Page } from '@playwright/test';

const currentStep = (page: Page) => page.getByRole('list', { name: 'Demo steps' }).locator('[aria-current="step"]');
const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1200;

/** Наступна дія: на десктопі мусить бути видна без прокрутки; на телефоні — досяжна прокруткою сторінки. */
async function act(page: Page, target: Locator) {
  if (isDesktop(page)) await expect(target, 'наступна дія має бути видна без прокрутки').toBeInViewport();
  else await target.scrollIntoViewIfNeeded();
  await target.click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('перший екран: видно поточний крок і що зробити далі', async ({ page }) => {
  await expect(currentStep(page)).toContainText('Location');
  const hint = page.locator('.hud__status');
  await expect(hint).toContainText('Next:');
  await expect(hint, 'підказка «що далі» — у першому екрані').toBeInViewport();
  if (isDesktop(page)) await expect(page.getByRole('button', { name: 'Gale / Mount Sharp' })).toBeInViewport();
});

test('демо: Gale → Brantôme + Mont Mercou → Build route → GO / NO-GO', async ({ page }) => {
  await act(page, page.getByRole('button', { name: 'Gale / Mount Sharp' }));
  await expect(page.getByRole('region', { name: 'Gale terrain' })).toBeVisible();
  await expect(currentStep(page)).toContainText('Targets');

  await act(page, page.getByRole('button', { name: 'Add Brantôme' }));
  await expect(currentStep(page)).toContainText('Route');
  await act(page, page.getByRole('button', { name: 'Add Mont Mercou' }));

  await act(page, page.getByRole('button', { name: 'Build route' }));
  await expect(currentStep(page)).toContainText('Checklist');
  await expect(page.locator('.hud__return')).toHaveText(/Return in \d+ min/);
  await expect(page.getByTestId('gonogo-verdict')).toHaveText(/GO|NO-GO|HOLD/);
  await expect(page.getByRole('list', { name: 'Route legs' })).toBeVisible();

  if (isDesktop(page)) {
    await expect(page.locator('.hud__return'), 'головне число видно без прокрутки').toBeInViewport();
    await expect(page.getByTestId('gonogo-verdict')).toBeInViewport();
    const fits = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
    expect(fits, 'на десктопі застосунок уміщається в один екран').toBe(true);
  }
});

test('компонування: без горизонтального скролу, цілі дотику ≥ 40 px, фокус видно', async ({ page }) => {
  await page.getByRole('button', { name: 'Gale / Mount Sharp' }).click();
  await expect(page.getByRole('region', { name: 'Gale terrain' })).toBeVisible();
  const report = await page.evaluate(() => {
    const vis = (e: Element) => {
      const b = e.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden';
    };
    const small = [...document.querySelectorAll('button, input:not([type=file]), select, summary')]
      .filter(vis)
      .filter((e) => {
        const b = e.getBoundingClientRect();
        return b.height < 39.5 || b.width < 39.5;
      })
      .map((e) => (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 30));
    return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, small };
  });
  expect(report.overflow, 'горизонтальний скрол').toBe(false);
  expect(report.small, 'дрібні цілі дотику').toEqual([]);

  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el ? parseFloat(getComputedStyle(el).outlineWidth) : 0;
  });
  expect(outline, 'фокус видно (≥ 3 px)').toBeGreaterThanOrEqual(3);
});

test('glove mode: великі цілі, вердикт і «Return in» у першому екрані, стан переживає перезавантаження', async ({ page }) => {
  await page.getByRole('button', { name: 'Glove mode' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Glove mode' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.hud__return')).toBeInViewport();
  await expect(page.getByTestId('gonogo-verdict')).toBeInViewport();
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('button, input, select, summary')]
      .filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && (b.height < 63.5 || b.width < 63.5);
      })
      .map((e) => (e.textContent ?? '').trim().slice(0, 30)),
  );
  expect(small, 'у glove mode усі цілі ≥ 64 px').toEqual([]);
});
