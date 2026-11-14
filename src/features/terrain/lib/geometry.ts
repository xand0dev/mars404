// Геометрія рельєфу (SPEC §7.1): вершина = центр клітинки, (x, h, y) → (x, h×3, −y).
import type { PlanningGrid, XY } from '../../../contracts';
import { cellCenter, isNoDataValue, toR3F, xyToCell } from '../../../contracts/planning';

/**
 * Висоти лише для форми меша: NoData заповнюється середнім відомих сусідів (хвилями від країв).
 * Числа на екрані беруться з сирої сітки, а не звідси.
 */
export function displayHeights(grid: PlanningGrid, noData?: number): Float32Array {
  const { width, height } = grid;
  const n = width * height;
  const out = new Float32Array(n);
  const known = new Uint8Array(n);
  let min = Infinity;
  let pending: number[] = [];
  for (let i = 0; i < n; i++) {
    const h = grid.elevationsM[i] ?? NaN;
    if (isNoDataValue(h, noData)) pending.push(i);
    else {
      out[i] = h;
      known[i] = 1;
      if (h < min) min = h;
    }
  }
  while (pending.length > 0) {
    const fill: [number, number][] = [];
    const rest: number[] = [];
    for (const i of pending) {
      const r = Math.floor(i / width);
      const c = i % width;
      let sum = 0;
      let cnt = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if ((dr || dc) && rr >= 0 && cc >= 0 && rr < height && cc < width && known[rr * width + cc]) {
            sum += out[rr * width + cc] as number;
            cnt++;
          }
        }
      }
      if (cnt > 0) fill.push([i, sum / cnt]);
      else rest.push(i);
    }
    if (fill.length === 0) {
      // Відомих висот немає зовсім — лише плоска форма для меша; NoData все одно позначено.
      const flat = Number.isFinite(min) ? min : 0;
      for (const i of rest) out[i] = flat;
      break;
    }
    for (const [i, h] of fill) {
      out[i] = h;
      known[i] = 1;
    }
    pending = rest;
  }
  return out;
}

export interface TerrainGeometryData {
  positions: Float32Array;
  indices: Uint32Array;
  uvs: Float32Array;
}

/** Буфери меша. uv — центри текселів, v = 1 на півночі (зображення північ-вгору). */
export function buildTerrainGeometry(grid: PlanningGrid, heights: Float32Array): TerrainGeometryData {
  const { width, height } = grid;
  const positions = new Float32Array(width * height * 3);
  const uvs = new Float32Array(width * height * 2);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const i = r * width + c;
      const p = toR3F(cellCenter(grid, r, c), heights[i] ?? 0);
      positions.set(p, i * 3);
      uvs[i * 2] = (c + 0.5) / width;
      uvs[i * 2 + 1] = 1 - (r + 0.5) / height;
    }
  }
  const indices = new Uint32Array(Math.max(0, (width - 1) * (height - 1) * 6));
  let k = 0;
  for (let r = 0; r < height - 1; r++) {
    for (let c = 0; c < width - 1; c++) {
      const a = r * width + c;
      const b = a + 1;
      const d = a + width;
      const e = d + 1;
      // Проти годинникової стрілки, якщо дивитися згори (+Y).
      indices.set([a, d, b, b, d, e], k);
      k += 6;
    }
  }
  return { positions, indices, uvs };
}

export interface SurfacePoint {
  position: [number, number, number];
  /** Справжня висота клітинки, м; null — NoData («elev. unknown») */
  heightM: number | null;
}

/** Точка на поверхні рельєфу (та сама сітка й ті самі висоти, що й меш). Поза сіткою — null. */
export function surfacePoint(grid: PlanningGrid, heights: Float32Array, noData: number | undefined, xy: XY, liftM: number): SurfacePoint | null {
  const cell = xyToCell(grid, xy);
  if (!cell) return null;
  const raw = grid.elevationsM[cell.index] ?? NaN;
  const shape = heights[cell.index] ?? 0;
  return { position: toR3F(xy, shape + liftM), heightM: isNoDataValue(raw, noData) ? null : raw };
}
