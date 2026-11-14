import { beforeEach, describe, expect, it } from 'vitest';
import { resetGlobe, useGlobe } from './globeState';

beforeEach(() => resetGlobe());

describe('globeState — локальний стан F1', () => {
  it('Given старт; Then картки немає, текстура ще не завантажена', () => {
    const s = useGlobe.getState();
    expect(s.previewId).toBeNull();
    expect(s.texture).toEqual({ status: 'loading' });
  });

  it('When preview(id); Then previewId = id; When preview(null); Then картку закрито', () => {
    useGlobe.getState().preview('jezero');
    expect(useGlobe.getState().previewId).toBe('jezero');
    useGlobe.getState().preview(null);
    expect(useGlobe.getState().previewId).toBeNull();
  });

  it('When resetUi; Then картку скинуто, а стан текстури лишається', () => {
    useGlobe.getState().setTexture({ status: 'ok', credit: 'TEST CREDIT' });
    useGlobe.getState().preview('jezero');
    useGlobe.getState().resetUi();
    expect(useGlobe.getState().previewId).toBeNull();
    expect(useGlobe.getState().texture).toEqual({ status: 'ok', credit: 'TEST CREDIT' });
  });
});

describe('globeState — перехід (F1-AC3)', () => {
  it('Given старт; Then сцени немає і переходу немає', () => {
    expect(useGlobe.getState().sceneReady).toBe(false);
    expect(useGlobe.getState().flying).toBe(false);
  });

  it('When resetUi під час переходу; Then flying = false, sceneReady лишається', () => {
    useGlobe.getState().setSceneReady(true);
    useGlobe.getState().setFlying(true);
    useGlobe.getState().resetUi();
    expect(useGlobe.getState().flying).toBe(false);
    expect(useGlobe.getState().sceneReady).toBe(true);
  });
});
