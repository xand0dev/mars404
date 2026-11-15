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

// У CI немає відеокарти: 3D-рельєф на програмному WebGL гальмує сторінку. UX-контракт однаковий для 3D і 2D-плану Б (F2, ?2d),
// тож у CI тести йдуть з ?2d; локально — справжнє 3D.
const START = process.env.CI ? './?2d' : './';

test.beforeEach(async ({ page }) => {
  await page.goto(START);
});

test('перший візит: підказка «How it works» пояснює 4 кроки, «Got it» ховає її назавжди', async ({ page }) => {
  const help = page.getByRole('dialog', { name: 'Plan a walk on Mount Sharp in 4 steps' });
  await expect(help).toBeVisible();
  await expect(help, 'підказка — у першому екрані').toBeInViewport();
  await expect(help.getByRole('listitem')).toHaveCount(4);
  await help.getByRole('button', { name: 'Got it' }).click();
  await expect(help).toBeHidden();
  await page.reload();
  await expect(help, 'вдруге не показується').toBeHidden();
  await page.getByRole('button', { name: 'How it works' }).click();
  await expect(help).toBeVisible();
});

test('наступна дія підсвічена на кожному кроці', async ({ page }) => {
  const lit = async (target: Locator) => {
    const name = await target.evaluate((e) => getComputedStyle(e).animationName);
    expect(name, 'кнопка наступної дії підсвічена').toBe('next-action');
  };
  await lit(page.getByRole('button', { name: 'Gale / Mount Sharp' }));
  await page.getByRole('button', { name: 'Gale / Mount Sharp' }).click();
  await expect(currentStep(page)).toContainText('Targets');
  await page.getByRole('button', { name: 'Add Brantôme' }).click();
  await lit(page.getByRole('button', { name: 'Build route' }));
});

test('перший екран: видно поточний крок і що зробити далі', async ({ page }) => {
  // Глобус: лише карта й Location — крок «Location» підсвічений, Gale — у першому екрані; HUD і панелі планування сховані.
  await expect(currentStep(page)).toContainText('Location');
  if (isDesktop(page)) await expect(page.getByRole('button', { name: 'Gale / Mount Sharp' })).toBeInViewport();
  for (const name of ['Layers', 'Science targets', 'Route', 'Navigation', 'Resources']) {
    await expect(page.getByRole('region', { name, exact: true }), name).toHaveCount(0);
  }
  await expect(page.locator('.hud__status')).toHaveCount(0);
  // Після вибору району HUD підказує наступний крок.
  await page.getByRole('button', { name: 'Gale / Mount Sharp' }).click();
  const hint = page.locator('.hud__status');
  await expect(hint).toContainText('Next:');
  await expect(hint, 'підказка «що далі» — у першому екрані').toBeInViewport();
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

  // Навігація без GPS: після маршруту — маяки й частка маршруту з точним місцем.
  const nav = page.getByRole('region', { name: 'Navigation' });
  await expect(nav).toContainText(/\d+% of the route with a precise position/);
  await expect(nav.getByRole('list', { name: 'Navigation beacons' }).getByRole('listitem').first()).toContainText('Base');

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
  const small = (scope: string) =>
    page.evaluate(
      (sel) =>
        [...document.querySelectorAll(`${sel} :is(button, input, select, summary)`)]
          .filter((e) => {
            const b = e.getBoundingClientRect();
            return b.width > 0 && b.height > 0 && (b.height < 63.5 || b.width < 63.5);
          })
          .map((e) => (e.textContent ?? '').trim().slice(0, 30)),
      scope,
    );
  expect(await small('body'), 'у glove mode усі цілі на глобусі ≥ 64 px').toEqual([]);
  // HUD є лише в районі: Gale з «More panels» → Location.
  await page.locator('details.shell__more > summary').click();
  const loc = page.getByRole('button', { name: 'Location', exact: true });
  if ((await loc.count()) > 0 && (await loc.getAttribute('aria-expanded')) === 'false') await loc.click();
  await page.getByRole('button', { name: 'Gale / Mount Sharp' }).click();
  await expect(page.getByRole('region', { name: 'Gale terrain' })).toBeVisible();
  // Згорнути «More panels» назад, як на першому екрані (клік по summary прокрутив би сторінку до нього).
  await page.locator('details.shell__more').evaluate((d) => ((d as HTMLDetailsElement).open = false));
  await expect(page.locator('.hud__return')).toBeInViewport();
  await expect(page.getByTestId('gonogo-verdict')).toBeInViewport();
  expect(await small('.shell__hud'), 'у glove mode цілі HUD ≥ 64 px').toEqual([]);
});
