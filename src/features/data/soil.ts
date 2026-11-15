// Ґрунт для моделі ходьби: шар THEMIS night (PNG тієї ж сітки) → grid.soil через soilFromNightDN (assumption).
// #137: PNG кольоровий (pipeline/themis.colorize: DN → лінійно між точками легенди), тому DN відновлюємо
// за легендою шару з region.json; без легенди (старий сірий PNG) — DN = червоний канал.
import type { Layer } from '../../contracts';
import { soilFromNightDN } from '../../contracts/planning';

export type LegendStop = Layer['legend'][number];

/** null — немає canvas у середовищі (тести) або розмір не збігається з сіткою; тоді ґрунт не враховується. */
export async function decodeSoil(bytes: ArrayBuffer, width: number, height: number, legend?: readonly LegendStop[]): Promise<Float32Array | null> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') return null;
  const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  if (bmp.width !== width || bmp.height !== height) return null;
  const ctx = new OffscreenCanvas(width, height).getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bmp, 0, 0);
  return soilFromRGBA(ctx.getImageData(0, 0, width, height).data, width * height, legend);
}

const rgb = (hex: string): [number, number, number] | null => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)] : null;
};

/**
 * Колір пікселя → DN: найближча точка на ламаній легенди в RGB (проєкція на кожен відрізок),
 * DN — лінійно між значеннями сусідніх точок легенди. Поза легендою — крайні значення (як обрізав pipeline).
 */
export function dnFromLegendColor(c: ArrayLike<number>, legend: readonly LegendStop[]): number {
  let best = Infinity;
  let dn = NaN;
  for (let k = 0; k + 1 < legend.length; k++) {
    const a = rgb(legend[k]!.color);
    const b = rgb(legend[k + 1]!.color);
    if (!a || !b) continue;
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len2 = d[0]! ** 2 + d[1]! ** 2 + d[2]! ** 2;
    const f = len2 ? Math.min(1, Math.max(0, ((c[0]! - a[0]) * d[0]! + (c[1]! - a[1]) * d[1]! + (c[2]! - a[2]) * d[2]!) / len2)) : 0;
    const dist = (c[0]! - a[0] - f * d[0]!) ** 2 + (c[1]! - a[1] - f * d[1]!) ** 2 + (c[2]! - a[2] - f * d[2]!) ** 2;
    if (dist < best) {
      best = dist;
      dn = legend[k]!.value + f * (legend[k + 1]!.value - legend[k]!.value);
    }
  }
  return dn;
}

/** RGBA → множник часу; прозоре — без даних → 1. Легенда з ≥ 2 кольорами — DN з кольору, інакше червоний канал (сірий PNG). */
export function soilFromRGBA(rgba: ArrayLike<number>, n: number, legend?: readonly LegendStop[]): Float32Array {
  const useLegend = !!legend && legend.filter((s) => rgb(s.color)).length >= 2;
  const soil = new Float32Array(n);
  const px = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    if ((rgba[i * 4 + 3] ?? 0) === 0) {
      soil[i] = 1;
      continue;
    }
    if (!useLegend) {
      soil[i] = soilFromNightDN(rgba[i * 4] ?? NaN);
      continue;
    }
    px[0] = rgba[i * 4] ?? 0;
    px[1] = rgba[i * 4 + 1] ?? 0;
    px[2] = rgba[i * 4 + 2] ?? 0;
    soil[i] = soilFromNightDN(dnFromLegendColor(px, legend!));
  }
  return soil;
}
