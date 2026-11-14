// Фікстури для тестів F2. Синтетика, не дані NASA.
import type { PlanningGrid, Region, RoutePlan, Segment, XY } from '../../../contracts';
import { cellCenter, cellIndex } from '../../../contracts/planning';
import { mockBase, mockLimits, mockModel } from '../../../mocks';

/** Сирий sentinel фікстури (як у region.noData). */
export const RAW_NODATA = -32768;

/**
 * Сітка 4×3 по 10 м: похила площина h = col + 10·row.
 * (0,1) walkable = 0 · (1,1) NaN · (1,2) сирий noData · (2,3) схил 40° · (2,0) |h| ≥ 3e38.
 */
export function smallGrid(): PlanningGrid {
  const width = 4;
  const height = 3;
  const n = width * height;
  const grid: PlanningGrid = {
    width,
    height,
    metersPerPixel: 10,
    originM: [100, 30],
    elevationsM: new Float32Array(n),
    slopesDeg: new Float32Array(n).fill(5),
    walkable: new Uint8Array(n).fill(1),
    hazard: new Float32Array(n).fill(0.1),
  };
  for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) grid.elevationsM[cellIndex(grid, r, c)] = c + 10 * r;
  grid.walkable[cellIndex(grid, 0, 1)] = 0;
  grid.elevationsM[cellIndex(grid, 1, 1)] = NaN;
  grid.elevationsM[cellIndex(grid, 1, 2)] = RAW_NODATA;
  grid.slopesDeg[cellIndex(grid, 2, 3)] = 40;
  grid.elevationsM[cellIndex(grid, 2, 0)] = -3.4e38;
  return grid;
}

export const SMALL = {
  walkable0: 0 * 4 + 1,
  nan: 1 * 4 + 1,
  rawNoData: 1 * 4 + 2,
  steep: 2 * 4 + 3,
  huge: 2 * 4 + 0,
} as const;

const seg = (from: XY, to: XY): Segment => ({ from, to, dist: 10, slope: 0, time: 10, o2: 2, energy: 0.5, dose: null });

/** План по центрах клітинок сітки. */
export function planThrough(grid: PlanningGrid, cells: [number, number][]): RoutePlan {
  const path = cells.map(([r, c]) => cellCenter(grid, r, c));
  const segments = path.slice(1).map((p, i) => seg(path[i] as XY, p));
  return {
    status: 'ok',
    path,
    segments,
    legs: [0],
    totals: { time: 10 * segments.length, o2: 2 * segments.length, energy: 0.5 * segments.length, dose: null, dist: 10 * segments.length },
    warnings: [],
    requestId: 1,
  };
}

/** Регіон для тестів «реальної» сітки. */
export function testRegion(grid: PlanningGrid, status: Region['status'] = 'verified'): Region {
  return {
    schemaVersion: 1,
    id: 'gale',
    name: 'Test Gale',
    status,
    grid: {
      width: grid.width,
      height: grid.height,
      metersPerPixel: grid.metersPerPixel,
      originM: grid.originM,
      rowOrder: 'north-to-south',
      boundsLonLat: [137.4, -4.75, 137.422, -4.728],
      crs: 'test',
    },
    files: { elevation: 'e.f32', slope: 's.f32', walkable: 'w.u8', hazard: 'h.f32', texture: 'hirise.jpg', targets: 'targets.geojson' },
    noData: RAW_NODATA,
    base: mockBase,
    model: mockModel,
    limits: mockLimits,
    layers: [],
    sources: [],
  };
}
