// Шари, які F2 малює сам із сітки (slope, terrain), і порядок малювання 3D.
// F3 кладе slope/terrain як .f32 — ті самі числа вже є в grid, тож колір беремо з легенди шару.
import type { Layer, PlanningGrid } from '../../../contracts';
import { isRasterUrl } from './traverse';

type RGB = [number, number, number];
export type GridLayerKind = 'raster' | 'slope' | 'terrain';

/**
 * Порядок малювання прозорих об'єктів 3D. Накладка ореолу/blocked напівпрозора, тож лінії й маркери
 * мають іти ПІСЛЯ неї (і теж у прозорому проході), інакше вона їх перекриває.
 */
export const RENDER_ORDER = { layers: 1, overlay: 10, lines: 12, markers: 13, segment: 15, ring: 16, labels: 20 } as const;

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1] as string, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Колір значення за легендою (лінійно між зупинками, за межами — крайня). NaN чи порожня легенда → null. */
export function legendColor(legend: Layer['legend'], value: number): RGB | null {
  if (!Number.isFinite(value)) return null;
  const stops = legend
    .map((s) => ({ v: s.value, c: hexToRgb(s.color) }))
    .filter((s): s is { v: number; c: RGB } => s.c !== null && Number.isFinite(s.v))
    .sort((a, b) => a.v - b.v);
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return null;
  if (value <= first.v) return first.c;
  if (value >= last.v) return last.c;
  for (let k = 1; k < stops.length; k++) {
    const a = stops[k - 1] as { v: number; c: RGB };
    const b = stops[k] as { v: number; c: RGB };
    if (value <= b.v) {
      const t = (value - a.v) / (b.v - a.v || 1);
      return [0, 1, 2].map((i) => Math.round(a.c[i]! + (b.c[i]! - a.c[i]!) * t)) as RGB;
    }
  }
  return last.c;
}

/** Як F2 малює шар: растр за url; slope/terrain — із сітки за легендою; інакше null (у легенді «not drawn»). */
export function gridLayerKind(layer: Pick<Layer, 'kind' | 'url' | 'legend'>): GridLayerKind | null {
  if (isRasterUrl(layer.url)) return 'raster';
  if ((layer.kind === 'slope' || layer.kind === 'terrain') && layer.legend.length > 0) return layer.kind;
  return null;
}

/** RGBA шару з сітки. northUp: true — для canvas (2D), false — для DataTexture (3D, рядок 0 — південь). */
export function gridLayerRGBA(grid: PlanningGrid, kind: 'slope' | 'terrain', legend: Layer['legend'], { northUp }: { northUp: boolean }): Uint8Array {
  const { width, height } = grid;
  const src = kind === 'slope' ? grid.slopesDeg : grid.elevationsM;
  const out = new Uint8Array(width * height * 4);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const rgb = legendColor(legend, src[r * width + c] ?? NaN);
      if (!rgb) continue; // невідоме — прозоро; NoData показує верхня накладка
      const t = ((northUp ? r : height - 1 - r) * width + c) * 4;
      out.set(rgb, t);
      out[t + 3] = 255;
    }
  }
  return out;
}
