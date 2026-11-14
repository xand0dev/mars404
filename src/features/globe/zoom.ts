// F1 (#80): масштаб глобуса — колесо / тачпад, два пальці, кнопки. Локальний стан F1, не спільний store.
// Числа нижче — UI-вибір, не дані.
import { create } from 'zustand';

export const ZOOM_MIN = 0.7;
export const ZOOM_MAX = 3;
/** Крок кнопок «Zoom in / out» */
export const ZOOM_STEP = 1.25;
/** Чутливість колеса, 1/px; щипок macOS (wheel + ctrlKey) дає малі deltaY — чутливіший */
const WHEEL_K = 0.0015;
const PINCH_WHEEL_K = 0.01;
/** deltaMode: 1 — рядки, 2 — сторінки (≈ px) */
const DELTA_PX = [1, 16, 400] as const;

/** Масштаб у межах [ZOOM_MIN, max]; max не нижче за ZOOM_MIN. NaN → 1. */
export function clampZoom(z: number, max = ZOOM_MAX): number {
  if (Number.isNaN(z)) return 1;
  const hi = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, max));
  return Math.min(hi, Math.max(ZOOM_MIN, z));
}

/** Множник масштабу з події wheel: deltaY < 0 (вгору / розвести пальці) — збільшити. */
export function wheelFactor(deltaY: number, deltaMode: number, ctrlKey: boolean): number {
  const px = deltaY * (DELTA_PX[deltaMode as 0 | 1 | 2] ?? 1);
  return Math.exp(-px * (ctrlKey ? PINCH_WHEEL_K : WHEEL_K));
}

/** Множник з двох пальців: нова відстань / стара. */
export function pinchFactor(prev: number, next: number): number {
  return prev > 0 && next > 0 ? next / prev : 1;
}

/** Верхня межа, з якою сфера лишається перед камерою (камера F2 — на відстані distance). */
export function maxZoomFor({ scale, distance, radius }: { scale: number; distance: number; radius: number }): number {
  if (!(scale > 0) || !(distance > 0) || !(radius > 0)) return ZOOM_MAX;
  return Math.min(ZOOM_MAX, (0.85 * distance) / (radius * scale));
}

interface ZoomState {
  zoom: number;
  /** Поточна верхня межа (від камери); ставить GlobeScene */
  maxZoom: number;
  /** Росте на кожному «Reset view» — GlobeScene повертає стартовий поворот */
  resetTick: number;
  zoomBy(factor: number): void;
  zoomIn(): void;
  zoomOut(): void;
  setMaxZoom(max: number): void;
  reset(): void;
}

export const useZoom = create<ZoomState>()((set) => ({
  zoom: 1,
  maxZoom: ZOOM_MAX,
  resetTick: 0,
  zoomBy: (f) => set((s) => (Number.isFinite(f) && f > 0 ? { zoom: clampZoom(s.zoom * f, s.maxZoom) } : s)),
  zoomIn: () => set((s) => ({ zoom: clampZoom(s.zoom * ZOOM_STEP, s.maxZoom) })),
  zoomOut: () => set((s) => ({ zoom: clampZoom(s.zoom / ZOOM_STEP, s.maxZoom) })),
  setMaxZoom: (max) => set((s) => ({ maxZoom: clampZoom(max), zoom: clampZoom(s.zoom, max) })),
  reset: () => set((s) => ({ zoom: clampZoom(1, s.maxZoom), resetTick: s.resetTick + 1 })),
}));

/** Повне скидання (тести). */
export function resetZoom(): void {
  useZoom.setState({ zoom: 1, maxZoom: ZOOM_MAX, resetTick: 0 });
}
