import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMission, useMission } from '../../store/useMission';
import { chooseSite } from './choose';
import { resetGlobe, useGlobe } from './globeState';

beforeEach(() => {
  resetMission();
  resetGlobe();
});
afterEach(() => vi.unstubAllGlobals());

// Клік по маркеру на глобусі = кнопка в панелі.
describe('chooseSite — спільна дія панелі й маркерів', () => {
  it('Given сцени немає; When Gale; Then site = "gale" одразу (F1-AC1)', () => {
    chooseSite('gale');
    expect(useMission.getState().site).toBe('gale');
  });

  it('Given сцена є, без reduced motion; When Gale; Then старт переходу, site ще null (F1-AC3)', () => {
    useGlobe.getState().setSceneReady(true);
    chooseSite('gale');
    expect(useGlobe.getState().flying).toBe(true);
    expect(useMission.getState().site).toBeNull();
  });

  it('Given reduced motion; When Gale; Then одразу (F1-AC3)', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' }));
    useGlobe.getState().setSceneReady(true);
    chooseSite('gale');
    expect(useMission.getState().site).toBe('gale');
  });

  it('Given перехід іде; When Jezero; Then картка, перехід скасовано, site не змінюється (F1-AC2)', () => {
    useGlobe.getState().setSceneReady(true);
    chooseSite('gale');
    chooseSite('jezero');
    expect(useGlobe.getState()).toMatchObject({ previewId: 'jezero', flying: false });
    expect(useMission.getState().site).toBeNull();
  });

  it('Given невідомий id; Then нічого не змінюється', () => {
    chooseSite('nowhere');
    expect(useGlobe.getState().previewId).toBeNull();
    expect(useMission.getState().site).toBeNull();
  });
});
