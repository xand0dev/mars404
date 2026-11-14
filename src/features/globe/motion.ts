// Перехід до Gale (F1-AC3). Чисті функції без React.
const DEG = Math.PI / 180;

/** Тривалість анімації повороту, мс. Це UI-параметр, не фізична константа. */
export const FLY_MS = 1200;

/** true, якщо користувач просить менше руху. Без matchMedia (jsdom) — false. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Обертання групи глобуса (Euler 'XYZ', радіани), після якого точка lat/lon дивиться на камеру (+Z).
 * Спершу Y на −(lon + 90°), потім X на lat. Камера (спільна з F2) лишається на місці.
 */
export function rotationToFace(latDeg: number, lonEastDeg: number): [number, number, number] {
  return [latDeg * DEG, -(lonEastDeg + 90) * DEG, 0];
}

type Rot = readonly [number, number, number];

/** Різниця кутів у (−π, π] — щоб глобус обертався коротшим шляхом. */
function shortest(from: number, to: number): number {
  const d = (to - from) % (2 * Math.PI);
  return d > Math.PI ? d - 2 * Math.PI : d <= -Math.PI ? d + 2 * Math.PI : d;
}

/** Кути на частці t ∈ [0, 1] шляху (smoothstep-згладжування). */
export function lerpRotation(from: Rot, to: Rot, t: number): [number, number, number] {
  const c = Math.min(1, Math.max(0, t));
  const e = c * c * (3 - 2 * c);
  return [0, 1, 2].map((i) => from[i]! + shortest(from[i]!, to[i]!) * e) as [number, number, number];
}
