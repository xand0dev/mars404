import { describe, expect, it } from 'vitest';
import { dragRotation, facesCamera, fitScale, markerActive } from './sceneMath';

const DEG = Math.PI / 180;

describe('fitScale — глобус вміщується в полотно (§7.7, 400 px)', () => {
  const cam = { fovDeg: 45, distance: 3, radius: 1.03 };

  it('Given широке полотно (десктоп); Then масштаб 1 (не збільшуємо)', () => {
    expect(fitScale({ ...cam, aspect: 1440 / 520 })).toBe(1);
  });

  it('Given вузьке полотно (400 px); Then масштаб < 1 і силует сфери вміщується по ширині', () => {
    const aspect = 376 / 516;
    const s = fitScale({ ...cam, aspect });
    expect(s).toBeLessThan(1);
    const hHalf = Math.atan(Math.tan((cam.fovDeg / 2) * DEG) * aspect);
    expect(cam.radius * s).toBeLessThanOrEqual(cam.distance * Math.sin(hHalf));
  });

  it('Given невалідні розміри (0 / NaN); Then 1, без NaN', () => {
    expect(fitScale({ ...cam, aspect: 0 })).toBe(1);
    expect(fitScale({ ...cam, aspect: NaN })).toBe(1);
  });
});

describe('dragRotation — обертання перетягуванням', () => {
  it('Given drag на всю висоту по горизонталі; Then поворот навколо осі на π', () => {
    const [x, y] = dragRotation([0, 0], 500, 0, 500);
    expect(x).toBe(0);
    expect(y).toBeCloseTo(Math.PI, 9);
  });

  it('Given вертикальний drag; Then нахил обмежено ±90°', () => {
    expect(dragRotation([0, 0], 0, 5000, 500)[0]).toBeCloseTo(Math.PI / 2, 9);
    expect(dragRotation([0, 0], 0, -5000, 500)[0]).toBeCloseTo(-Math.PI / 2, 9);
  });

  it('Given висота 0; Then без змін', () => {
    expect(dragRotation([0.1, 0.2], 10, 10, 0)).toEqual([0.1, 0.2]);
  });
});

describe('markerActive (F1-AC1, F1-AC2)', () => {
  it('Given картка Jezero; Then активний маркер Jezero', () => {
    expect(markerActive('jezero', { previewId: 'jezero', flying: false })).toBe(true);
    expect(markerActive('gale', { previewId: 'jezero', flying: false })).toBe(false);
  });

  it('Given перехід до Gale; Then маркер Gale активний', () => {
    expect(markerActive('gale', { previewId: null, flying: true })).toBe(true);
    expect(markerActive('gale', { previewId: null, flying: false })).toBe(false);
  });
});

describe('facesCamera — маркери зворотного боку сховано', () => {
  const cam = [0, 0, 3] as const;

  it('Given маркер на передньому боці; Then видно', () => {
    expect(facesCamera([0, 0, 1.01], cam)).toBe(true);
    expect(facesCamera([0.5, 0.5, 0.7], cam)).toBe(true);
  });

  it('Given маркер на зворотному боці; Then сховано', () => {
    expect(facesCamera([0, 0, -1.01], cam)).toBe(false);
    expect(facesCamera([1.01, 0, -0.1], cam)).toBe(false);
  });

  it('Given маркер майже на краю диска (за горизонтом з полем); Then сховано, щоб не стирчав з-за краю', () => {
    // горизонт для камери на відстані 3: z = r²/3 ≈ 0.34; трохи «перед» ним — ще ховаємо
    const z = 0.36;
    expect(facesCamera([Math.sqrt(1.0201 - z * z), 0, z], cam)).toBe(false);
  });

  it('Given вироджені входи; Then false', () => {
    expect(facesCamera([0, 0, 0], cam)).toBe(false);
  });
});
