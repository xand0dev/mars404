// Мітки екіпажу на карті (SPEC §7.12, F2-AC8): чиста логіка розміщення й показу.
import type { Annotation, AnnotationKind, PlanningGrid, RoutePlan, XY } from '../../../contracts';
import { cellCenter, xyToCell } from '../../../contracts/planning';

type Shape = Pick<PlanningGrid, 'width' | 'height' | 'metersPerPixel' | 'originM'>;

/** Радіус нової мітки за замовчуванням, м (assumption, SPEC §7.12). */
export const DEFAULT_MARK_RADIUS_M = 20;

export const MARK_KINDS: readonly AnnotationKind[] = ['impassable', 'hazard', 'note', 'plan'];

/** Що робить кожен вид мітки — підказка під перемикачем (людина не мусить знати SPEC). */
export const MARK_HINT: Record<AnnotationKind, string> = {
  impassable: `The route never goes within ${DEFAULT_MARK_RADIUS_M} m of it (cliff, deep sand).`,
  hazard: `The route goes around it if it can (${DEFAULT_MARK_RADIUS_M} m): loose rock, slippery slope.`,
  note: 'Only a note on the map. The route does not change.',
  plan: 'A planned stop or task. The route does not change.',
};

export const MARK_LABEL: Record<AnnotationKind, string> = {
  impassable: 'Blocked',
  hazard: 'Hazard',
  note: 'Note',
  plan: 'Plan',
};

/** Колір лише доповнює форму знака (§7.7, §7.11). */
export const MARK_COLOR: Record<AnnotationKind, string> = {
  impassable: '#ff6b6b',
  hazard: '#e8b84a',
  note: '#8fbbe8',
  plan: '#8fbbe8',
};

/** Центр клітинки, у яку потрапила точка; null — поза сіткою (мітку не ставимо). */
export function snapToCell(grid: Shape, xy: XY): XY | null {
  if (!xy.every(Number.isFinite)) return null;
  const c = xyToCell(grid, xy);
  return c ? cellCenter(grid, c.row, c.col) : null;
}

/** Точка 2D-плану (col, row з дробовою частиною) → локальні метри. */
export function planToXY(grid: Shape, col: number, row: number): XY {
  const [ox, oy] = grid.originM;
  return [ox + col * grid.metersPerPixel, oy - row * grid.metersPerPixel];
}

/** Точка R3F на рельєфі → локальні метри: (x, h × 3, −y) → (x, y). */
export function r3fToXY(point: { x: number; z: number }): XY {
  return [point.x, -point.z];
}

let seq = 0;
function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  seq += 1;
  return `mark-${Date.now().toString(36)}-${seq}`;
}

/** Нова мітка в центрі клітинки; null — точка поза сіткою. */
export function createMark(
  grid: Shape,
  xy: XY,
  kind: AnnotationKind,
  text = '',
  opts: { radiusM?: number; now?: Date; id?: string } = {},
): Annotation | null {
  const at = snapToCell(grid, xy);
  if (!at) return null;
  return {
    id: opts.id ?? newId(),
    kind,
    coordinates: at,
    radiusM: opts.radiusM ?? DEFAULT_MARK_RADIUS_M,
    text: text.trim(),
    createdAt: (opts.now ?? new Date()).toISOString(),
    origin: 'this-eva',
  };
}

/** Доступна назва мітки: вид, текст і звідки вона. */
export function markLabel(a: Annotation): string {
  const origin = a.origin === 'imported' ? ' (previous EVA)' : '';
  return `${MARK_LABEL[a.kind]} mark${a.text ? `: ${a.text}` : ''}${origin}`;
}

/** Мітки, які видно на карті: валідні координати й радіус. */
export function visibleMarks(grid: Shape, marks: readonly Annotation[]): Annotation[] {
  return marks.filter((m) => m.coordinates.every(Number.isFinite) && Number.isFinite(m.radiusM) && m.radiusM >= 0 && xyToCell(grid, m.coordinates) !== null);
}

/** Куди поставити мітку з клавіатури: середина обраного відрізка, інакше null. */
export function keyboardMarkPoint(plan: RoutePlan | null, selectedSegment: number | null): XY | null {
  const s = plan && selectedSegment !== null ? plan.segments[selectedSegment] : undefined;
  return s ? [(s.from[0] + s.to[0]) / 2, (s.from[1] + s.to[1]) / 2] : null;
}

/** Символ для підпису в 3D (спрайт з текстом). */
export const MARK_CHAR: Record<AnnotationKind, string> = { impassable: '▲✕', hazard: '△', note: '⚐', plan: '⚑' };
