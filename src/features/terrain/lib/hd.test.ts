import { describe, expect, it } from 'vitest';
import { mockGrid } from '../../../mocks';
import { cellCenter } from '../../../contracts/planning';
import { CELL } from './cells';
import { buildZoneMask, parseRenderHeights, renderShape, sampleRender } from './hd';

const buf = (vals: number[]) => new Float32Array(vals).buffer;

describe('чіткий рельєф (15.11)', () => {
  it('renderShape: той самий bbox, крок = ширина сітки / ширина рендера', () => {
    const s = renderShape(mockGrid, { width: mockGrid.width * 4, height: mockGrid.height * 4 });
    expect(s.metersPerPixel).toBeCloseTo(mockGrid.metersPerPixel / 4);
    expect(s.originM).toEqual(mockGrid.originM);
    expect(s.width * s.metersPerPixel).toBeCloseTo(mockGrid.width * mockGrid.metersPerPixel);
  });

  it('parseRenderHeights: розмір має збігатися; NoData заповнюється сусідом у рядку', () => {
    expect(parseRenderHeights(buf([1, 2, 3]), 2, 2)).toBeNull();
    const rh = parseRenderHeights(buf([1, -9999, 3, 4]), 2, 2, -9999)!;
    expect(Array.from(rh.data)).toEqual([1, 1, 3, 4]);
    expect(parseRenderHeights(buf([-9999, -9999, -9999, -9999]), 2, 2, -9999)).toBeNull();
  });

  it('sampleRender: у центрі клітинки — її висота, між центрами — білінійно, поза bbox — null', () => {
    const w = mockGrid.width * 2;
    const h = mockGrid.height * 2;
    const data = new Float32Array(w * h).map((_, i) => (i % w) * 10);
    const rh = { width: w, height: h, data };
    const shape = renderShape(mockGrid, rh);
    expect(sampleRender(mockGrid, rh, cellCenter(shape, 3, 5))).toBeCloseTo(50);
    const a = cellCenter(shape, 3, 5);
    const b = cellCenter(shape, 3, 6);
    expect(sampleRender(mockGrid, rh, [(a[0] + b[0]) / 2, a[1]])).toBeCloseTo(55);
    expect(sampleRender(mockGrid, rh, [-1000, 0])).toBeNull();
  });

  it('buildZoneMask: R — blocked, G — NoData, B — ореол лише на прохідних; рядок 0 — південь', () => {
    const classes = new Uint8Array([CELL.blocked, CELL.walkable, CELL.noData, CELL.walkable]);
    const mask = new Uint8Array([1, 1, 1, 0]);
    const m = buildZoneMask(2, 2, classes, mask);
    // північний рядок (blocked, walkable) лежить у текстурі другим
    expect(Array.from(m.slice(8, 16))).toEqual([255, 0, 0, 255, 0, 0, 255, 255]);
    expect(Array.from(m.slice(0, 8))).toEqual([0, 255, 0, 255, 0, 0, 0, 255]);
    expect(buildZoneMask(2, 2, classes, new Uint8Array(3))[10]).toBe(0);
  });
});
