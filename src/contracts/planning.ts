// Чисте ядро координат (SPEC §7.1–7.2). Без React і стану.
import type { Annotation, PlanningGrid, Region, RegionKind, SiteId, XY } from './index';
import { METERS_PER_DEG, SITE_IDS, VERTICAL_EXAGGERATION } from './index';

type GridShape = Pick<PlanningGrid, 'width' | 'height' | 'metersPerPixel' | 'originM'>;

/** Індекс клітинки: row-major, рядки з півночі на південь. */
export function cellIndex(grid: GridShape, row: number, col: number): number {
  return row * grid.width + col;
}

export function inGrid(grid: GridShape, row: number, col: number): boolean {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && col >= 0 && row < grid.height && col < grid.width;
}

/** Центр клітинки в локальних метрах. */
export function cellCenter(grid: GridShape, row: number, col: number): XY {
  const [ox, oy] = grid.originM;
  const m = grid.metersPerPixel;
  return [ox + (col + 0.5) * m, oy - (row + 0.5) * m];
}

/** Клітинка, що містить точку; null — поза сіткою. */
export function xyToCell(grid: GridShape, [x, y]: XY): { row: number; col: number; index: number } | null {
  const [ox, oy] = grid.originM;
  const col = Math.floor((x - ox) / grid.metersPerPixel);
  const row = Math.floor((oy - y) / grid.metersPerPixel);
  if (!Number.isFinite(col) || !Number.isFinite(row) || !inGrid(grid, row, col)) return null;
  return { row, col, index: cellIndex(grid, row, col) };
}

/** Lon/lat (°) → локальні метри. Рівнопроміжна площина з cos(lat) для довготи; origin — північно-західний кут bounds. */
export function lonLatToXY(region: Pick<Region, 'grid'>, [lon, lat]: readonly [number, number]): XY {
  const [west, south, , north] = region.grid.boundsLonLat;
  const [ox, oy] = region.grid.originM;
  const midLat = ((south + north) / 2) * (Math.PI / 180);
  return [ox + (lon - west) * METERS_PER_DEG * Math.cos(midLat), oy - (north - lat) * METERS_PER_DEG];
}

/** Локальні метри + висота → координати R3F: (x, h × 3, −y). */
export function toR3F([x, y]: XY, heightM: number): [number, number, number] {
  return [x, heightM * VERTICAL_EXAGGERATION, -y];
}

/** Сира висота, яку треба вважати NoData (SPEC §7.2). */
export function isNoDataValue(h: number, noData?: number): boolean {
  return !Number.isFinite(h) || Math.abs(h) >= 3e38 || (noData !== undefined && h === noData);
}

/**
 * Заблокована клітинка: walkable ≠ 1, нескінченні/NaN висота, схил чи hazard,
 * або схил більший за maxSlopeDeg (якщо передано). Заблоковане ніколи не «безпечне».
 */
export function isBlocked(grid: PlanningGrid, i: number, maxSlopeDeg?: number): boolean {
  if (grid.walkable[i] !== 1) return true;
  const h = grid.elevationsM[i] ?? NaN;
  const s = grid.slopesDeg[i] ?? NaN;
  const z = grid.hazard[i] ?? NaN;
  if (isNoDataValue(h) || !Number.isFinite(s) || !Number.isFinite(z)) return true;
  return maxSlopeDeg !== undefined && s > maxSlopeDeg;
}

/** Перевірка сітки; порожній масив — сітка валідна. */
export function validateGrid(grid: PlanningGrid): string[] {
  const errors: string[] = [];
  const { width, height, metersPerPixel } = grid;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) errors.push('invalid size');
  if (!(metersPerPixel > 0)) errors.push('invalid metersPerPixel');
  if (!grid.originM.every(Number.isFinite)) errors.push('invalid originM');
  const n = width * height;
  for (const [name, arr] of [
    ['elevationsM', grid.elevationsM],
    ['slopesDeg', grid.slopesDeg],
    ['walkable', grid.walkable],
    ['hazard', grid.hazard],
  ] as const) {
    if (arr.length !== n) errors.push(`${name}: expected ${n} cells, got ${arr.length}`);
  }
  return errors;
}

/** Режим району: немає поля — 'eva'. */
export function regionKind(region: Pick<Region, 'kind'> | null | undefined): RegionKind {
  return region?.kind === 'overview' ? 'overview' : 'eva';
}

/** Чи рядок — відомий SiteId (для імпорту файлів і URL). */
export function isSiteId(v: unknown): v is SiteId {
  return typeof v === 'string' && (SITE_IDS as readonly string[]).includes(v);
}

/** URL файлу даних через Vite BASE_URL (працює на GitHub Pages і офлайн). */
export function dataUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? './';
  return `${base.endsWith('/') ? base : `${base}/`}data/${path.replace(/^\/+/, '')}`;
}

/**
 * Сітка з урахуванням міток екіпажу (SPEC §7.12): клітинки, чий центр у радіусі мітки
 * «impassable», стають непрохідними; «hazard» — hazard = 1. Note / plan не впливають.
 * Без впливових міток повертає ту саму сітку (без копій).
 */
export function applyAnnotations(grid: PlanningGrid, annotations: readonly Annotation[]): PlanningGrid {
  const active = annotations.filter((a) => (a.kind === 'impassable' || a.kind === 'hazard') && a.radiusM > 0 && a.coordinates.every(Number.isFinite));
  if (active.length === 0) return grid;
  const walkable = grid.walkable.slice();
  const hazard = grid.hazard.slice();
  const m = grid.metersPerPixel;
  for (const a of active) {
    const [ax, ay] = a.coordinates;
    const c = xyToCellUnbounded(grid, a.coordinates);
    const span = Math.ceil(a.radiusM / m) + 1;
    for (let row = c.row - span; row <= c.row + span; row++) {
      for (let col = c.col - span; col <= c.col + span; col++) {
        if (!inGrid(grid, row, col)) continue;
        const [x, y] = cellCenter(grid, row, col);
        if (Math.hypot(x - ax, y - ay) > a.radiusM) continue;
        const i = cellIndex(grid, row, col);
        if (a.kind === 'impassable') walkable[i] = 0;
        else hazard[i] = 1;
      }
    }
  }
  return { ...grid, walkable, hazard };
}

function xyToCellUnbounded(grid: Pick<PlanningGrid, 'metersPerPixel' | 'originM'>, [x, y]: XY): { row: number; col: number } {
  const [ox, oy] = grid.originM;
  return { col: Math.floor((x - ox) / grid.metersPerPixel), row: Math.floor((oy - y) / grid.metersPerPixel) };
}

/** URL файлу району: `data/<site>/<path>`. */
export function siteDataUrl(site: SiteId, path: string): string {
  return dataUrl(`${site}/${path.replace(/^\/+/, '')}`);
}
