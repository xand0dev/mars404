// Класифікація клітинок для рендеру (SPEC §7.2). Заблоковане ніколи не «безпечне».
import type { PlanningGrid } from '../../../contracts';
import { isBlocked, isNoDataValue } from '../../../contracts/planning';

export const CELL = { walkable: 0, blocked: 1, noData: 2 } as const;
export type CellClass = (typeof CELL)[keyof typeof CELL];

export interface CellOptions {
  /** region.noData — сирий sentinel висоти */
  noData?: number;
  /** model.maxSlopeDeg — крутіше теж заблоковано */
  maxSlopeDeg?: number;
}

export interface CellSummary {
  classes: Uint8Array;
  counts: { walkable: number; blocked: number; noData: number };
}

/** NoData — висота невідома (NaN, ±Inf, |h| ≥ 3e38, region.noData); blocked — решта правил isBlocked. */
export function classifyCells(grid: PlanningGrid, { noData, maxSlopeDeg }: CellOptions): CellSummary {
  const n = grid.width * grid.height;
  const classes = new Uint8Array(n);
  const counts = { walkable: 0, blocked: 0, noData: 0 };
  for (let i = 0; i < n; i++) {
    if (isNoDataValue(grid.elevationsM[i] ?? NaN, noData)) {
      classes[i] = CELL.noData;
      counts.noData++;
    } else if (isBlocked(grid, i, maxSlopeDeg)) {
      classes[i] = CELL.blocked;
      counts.blocked++;
    } else {
      counts.walkable++;
    }
  }
  return { classes, counts };
}
