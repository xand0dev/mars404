// «Чому ризиковано» по відрізках (SPEC §7.14): лише з даних, які вже є, без AI.
import type { AbortPlan, Annotation, PlanningGrid, RoutePlan, XY } from '../../contracts';
import { cellIndex, inGrid, isNoDataValue, xyToCell } from '../../contracts/planning';

/** Поріг «крутого» відрізка — assumption (SPEC §7.14). */
export const RISK_SLOPE_DEG = 20;

export const NO_RETURN_RISK = 'no return with emergency O₂';

export interface SegmentRiskInput {
  plan: RoutePlan;
  /** Сітка з даними висот (NoData); мітки не змінюють висот, тож підходить і вихідна. */
  grid: PlanningGrid;
  annotations: readonly Annotation[];
  abort: AbortPlan | null;
  /** Сирий sentinel `region.noData`. */
  noData?: number;
}

/** Причини для кожного відрізка; порожній список — «nominal». */
export function segmentRisks({ plan, grid, annotations, abort, noData }: SegmentRiskInput): string[][] {
  const hazardMarks = annotations.filter((a) => a.kind === 'hazard' && a.radiusM > 0);
  // Довжина не збігається — abort від іншого плану.
  const abortSegments = abort?.segments.length === plan.segments.length ? abort.segments : null;

  return plan.segments.map((segment, k) => {
    const reasons: string[] = [];
    const slope = Math.abs(segment.slope);
    if (slope >= RISK_SLOPE_DEG) reasons.push(`slope ${Math.round(slope)}°`);
    if (nextToNoData(grid, segment.to, noData)) reasons.push('next to NoData');
    if (hazardMarks.some((mark) => insideMark(mark, segment.from) || insideMark(mark, segment.to))) reasons.push('crew mark: hazard');
    if (abortSegments?.[k]?.ok === false) reasons.push(NO_RETURN_RISK);
    return reasons;
  });
}

export function formatRisks(reasons: readonly string[]): string {
  return reasons.length > 0 ? reasons.join(', ') : 'nominal';
}

const insideMark = (mark: Annotation, [x, y]: XY) => Math.hypot(x - mark.coordinates[0], y - mark.coordinates[1]) <= mark.radiusM;

/** Лише справжня відсутність даних висоти, не заблокованість схилом. */
function nextToNoData(grid: PlanningGrid, point: XY, noData?: number): boolean {
  const cell = xyToCell(grid, point);
  if (!cell) return false;

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const row = cell.row + dr;
      const col = cell.col + dc;
      if ((dr !== 0 || dc !== 0) && inGrid(grid, row, col) && isNoDataValue(grid.elevationsM[cellIndex(grid, row, col)]!, noData)) return true;
    }
  }
  return false;
}
