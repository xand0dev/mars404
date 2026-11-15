import { describe, expect, it } from 'vitest';
import { mockGrid } from '../../../mocks';
import { CONTEXT_DROP_M, contextColors, contextShape, lowerUnderTile, parseContext } from './context';

const side = mockGrid.width * mockGrid.metersPerPixel;
const ctxMeta = (n: number, mpp: number) => ({
  file: 'context.f32',
  width: n,
  height: n,
  metersPerPixel: mpp,
  originM: [mockGrid.originM[0] + side / 2 - (n * mpp) / 2, mockGrid.originM[1] - side / 2 + (n * mpp) / 2] as [number, number],
  noData: -9999,
});

describe('кільце контексту (Region.context)', () => {
  it('parseContext: розмір має збігатися, NoData заповнюється', () => {
    const meta = ctxMeta(2, 100);
    expect(parseContext(new Float32Array(3).buffer, meta)).toBeNull();
    const c = parseContext(new Float32Array([1, -9999, 3, 4]).buffer, meta)!;
    expect(Array.from(c.data)).toEqual([1, 1, 3, 4]);
    expect(contextShape(mockGrid, c).metersPerPixel).toBe(100);
  });

  it('lowerUnderTile: опускає лише клітинки під районом', () => {
    const n = 9;
    const mpp = side / 2; // район займає 2×2 клітинки в центрі
    const c = parseContext(new Float32Array(n * n).fill(100).buffer, ctxMeta(n, mpp))!;
    const out = lowerUnderTile(mockGrid, c, 50);
    expect(out[4 * n + 4]).toBe(50);
    expect(out[0]).toBe(100);
    expect(out[n * n - 1]).toBe(100);
    expect(Array.from(out).filter((v) => v === 50).length).toBeGreaterThan(0);
  });

  it('contextColors: нижче — темніше, вище — світліше', () => {
    const col = contextColors(new Float32Array([0, 1000]));
    expect(col[3]! + col[4]! + col[5]!).toBeGreaterThan(col[0]! + col[1]! + col[2]!);
  });

  it('CONTEXT_DROP_M більше за найбільше перевищення кільця над DEM з QA #145 (44,3 м)', () => {
    expect(CONTEXT_DROP_M).toBeGreaterThan(44.3);
  });
});
