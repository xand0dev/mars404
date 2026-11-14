// Накладка по клітинках для 3D (DataTexture, NearestFilter): колір за висотою, blocked, NoData, ореол.
import type { PlanningGrid } from '../../../contracts';
import { CELL } from './cells';

type RGB = readonly [number, number, number];

/** Заблоковано: сіро-синій, не схожий на рампу ґрунту. */
export const BLOCKED_RGB: RGB = [74, 78, 105];
/** NoData: майже чорний. */
export const NODATA_RGB: RGB = [16, 16, 20];
/** Ореол досяжності (reach.mask): насичений блакитний, щоб поверх коричневого ґрунту не сірів. */
export const HALO_RGB: RGB = [0, 190, 255];
/** Непрозорість ореолу всередині зони; на краю — 255 (контур). */
export const HALO_FILL_ALPHA = 150;

/** 0 — не ореол, 1 — ореол, 2 — край ореолу (сусід по 4-зв'язності не в ореолі або поза сіткою). */
export const HALO = { none: 0, fill: 1, edge: 2 } as const;

/** Ореол лише на прохідних клітинках; край — для контуру. Маска невідповідної довжини → null. */
export function haloCells(width: number, classes: Uint8Array, mask: Uint8Array | null | undefined): Uint8Array | null {
  if (!mask || mask.length !== classes.length) return null;
  const n = classes.length;
  const height = Math.floor(n / width);
  const isIn = (i: number) => mask[i] === 1 && classes[i] === CELL.walkable;
  const out = new Uint8Array(n);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const i = r * width + c;
      if (!isIn(i)) continue;
      const edge = r === 0 || c === 0 || r === height - 1 || c === width - 1 || !isIn(i - 1) || !isIn(i + 1) || !isIn(i - width) || !isIn(i + width);
      out[i] = edge ? HALO.edge : HALO.fill;
    }
  }
  return out;
}

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
  /** F2-AC6: відрізок без повернення з аварійним O₂ */
  noReturn: '#ff3b30',
  /** Траверс марсохода (T12), пунктир */
  traverse: '#e8b84a',
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
  if (mask && mask.length !== n) warnings.push(`reach.mask has ${mask.length} cells, grid has ${n}: halo hidden`);
  const halo = haloCells(width, classes, mask);
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
  let haloCount = 0;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const i = r * width + c;
      const t = ((northUp ? r : height - 1 - r) * width + c) * 4;
      const cls = classes[i];
      let rgb: RGB | null = null;
      let alpha = 255;
      if (cls === CELL.blocked) rgb = BLOCKED_RGB;
      else if (cls === CELL.noData) rgb = NODATA_RGB;
      else if (halo && halo[i] !== HALO.none) {
        rgb = HALO_RGB;
        // Усередині напівпрозорий (рельєф/текстуру видно), на краю — непрозорий контур.
        alpha = halo[i] === HALO.edge ? 255 : HALO_FILL_ALPHA;
        haloCount++;
      } else if (heights) rgb = rampColor(((heights[i] as number) - lo) / span);
      else alpha = 0;
      if (rgb) data.set(rgb, t);
      data[t + 3] = rgb ? alpha : 0;
    }
  }
  return { data, haloCells: haloCount, warnings };
}
