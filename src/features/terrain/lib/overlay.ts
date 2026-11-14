// Накладка по клітинках для 3D (DataTexture, NearestFilter): колір за висотою, blocked, NoData, ореол.
import type { PlanningGrid } from '../../../contracts';
import { CELL } from './cells';

type RGB = readonly [number, number, number];

/** Заблоковано: сіро-синій, не схожий на рампу ґрунту. */
export const BLOCKED_RGB: RGB = [74, 78, 105];
/** NoData: майже чорний. */
export const NODATA_RGB: RGB = [16, 16, 20];
/** Ореол досяжності (reach.mask). */
export const HALO_RGB: RGB = [64, 196, 255];

const RAMP: RGB[] = [
  [92, 52, 34],
  [150, 84, 48],
  [196, 124, 72],
  [226, 178, 120],
];

export const CSS = {
  blocked: `rgb(${BLOCKED_RGB.join(',')})`,
  noData: `rgb(${NODATA_RGB.join(',')})`,
  halo: `rgb(${HALO_RGB.join(',')})`,
  route: '#f3ece6',
  /** Підсвічений відрізок: маджента, не плутається з маршрутом, ореолом і ґрунтом */
  segment: '#ff3df2',
} as const;

/** Колір рампи висоти, t ∈ [0, 1]. */
export function rampColor(t: number): RGB {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const f = x - i;
  const a = RAMP[i] as RGB;
  const b = RAMP[i + 1] as RGB;
  return [0, 1, 2].map((k) => Math.round((a[k] as number) + ((b[k] as number) - (a[k] as number)) * f)) as unknown as RGB;
}

export interface OverlayInput {
  /** Висоти для кольору (без текстури HiRISE); не задано — прохідні клітинки прозорі */
  heights?: Float32Array;
  /** reach.mask */
  mask?: Uint8Array;
  /** true — рядок 0 = північ (для canvas ImageData у 2D) */
  northUp?: boolean;
}

export interface Overlay {
  /** RGBA, рядки перевернуто: рядок 0 текстури — південь (як очікує DataTexture з uv v = 0 унизу) */
  data: Uint8Array;
  haloCells: number;
  warnings: string[];
}

export function buildOverlay(grid: PlanningGrid, classes: Uint8Array, { heights, mask, northUp = false }: OverlayInput): Overlay {
  const { width, height } = grid;
  const n = width * height;
  const warnings: string[] = [];
  let useMask = mask;
  if (mask && mask.length !== n) {
    warnings.push(`reach.mask has ${mask.length} cells, grid has ${n}: halo hidden`);
    useMask = undefined;
  }
  let lo = Infinity;
  let hi = -Infinity;
  if (heights) {
    for (let i = 0; i < n; i++) {
      if (classes[i] !== CELL.walkable) continue;
      const h = heights[i] as number;
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
  }
  const span = hi > lo ? hi - lo : 1;
  const data = new Uint8Array(n * 4);
  let haloCells = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const i = r * width + c;
      const t = ((northUp ? r : height - 1 - r) * width + c) * 4;
      const cls = classes[i];
      let rgb: RGB | null = null;
      let alpha = 255;
      if (cls === CELL.blocked) rgb = BLOCKED_RGB;
      else if (cls === CELL.noData) rgb = NODATA_RGB;
      else if (useMask && useMask[i] === 1) {
        rgb = HALO_RGB;
        // Напівпрозорий: рельєф/текстуру під ореолом видно.
        alpha = 110;
        haloCells++;
      } else if (heights) rgb = rampColor(((heights[i] as number) - lo) / span);
      else alpha = 0;
      if (rgb) data.set(rgb, t);
      data[t + 3] = rgb ? alpha : 0;
    }
  }
  return { data, haloCells, warnings };
}
