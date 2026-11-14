// Підписи цілей у 3D без накладань: текст лише в обраних і наведеної, а підписи, що злипаються на екрані, — сходинками вгору.
import type { Target } from '../../../contracts';

/** Які цілі показують текст: обрані й та, що під курсором. Невідомі id відкинуто. */
export function labelledTargetIds(targets: readonly Target[], selectedIds: readonly string[], hoveredId: string | null): Set<string> {
  const ids = new Set(selectedIds.filter((id) => targets.some((t) => t.id === id)));
  if (hoveredId && targets.some((t) => t.id === hoveredId)) ids.add(hoveredId);
  return ids;
}

/** Підпис на екрані: x, y — точка прив'язки (низ по центру), px, y донизу; w, h — розмір, px. */
export interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Проміжок між сходинками, частка висоти підпису. */
export const LABEL_GAP = 1.15;

/**
 * Сходинка для кожного підпису: 0 — на своєму місці, 1, 2… — на стільки висот вище.
 * Жадібно в порядку списку: підпис бере найменшу сходинку, де не перетинає вже розставлені.
 */
export function stackLabels(boxes: readonly LabelBox[], gap = LABEL_GAP): number[] {
  const placed: { l: number; r: number; t: number; b: number }[] = [];
  return boxes.map((box) => {
    if (![box.x, box.y, box.w, box.h].every(Number.isFinite)) return 0;
    const l = box.x - box.w / 2;
    const r = box.x + box.w / 2;
    for (let level = 0; level < 12; level += 1) {
      const b = box.y - level * box.h * gap;
      const t = b - box.h;
      if (!placed.some((p) => l < p.r && r > p.l && t < p.b && b > p.t)) {
        placed.push({ l, r, t, b });
        return level;
      }
    }
    return 0;
  });
}

/** Приблизна ширина підпису в його висотах (шрифт Label3D: 40 px текст у 60 px висоти). */
export function labelAspect(text: string): number {
  return (Array.from(text).length * 40 * 0.58 + 32) / 60;
}
