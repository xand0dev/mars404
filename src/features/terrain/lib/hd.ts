// Чіткий рельєф (15.11): щільний меш з files.elevationRender і маска зон для гладкого шейдера замість клітинок 10 м.
import type { PlanningGrid, XY } from '../../../contracts';
import { isNoDataValue, toR3F } from '../../../contracts/planning';
import { CELL } from './cells';

/** Щільний рельєф лише для 3D: той самий bbox, що й сітка планування. */
export interface RenderHeights {
  width: number;
  height: number;
  /** Висоти для форми меша (NoData уже заповнено), рядки з півночі */
  data: Float32Array;
}

/** Сітка з тим самим bbox, але роздільністю щільного рельєфу (для buildTerrainGeometry і cellCenter). */
export function renderShape(grid: PlanningGrid, rh: Pick<RenderHeights, 'width' | 'height'>): PlanningGrid {
  return { ...grid, width: rh.width, height: rh.height, metersPerPixel: (grid.metersPerPixel * grid.width) / rh.width };
}

/**
 * Сирий float32 → висоти для меша: розмір має бути width × height, NoData заповнюється
 * найближчим валідним значенням у рядку (на Gale NoData 0 %, це страховка). Невідповідність — null.
 */
export function parseRenderHeights(buf: ArrayBuffer, width: number, height: number, noData?: number): RenderHeights | null {
  if (!(width > 1 && height > 1) || buf.byteLength !== width * height * 4) return null;
  const src = new Float32Array(buf);
  const data = new Float32Array(src.length);
  let valid = 0;
  for (let r = 0; r < height; r++) {
    let last = NaN;
    for (let c = 0; c < width; c++) {
      const i = r * width + c;
      const v = src[i] as number;
      if (isNoDataValue(v, noData)) data[i] = NaN;
      else {
        data[i] = v;
        last = v;
        valid++;
      }
    }
    // Заповнення прогалин у рядку: зліва направо, потім справа наліво.
    for (let c = 0; c < width; c++) {
      const i = r * width + c;
      if (Number.isNaN(data[i])) data[i] = last;
      else last = data[i] as number;
    }
  }
  if (valid === 0) return null;
  let any = 0;
  for (let i = 0; i < data.length; i++) if (Number.isFinite(data[i])) any = data[i] as number;
  for (let i = 0; i < data.length; i++) if (!Number.isFinite(data[i])) data[i] = any;
  return { width, height, data };
}

/** Білінійна висота щільного рельєфу в точці (локальні метри); поза bbox — null. */
export function sampleRender(grid: PlanningGrid, rh: RenderHeights, xy: XY): number | null {
  const shape = renderShape(grid, rh);
  const [ox, oy] = shape.originM;
  const fc = (xy[0] - ox) / shape.metersPerPixel - 0.5;
  const fr = (oy - xy[1]) / shape.metersPerPixel - 0.5;
  if (!Number.isFinite(fc) || !Number.isFinite(fr) || fc < -0.5 || fr < -0.5 || fc > rh.width - 0.5 || fr > rh.height - 0.5) return null;
  const c0 = Math.min(rh.width - 1, Math.max(0, Math.floor(fc)));
  const r0 = Math.min(rh.height - 1, Math.max(0, Math.floor(fr)));
  const c1 = Math.min(rh.width - 1, c0 + 1);
  const r1 = Math.min(rh.height - 1, r0 + 1);
  const tx = Math.min(1, Math.max(0, fc - c0));
  const ty = Math.min(1, Math.max(0, fr - r0));
  const at = (r: number, c: number) => rh.data[r * rh.width + c] as number;
  const top = at(r0, c0) * (1 - tx) + at(r0, c1) * tx;
  const bottom = at(r1, c0) * (1 - tx) + at(r1, c1) * tx;
  return top * (1 - ty) + bottom * ty;
}

/** Точка на щільному рельєфі в координатах R3F (для маркерів і ліній); поза bbox — null. */
export function renderPoint(grid: PlanningGrid, rh: RenderHeights, xy: XY, liftM: number): [number, number, number] | null {
  const h = sampleRender(grid, rh, xy);
  return h === null ? null : toR3F(xy, h + liftM);
}

/**
 * Маска зон для шейдера: R — заблоковано, G — NoData, B — ореол досяжності, A = 255.
 * Рядки перевернуто (рядок 0 — південь), як у buildOverlay для DataTexture.
 * З LinearFilter шейдер проводить межу по 0,5 — виходять гладкі контури замість клітинок.
 */
export function buildZoneMask(width: number, height: number, classes: Uint8Array, mask?: Uint8Array | null): Uint8Array {
  const n = width * height;
  const out = new Uint8Array(n * 4);
  const useMask = mask && mask.length === n ? mask : null;
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const i = r * width + c;
      const t = ((height - 1 - r) * width + c) * 4;
      const cls = classes[i];
      out[t] = cls === CELL.blocked ? 255 : 0;
      out[t + 1] = cls === CELL.noData ? 255 : 0;
      out[t + 2] = useMask && useMask[i] === 1 && cls === CELL.walkable ? 255 : 0;
      out[t + 3] = 255;
    }
  }
  return out;
}
