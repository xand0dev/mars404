import { beforeEach, describe, expect, it } from 'vitest';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, clampZoom, maxZoomFor, pinchFactor, resetZoom, useZoom, wheelFactor } from './zoom';

const z = () => useZoom.getState();
beforeEach(() => resetZoom());

describe('#80 · clampZoom', () => {
  it('тримає масштаб у межах [0.7, 3]', () => {
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
    expect(clampZoom(10)).toBe(ZOOM_MAX);
    expect(clampZoom(1.5)).toBe(1.5);
    expect([ZOOM_MIN, ZOOM_MAX]).toEqual([0.7, 3]);
  });

  it('верхню межу можна звузити (камера), але не нижче за ZOOM_MIN', () => {
    expect(clampZoom(2.8, 2.4)).toBe(2.4);
    expect(clampZoom(2.8, 0.5)).toBe(ZOOM_MIN);
  });

  it('NaN / Infinity → 1 або межа, ніколи не NaN', () => {
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampZoom(Infinity)).toBe(ZOOM_MAX);
  });
});

describe('#80 · колесо, тачпад і два пальці', () => {
  it('прокрутка вгору (deltaY < 0) збільшує, вниз — зменшує', () => {
    expect(wheelFactor(-100, 0, false)).toBeGreaterThan(1);
    expect(wheelFactor(100, 0, false)).toBeLessThan(1);
    expect(wheelFactor(0, 0, false)).toBe(1);
  });

  it('щипок macOS (ctrlKey) чутливіший за прокрутку на ту саму deltaY', () => {
    expect(wheelFactor(-10, 0, true)).toBeGreaterThan(wheelFactor(-10, 0, false));
  });

  it('deltaMode = рядки (Firefox) ≈ 16 px на рядок', () => {
    expect(wheelFactor(-3, 1, false)).toBeCloseTo(wheelFactor(-48, 0, false));
  });

  it('щипок двома пальцями: відношення відстаней; нуль — без змін', () => {
    expect(pinchFactor(100, 150)).toBe(1.5);
    expect(pinchFactor(0, 150)).toBe(1);
  });
});

describe('#80 · maxZoomFor — камера не заходить у сферу', () => {
  it('десктоп: scale 1, distance 3, radius 1.06 → < 3', () => {
    const m = maxZoomFor({ scale: 1, distance: 3, radius: 1.06 });
    expect(m).toBeLessThan(ZOOM_MAX);
    expect(m * 1.06).toBeLessThan(3);
  });
  it('малий екран (scale 0.4) → повні 3×', () => {
    expect(maxZoomFor({ scale: 0.4, distance: 3, radius: 1.06 })).toBe(ZOOM_MAX);
  });
});

describe('#80 · стан useZoom', () => {
  it('zoomIn / zoomOut — кроком ZOOM_STEP, у межах', () => {
    z().zoomIn();
    expect(z().zoom).toBeCloseTo(ZOOM_STEP);
    z().zoomOut();
    z().zoomOut();
    expect(z().zoom).toBeCloseTo(1 / ZOOM_STEP);
    for (let i = 0; i < 20; i++) z().zoomOut();
    expect(z().zoom).toBe(ZOOM_MIN);
  });

  it('setMaxZoom обрізає поточний масштаб', () => {
    z().zoomBy(10);
    expect(z().zoom).toBe(ZOOM_MAX);
    z().setMaxZoom(2.4);
    expect(z().zoom).toBe(2.4);
    z().zoomBy(2);
    expect(z().zoom).toBe(2.4);
  });

  it('reset → 1 і новий resetTick (поворот теж скидається)', () => {
    z().zoomBy(2);
    const t = z().resetTick;
    z().reset();
    expect(z().zoom).toBe(1);
    expect(z().resetTick).toBe(t + 1);
  });
});
