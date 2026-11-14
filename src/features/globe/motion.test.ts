import { afterEach, describe, expect, it, vi } from 'vitest';
import { Euler, Vector3 } from 'three';
import { FLY_MS, lerpRotation, prefersReducedMotion, rotationToFace } from './motion';
import { latLonToSphere } from './geo';
import { SITES } from './sites';

afterEach(() => vi.unstubAllGlobals());

describe('prefersReducedMotion (F1-AC3)', () => {
  it('Given matchMedia немає (jsdom); Then false', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it.each([true, false])('Given (prefers-reduced-motion: reduce) = %s; Then повертає його', (matches) => {
    const mm = vi.fn((q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' && matches }));
    vi.stubGlobal('matchMedia', mm);
    expect(prefersReducedMotion()).toBe(matches);
  });
});

describe('rotationToFace — ціль анімації повороту', () => {
  it.each(SITES.map((s) => [s.name, s] as const))('%s після повороту групи дивиться на камеру (+Z)', (_, s) => {
    const [x, y, z] = rotationToFace(s.latDeg, s.lonEastDeg);
    const p = new Vector3(...latLonToSphere(s.latDeg, s.lonEastDeg)).applyEuler(new Euler(x, y, z, 'XYZ'));
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(0, 9);
    expect(p.z).toBeCloseTo(1, 9);
  });

  it('тривалість переходу — коротка UI-анімація', () => {
    expect(FLY_MS).toBeGreaterThan(0);
    expect(FLY_MS).toBeLessThanOrEqual(2000);
  });
});

describe('lerpRotation — проміжні кути анімації', () => {
  it('Given t = 0 / 1; Then старт / ціль', () => {
    expect(lerpRotation([0, 0, 0], [0.5, 1, 0], 0)).toEqual([0, 0, 0]);
    lerpRotation([0, 0, 0], [0.5, 1, 0], 1).forEach((v, i) => expect(v).toBeCloseTo([0.5, 1, 0][i] ?? NaN, 9));
  });

  it('Given різниця кута > π; Then іде коротшим шляхом', () => {
    const [, y] = lerpRotation([0, 0.1, 0], [0, 2 * Math.PI - 0.1, 0], 0.5);
    expect(y).toBeCloseTo(0, 9);
  });

  it('Given t поза [0, 1]; Then обрізається', () => {
    expect(lerpRotation([0, 0, 0], [1, 1, 1], 2)[0]).toBeCloseTo(1, 9);
    expect(lerpRotation([0, 0, 0], [1, 1, 1], -1)[0]).toBe(0);
  });
});
