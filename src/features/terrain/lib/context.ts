// Кільце рельєфу довкола EVA-району (Region.context, SPEC §6.0): лише огляд, без взаємодії.
import type { PlanningGrid, RegionContext } from '../../../contracts';
import { toR3F } from '../../../contracts/planning';
import { parseRenderHeights } from './hd';

export interface ContextHeights {
  width: number;
  height: number;
  metersPerPixel: number;
  originM: [number, number];
  data: Float32Array;
}

/** Сирий float32 контексту → висоти (NoData заповнено). Невідповідність розміру — null. */
export function parseContext(buf: ArrayBuffer, ctx: RegionContext, fallbackNoData?: number): ContextHeights | null {
  const rh = parseRenderHeights(buf, ctx.width, ctx.height, ctx.noData ?? fallbackNoData);
  if (!rh || !(ctx.metersPerPixel > 0)) return null;
  return { width: ctx.width, height: ctx.height, metersPerPixel: ctx.metersPerPixel, originM: [ctx.originM[0], ctx.originM[1]], data: rh.data };
}

/** Сітка-форма контексту для buildTerrainGeometry / cellCenter. */
export function contextShape(grid: PlanningGrid, c: ContextHeights): PlanningGrid {
  return { ...grid, width: c.width, height: c.height, metersPerPixel: c.metersPerPixel, originM: c.originM };
}

/**
 * Під EVA-районом контекст опускаємо на dropM, щоб щільний меш району
 * лежав зверху без мерехтіння. Повертає нову копію висот.
 */
export function lowerUnderTile(grid: PlanningGrid, c: ContextHeights, dropM: number): Float32Array {
  const out = c.data.slice();
  const [gx, gy] = grid.originM;
  const gw = grid.width * grid.metersPerPixel;
  const gh = grid.height * grid.metersPerPixel;
  const pad = 0;
  const [ox, oy] = c.originM;
  for (let r = 0; r < c.height; r++) {
    const y = oy - (r + 0.5) * c.metersPerPixel;
    if (y < gy - gh - pad || y > gy + pad) continue;
    for (let col = 0; col < c.width; col++) {
      const x = ox + (col + 0.5) * c.metersPerPixel;
      if (x < gx - pad || x > gx + gw + pad) continue;
      const i = r * c.width + col;
      out[i] = (out[i] as number) - dropM;
    }
  }
  return out;
}

type RGB = [number, number, number];
/** Рампа висоти контексту: темний базальт дна кратера → охра схилів → світлі шари Mount Sharp. */
const CONTEXT_RAMP: RGB[] = [
  [0.16, 0.1, 0.075],
  [0.36, 0.21, 0.13],
  [0.6, 0.38, 0.24],
  [0.78, 0.6, 0.44],
];

/** Кольори вершин (лінійний RGB 0..1) за висотою в межах [min, max] контексту. */
export function contextColors(heights: Float32Array): Float32Array {
  let lo = Infinity;
  let hi = -Infinity;
  for (const h of heights) {
    if (h < lo) lo = h;
    if (h > hi) hi = h;
  }
  const span = hi > lo ? hi - lo : 1;
  const out = new Float32Array(heights.length * 3);
  for (let i = 0; i < heights.length; i++) {
    const t = Math.min(1, Math.max(0, ((heights[i] as number) - lo) / span));
    const x = Math.sqrt(t) * (CONTEXT_RAMP.length - 1);
    const k = Math.min(CONTEXT_RAMP.length - 2, Math.floor(x));
    const f = x - k;
    const a = CONTEXT_RAMP[k] as RGB;
    const b = CONTEXT_RAMP[k + 1] as RGB;
    out[i * 3] = a[0] + (b[0] - a[0]) * f;
    out[i * 3 + 1] = a[1] + (b[1] - a[1]) * f;
    out[i * 3 + 2] = a[2] + (b[2] - a[2]) * f;
  }
  return out;
}

/** Рамка EVA-району: тонка світла лінія по краю на висоті рельєфу. */
export function tileFramePoints(grid: PlanningGrid, heightAt: (x: number, y: number) => number, lift: number): [number, number, number][] {
  const [ox, oy] = grid.originM;
  const w = grid.width * grid.metersPerPixel;
  const h = grid.height * grid.metersPerPixel;
  const steps = 64;
  const pts: [number, number, number][] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      pts.push(toR3F([x, y], heightAt(x, y) + lift));
    }
  };
  edge(ox, oy, ox + w, oy);
  edge(ox + w, oy, ox + w, oy - h);
  edge(ox + w, oy - h, ox, oy - h);
  edge(ox, oy - h, ox, oy);
  pts.push(pts[0]!);
  return pts;
}
