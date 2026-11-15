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

/** Маркер підсвічено: відкрита картка точки або перехід до району. */
export function markerActive(
  id: string,
  { previewId, flying, flyTo = GALE_ID }: { previewId: string | null; flying: boolean; flyTo?: string },
): boolean {
  return id === previewId || (flying && id === flyTo);
}

type V3 = readonly [number, number, number];

/**
 * Маркер у світових координатах (центр глобуса в 0) видно з камери: косинус між нормаллю поверхні
 * і напрямком на камеру > `margin`. Поле ховає маркери біля краю диска, щоб вони не стирчали з-за сфери.
 */
export function facesCamera(p: V3, cam: V3, margin = 0.1): boolean {
  const len = Math.hypot(p[0], p[1], p[2]);
  const v = [cam[0] - p[0], cam[1] - p[1], cam[2] - p[2]] as const;
  const vLen = Math.hypot(v[0], v[1], v[2]);
  if (!(len > 0) || !(vLen > 0)) return false;
  return (p[0] * v[0] + p[1] * v[1] + p[2] * v[2]) / (len * vLen) > margin;
}
