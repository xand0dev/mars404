// Ґрунт для моделі ходьби: шар THEMIS night (PNG тієї ж сітки) → grid.soil через soilFromNightDN (assumption).
import { soilFromNightDN } from '../../contracts/planning';

/** null — немає canvas у середовищі (тести) або розмір не збігається з сіткою; тоді ґрунт не враховується. */
export async function decodeSoil(bytes: ArrayBuffer, width: number, height: number): Promise<Float32Array | null> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') return null;
  const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  if (bmp.width !== width || bmp.height !== height) return null;
  const ctx = new OffscreenCanvas(width, height).getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bmp, 0, 0);
  return soilFromRGBA(ctx.getImageData(0, 0, width, height).data, width * height);
}

/** RGBA (сірий) → множник часу; прозоре — без даних → 1. */
export function soilFromRGBA(rgba: ArrayLike<number>, n: number): Float32Array {
  const soil = new Float32Array(n);
  for (let i = 0; i < n; i++) soil[i] = (rgba[i * 4 + 3] ?? 0) === 0 ? 1 : soilFromNightDN(rgba[i * 4] ?? NaN);
  return soil;
}
