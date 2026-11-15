import { describe, expect, it } from 'vitest';
import { applyAnnotations, cellCenter, cellIndex, dataUrl, isBlocked, isNoDataValue, isSiteId, lonLatToXY, regionKind, siteDataUrl, toR3F, validateGrid, xyToCell } from './planning';
import { mockGrid, MOCK_CELLS } from '../mocks';
import type { Region } from './index';

describe('planning · координати (SPEC §7.1)', () => {
  it('row-major north-to-south: центр клітинки й зворотне перетворення', () => {
    expect(cellIndex(mockGrid, 2, 3)).toBe(2 * 128 + 3);
    expect(cellCenter(mockGrid, 0, 0)).toEqual([5, 1275]);
    expect(cellCenter(mockGrid, 127, 127)).toEqual([1275, 5]);
    expect(xyToCell(mockGrid, [5, 1275])).toEqual({ row: 0, col: 0, index: 0 });
    expect(xyToCell(mockGrid, [-1, 10])).toBeNull();
    expect(xyToCell(mockGrid, [10, 1281])).toBeNull();
  });

  it('R3F = (x, h × 3, −y)', () => {
    expect(toR3F([10, 20], 5)).toEqual([10, 15, -20]);
  });

  it('lon/lat → метри: північно-західний кут = originM, 1° ≈ 59.27 км', () => {
    const region = { grid: { originM: [0, 2560], boundsLonLat: [137.0, -0.01, 137.1, 0.01] } } as unknown as Pick<Region, 'grid'>;
    expect(lonLatToXY(region, [137.0, 0.01])).toEqual([0, 2560]);
    const [x, y] = lonLatToXY(region, [137.01, 0.0]);
    expect(x).toBeCloseTo(592.7, 0);
    expect(y).toBeCloseTo(2560 - 592.7, 0);
  });

  it('dataUrl іде через BASE_URL без абсолютного /data', () => {
    expect(dataUrl('gale/region.json')).toMatch(/data\/gale\/region\.json$/);
    expect(dataUrl('/gale/x.f32')).not.toMatch(/\/\/data/);
  });
});

describe('planning · NoData (SPEC §7.2)', () => {
  it('NaN, ±3e38 і сирий noData — NoData', () => {
    expect(isNoDataValue(NaN)).toBe(true);
    expect(isNoDataValue(3.4e38)).toBe(true);
    expect(isNoDataValue(-3.4e38)).toBe(true);
    expect(isNoDataValue(-9999, -9999)).toBe(true);
    expect(isNoDataValue(-4000)).toBe(false);
  });

  it('стіна, NoData і «підступна» NaN заблоковані; крутий схил — за порогом', () => {
    const [nr, nc] = MOCK_CELLS.noData;
    const [tr, tc] = MOCK_CELLS.trickyNaN;
    expect(isBlocked(mockGrid, cellIndex(mockGrid, 50, MOCK_CELLS.wallCol))).toBe(true);
    expect(isBlocked(mockGrid, cellIndex(mockGrid, nr, nc))).toBe(true);
    expect(isBlocked(mockGrid, cellIndex(mockGrid, tr, tc))).toBe(true);
    const i = cellIndex(mockGrid, 64, 64);
    expect(isBlocked(mockGrid, i)).toBe(false);
    expect(isBlocked(mockGrid, i, -1)).toBe(true);
  });

  it('validateGrid ловить невідповідність розмірів', () => {
    expect(validateGrid(mockGrid)).toEqual([]);
    expect(validateGrid({ ...mockGrid, walkable: new Uint8Array(3) })).toHaveLength(1);
  });
});

describe('applyAnnotations (SPEC §7.12)', () => {
  const base = (kind: 'impassable' | 'hazard' | 'note', radiusM = 25) => ({ id: kind, kind, coordinates: cellCenter(mockGrid, 64, 64), radiusM, text: '', createdAt: '2026-11-14T00:00:00Z', origin: 'this-eva' as const });

  it('без впливових міток — та сама сітка', () => {
    expect(applyAnnotations(mockGrid, [])).toBe(mockGrid);
    expect(applyAnnotations(mockGrid, [base('note')])).toBe(mockGrid);
  });

  it('impassable блокує клітинки в радіусі й не чіпає вихідну сітку', () => {
    const g = applyAnnotations(mockGrid, [base('impassable', 25)]);
    expect(g.walkable[cellIndex(mockGrid, 64, 64)]).toBe(0);
    expect(g.walkable[cellIndex(mockGrid, 64, 66)]).toBe(0);
    expect(g.walkable[cellIndex(mockGrid, 64, 68)]).toBe(1);
    expect(mockGrid.walkable[cellIndex(mockGrid, 64, 64)]).toBe(1);
  });

  it('hazard піднімає hazard до 1, прохідність не змінює', () => {
    const g = applyAnnotations(mockGrid, [base('hazard', 10)]);
    expect(g.hazard[cellIndex(mockGrid, 64, 64)]).toBe(1);
    expect(g.walkable[cellIndex(mockGrid, 64, 64)]).toBe(1);
  });
});

describe('райони (SPEC §6.0, 15.11)', () => {
  it('regionKind: немає поля — eva; overview лише явно', () => {
    expect(regionKind({})).toBe('eva');
    expect(regionKind(null)).toBe('eva');
    expect(regionKind({ kind: 'eva' })).toBe('eva');
    expect(regionKind({ kind: 'overview' })).toBe('overview');
  });

  it('isSiteId: чотири відомі райони, решта — ні', () => {
    for (const id of ['gale', 'columbia-hills', 'olympus-mons', 'valles-marineris']) expect(isSiteId(id)).toBe(true);
    for (const v of ['jezero', '', null, 1, 'GALE']) expect(isSiteId(v)).toBe(false);
  });

  it('siteDataUrl: data/<site>/<path>, без подвійних слешів', () => {
    expect(siteDataUrl('columbia-hills', '/region.json')).toBe(dataUrl('columbia-hills/region.json'));
    expect(siteDataUrl('gale', 'elevation.f32').endsWith('data/gale/elevation.f32')).toBe(true);
  });
});
