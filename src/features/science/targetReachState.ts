import type { PlanningGrid, ReachabilityResult, Target } from '../../contracts';
import { xyToCell } from '../../contracts/planning';

export type TargetReachState = 'inside' | 'outside' | 'not-assessed';

export function targetReachState(target: Target, grid: PlanningGrid, reach: ReachabilityResult | null): TargetReachState {
  if (!reach || reach.status === 'invalid' || reach.mask.length !== grid.width * grid.height) return 'not-assessed';
  const cell = xyToCell(grid, target.coordinates);
  if (!cell) return 'outside';
  return reach.mask[cell.index] === 1 ? 'inside' : 'outside';
}
