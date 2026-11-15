// Курсор режиму Add mark (#134): pin із «+», кінчик pin — точка, куди стане мітка.
// Над місцем, де мітку поставити не можна, — not-allowed. Поза режимом — звичайний курсор.
import type { PlanningGrid, XY } from '../../../contracts';
import { snapToCell } from './marks';

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
  '<path d="M16 31 C16 31 5 19.5 5 12 a11 11 0 0 1 22 0 C27 19.5 16 31 16 31 Z" fill="#e0673c" stroke="#ffffff" stroke-width="2"/>' +
  '<path d="M16 6.5 V17.5 M10.5 12 H21.5" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>' +
  '</svg>';

/** Кастомний курсор з hotspot на кінчику pin (16, 31); не завантажився — crosshair. */
export const MARK_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(PIN_SVG)}") 16 31, crosshair`;

export type MarkHover = 'off' | 'valid' | 'invalid';

/** CSS cursor для стану режиму: '' — успадкувати звичайний. */
export function markCursorFor(state: MarkHover): string {
  if (state === 'off') return '';
  return state === 'valid' ? MARK_CURSOR : 'not-allowed';
}

/** Чи стане мітка в цій точці (та сама перевірка, що й у createMark). */
export function canPlaceMark(grid: Pick<PlanningGrid, 'width' | 'height' | 'metersPerPixel' | 'originM'>, xy: XY): boolean {
  return snapToCell(grid, xy) !== null;
}
