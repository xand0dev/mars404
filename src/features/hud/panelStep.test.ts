import { describe, expect, it } from 'vitest';
import type { RoutePlan } from '../../contracts';
import { STEP_PANEL, isPanelOpen, panelStep, togglePanel, type PanelOverrides } from './panelStep';

// T24: відкрита та панель правої колонки, що потрібна для наступного кроку демо (SPEC §3).
const plan = (status: RoutePlan['status']) => ({ status }) as RoutePlan;

describe('panelStep — наступний крок', () => {
  it('сайт не обрано → Location', () => expect(STEP_PANEL[panelStep({ site: null, plan: null })]).toBe('Location'));
  it('сайт є, плану немає або він не ok → Science targets', () => {
    expect(STEP_PANEL[panelStep({ site: 'gale', plan: null })]).toBe('Science targets');
    expect(STEP_PANEL[panelStep({ site: 'gale', plan: plan('no-path') })]).toBe('Science targets');
  });
  it('план ok → Pre-EVA checklist', () => expect(STEP_PANEL[panelStep({ site: 'gale', plan: plan('ok') })]).toBe('Pre-EVA checklist'));
});

describe('ручний вибір має пріоритет, доки крок не зміниться', () => {
  const none: PanelOverrides = { step: 'site', open: {} };
  it('за замовчуванням відкрита лише панель кроку', () => {
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
