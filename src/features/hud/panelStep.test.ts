import { describe, expect, it } from 'vitest';
import type { RoutePlan } from '../../contracts';
import { STEP_PANELS, isPanelOpen, panelStep, togglePanel, type PanelOverrides } from './panelStep';

// T24: відкриті ті панелі, що потрібні для наступного кроку демо (SPEC §3); Resources — завжди.
const plan = (status: RoutePlan['status']) => ({ status }) as RoutePlan;

describe('panelStep — наступний крок', () => {
  it('сайт не обрано → site', () => expect(panelStep({ site: null, plan: null, selectedTargetIds: [] })).toBe('site'));
  it('сайт є, цілей немає → targets', () => expect(panelStep({ site: 'gale', plan: null, selectedTargetIds: [] })).toBe('targets'));
  it('цілі є, плану немає або він не ok → route', () => {
    expect(panelStep({ site: 'gale', plan: null, selectedTargetIds: ['a'] })).toBe('route');
    expect(panelStep({ site: 'gale', plan: plan('no-path'), selectedTargetIds: ['a'] })).toBe('route');
  });
  it('план ok → checklist', () => expect(panelStep({ site: 'gale', plan: plan('ok'), selectedTargetIds: ['a'] })).toBe('checklist'));
  it('Resources відкрито на кожному кроці; Route — коли вже є цілі', () => {
    for (const step of ['site', 'targets', 'route', 'checklist'] as const) expect(STEP_PANELS[step]).toContain('Resources');
    expect(STEP_PANELS.route).toEqual(expect.arrayContaining(['Science targets', 'Route']));
    expect(STEP_PANELS.checklist).toContain('Pre-EVA checklist');
  });
});

describe('ручний вибір має пріоритет, доки крок не зміниться', () => {
  const none: PanelOverrides = { step: 'site', open: {} };
  it('за замовчуванням відкриті лише панелі кроку', () => {
    expect(isPanelOpen('site', none, 'Location')).toBe(true);
    expect(isPanelOpen('site', none, 'Layers')).toBe(false);
  });
  it('перемикач відкриває й закриває будь-яку панель', () => {
    const a = togglePanel('site', none, 'Layers');
    expect(isPanelOpen('site', a, 'Layers')).toBe(true);
    const b = togglePanel('site', a, 'Location');
    expect(isPanelOpen('site', b, 'Location')).toBe(false);
    expect(isPanelOpen('site', b, 'Layers')).toBe(true);
  });
  it('новий крок скидає ручний вибір', () => {
    const a = togglePanel('site', togglePanel('site', none, 'Layers'), 'Location');
    expect(isPanelOpen('targets', a, 'Layers')).toBe(false);
    expect(isPanelOpen('targets', a, 'Science targets')).toBe(true);
    expect(togglePanel('targets', a, 'Layers').open).toEqual({ Layers: true });
  });
});
