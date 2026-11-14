// Чиста математика сцени глобуса (F1). Без React і three.
import { GALE_ID } from './sites';

const DEG = Math.PI / 180;

/**
 * Масштаб групи глобуса, щоб силует сфери радіуса `radius` вмістився в полотно з полем `margin`.
 * Камеру (спільну з F2) не чіпаємо: беремо її fov і відстань як є. Більше 1 не збільшуємо.
 */
export function fitScale({
  fovDeg,
  distance,
  aspect,
  radius,
  margin = 0.9,
}: {
  fovDeg: number;
  distance: number;
  aspect: number;
  radius: number;
  margin?: number;
}): number {
  if (!(aspect > 0) || !(distance > 0) || !(fovDeg > 0) || !(radius > 0)) return 1;
  const vHalf = (fovDeg / 2) * DEG;
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const maxR = distance * Math.sin(Math.min(vHalf, hHalf));
  return Math.min(1, (margin * maxR) / radius);
}

/** Drag на всю висоту полотна = поворот на 180°. Нахил (x) обмежено ±90°. */
export function dragRotation(
  [x, y]: readonly [number, number],
  dxPx: number,
  dyPx: number,
  heightPx: number,
): [number, number] {
  if (!(heightPx > 0)) return [x, y];
  const k = Math.PI / heightPx;
  return [Math.max(-Math.PI / 2, Math.min(Math.PI / 2, x + dyPx * k)), y + dxPx * k];
}

/** Маркер підсвічено: відкрита картка точки або перехід до Gale. */
export function markerActive(id: string, { previewId, flying }: { previewId: string | null; flying: boolean }): boolean {
  return id === previewId || (flying && id === GALE_ID);
}
