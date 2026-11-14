import { describe, expect, it } from 'vitest';
import { cellCenter, cellIndex, toR3F } from '../../../contracts/planning';
import { mockGrid } from '../../../mocks';
import { buildTerrainGeometry, displayHeights, surfacePoint } from './geometry';
import { RAW_NODATA, SMALL, smallGrid } from './fixtures';

describe('F2-AC1 геометрія рельєфу', () => {
  it('Given сітка; Then вершина кожної клітинки = toR3F(центр, h) — (x, h×3, −y)', () => {
    const grid = smallGrid();
    const g = buildTerrainGeometry(grid, displayHeights(grid, RAW_NODATA));
    expect(g.positions.length).toBe(grid.width * grid.height * 3);
    const i = cellIndex(grid, 2, 1);
    const [x, y] = cellCenter(grid, 2, 1);
    expect(Array.from(g.positions.slice(i * 3, i * 3 + 3))).toEqual(toR3F([x, y], 21));
    expect(g.positions[i * 3 + 1]).toBe(63);
    expect(g.positions[i * 3 + 2]).toBe(-y);
  });

  it('у буфері немає NaN/Infinity навіть для NoData-клітинок', () => {
    const grid = smallGrid();
    const g = buildTerrainGeometry(grid, displayHeights(grid, RAW_NODATA));
    expect(g.positions.every(Number.isFinite)).toBe(true);
  });

  it('NoData-вершина бере форму з сусідів, а не 0 і не сирий sentinel', () => {
    const grid = smallGrid();
    const h = displayHeights(grid, RAW_NODATA);
    for (const i of [SMALL.nan, SMALL.rawNoData, SMALL.huge]) {
      expect(Number.isFinite(h[i])).toBe(true);
      expect(h[i]).not.toBe(RAW_NODATA);
      expect(Math.abs(h[i] as number)).toBeLessThan(100);
    }
    expect(h[SMALL.nan]).not.toBe(0);
  });

  it('індекси: 2 трикутники на квадрат між центрами, uv — центри текселів, північ угорі', () => {
    const grid = smallGrid();
    const g = buildTerrainGeometry(grid, displayHeights(grid, RAW_NODATA));
    expect(g.indices.length).toBe((grid.width - 1) * (grid.height - 1) * 6);
    expect(g.uvs[0]).toBeCloseTo(0.5 / 4);
    expect(g.uvs[1]).toBeCloseTo(1 - 0.5 / 3);
  });

  it('mockGrid 128×128 будується без NaN', () => {
    const g = buildTerrainGeometry(mockGrid, displayHeights(mockGrid));
    expect(g.positions.length).toBe(128 * 128 * 3);
    expect(g.positions.every(Number.isFinite)).toBe(true);
  });
});

describe('F2-AC1 surfacePoint — цілі й маршрут з тієї самої сітки', () => {
  it('точка в центрі клітинки стоїть на вершині рельєфу (+ підйом)', () => {
    const grid = smallGrid();
    const h = displayHeights(grid, RAW_NODATA);
    const p = surfacePoint(grid, h, RAW_NODATA, cellCenter(grid, 2, 1), 2);
    expect(p).not.toBeNull();
    expect(p?.position).toEqual(toR3F(cellCenter(grid, 2, 1), 21 + 2));
    expect(p?.heightM).toBe(21);
  });

  it('точка на NoData: на формі рельєфу, але heightM = null («elev. unknown»)', () => {
    const grid = smallGrid();
    const h = displayHeights(grid, RAW_NODATA);
    const p = surfacePoint(grid, h, RAW_NODATA, cellCenter(grid, 1, 1), 0);
    expect(p?.heightM).toBeNull();
    expect(p?.position.every(Number.isFinite)).toBe(true);
  });

  it('поза сіткою → null', () => {
    const grid = smallGrid();
    expect(surfacePoint(grid, displayHeights(grid), undefined, [0, 0], 0)).toBeNull();
  });
});
