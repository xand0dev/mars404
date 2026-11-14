// Ореол досяжності, «Return in N» і кандидат заміни (SPEC §7.4). Єдине джерело чисел повернення (SPEC §5.2).
import type { ModelParams, PlanningGrid, ReachabilityResult, Resources, RoutePlan, Target, XY } from '../contracts';
import { validateGrid, xyToCell } from '../contracts/planning';
import { availableOf, budgetStatus, computeBudget, estimateReturn, fitsWithin, reserveOf, validateBudgetInputs } from './budget';
import { buildCostTree, type CostTree } from './cost-tree';
import { createWalkGraph } from './edge';
import { validateModel } from './model';

/** Дерева від position (прямі ребра) і до base (зворотні). null — не побудовано (невалідні входи). */
export interface ReachTrees {
  fromPosition: CostTree | null;
  toBase: CostTree | null;
}

export interface ReachInput {
  grid: PlanningGrid;
  model: ModelParams;
  limits: Resources;
  elapsedS: number;
  position: XY | null;
  base: XY | null;
  plan: RoutePlan | null;
  targets: Target[];
  selectedTargetIds: string[];
  /** Сирий sentinel `region.noData`; до завантаження району — немає. */
  noData?: number;
}

/** Тексти попереджень у reach.warnings; панелі показують їх у власних місцях. */
export const REACH_WARNINGS = {
  doseUnknown: 'return not fully assessed: dose — no data',
  calculating: 'Calculating route…',
  buildRoute: 'Build route to assess return',
  noPathBack: 'No path from current position back to base',
} as const;

/** Дерева залежать лише від сітки, моделі, position і base — їх варто кешувати між змінами бюджету. */
export function buildReachTrees(grid: PlanningGrid, model: ModelParams, position: XY | null, base: XY | null, noData?: number): ReachTrees {
  const positionCell = position && xyToCell(grid, position);
  const baseCell = base && xyToCell(grid, base);
  if (!positionCell || !baseCell || validateModel(model).length > 0 || validateGrid(grid).length > 0) return { fromPosition: null, toBase: null };

  const graph = createWalkGraph(grid, model, noData);
  return { fromPosition: buildCostTree(graph, positionCell.index, 'forward'), toBase: buildCostTree(graph, baseCell.index, 'reverse') };
}

export function assessReach(input: ReachInput, trees?: ReachTrees): { budget: Resources; reach: ReachabilityResult } {
  const { grid, model, limits, elapsedS, position, base } = input;
  const cellCount = grid.width * grid.height;
  const budget = computeBudget(limits, model, elapsedS);

  const errors = [...validateBudgetInputs(model, limits, elapsedS), ...validateGrid(grid)];
  if (!position || !xyToCell(grid, position)) errors.push('position');
  if (!base || !xyToCell(grid, base)) errors.push('base');
  const { fromPosition, toBase } = trees ?? buildReachTrees(grid, model, position, base, input.noData);
  if (errors.length > 0 || !fromPosition || !toBase) {
    return { budget, reach: invalidReach(cellCount, errors.length > 0 ? errors : ['trees']) };
  }

  const reserve = reserveOf(limits, model);
  const mask = buildMask(cellCount, fromPosition, toBase, model, availableOf(budget, reserve));
  const warnings: string[] = [];
  const status = budgetStatus(limits, model);
  if (status === 'incomplete') warnings.push(REACH_WARNINGS.doseUnknown);

  const planned = plannedUsage(input, toBase, warnings);
  const estimate = planned ? estimateReturn({ budget, reserve, model, planned }) : null;
  const returnInS = estimate && Number.isFinite(estimate.returnInS) ? estimate.returnInS : null;
  const deficits = estimate?.deficits ?? [];

  const roundTripCost = (t: Target) => {
    const cell = xyToCell(grid, t.coordinates);
    return cell ? fromPosition.cost[cell.index]! + toBase.cost[cell.index]! : Infinity;
  };
  const inMask = (t: Target) => {
    const cell = xyToCell(grid, t.coordinates);
    return cell !== null && mask[cell.index] === 1;
  };
  const selected = input.selectedTargetIds.flatMap((id) => input.targets.filter((t) => t.id === id));
  const outside = selected.filter((t) => !inMask(t));
  for (const t of outside) warnings.push(`${t.name} is outside the reachable area (model)`);

  const swap = deficits.length > 0 || outside.length > 0 ? pickSwap(selected, input.targets, roundTripCost, inMask) : null;
  return { budget, reach: { status, mask, returnInS, deficits, swap, warnings } };
}

function invalidReach(cellCount: number, errors: string[]): ReachabilityResult {
  return { status: 'invalid', mask: new Uint8Array(cellCount), returnInS: null, deficits: [], swap: null, warnings: errors.map((e) => `invalid: ${e}`) };
}

/** Клітинка в масці, якщо обидва шляхи існують і кожен відомий ресурс туди й назад ≤ доступного до резерву. */
function buildMask(cellCount: number, fromPosition: CostTree, toBase: CostTree, model: ModelParams, available: Resources): Uint8Array {
  const mask = new Uint8Array(cellCount);
  for (let i = 0; i < cellCount; i++) {
    const time = fromPosition.time[i]! + toBase.time[i]!;
    if (!Number.isFinite(time)) continue;
    const dist = fromPosition.dist[i]! + toBase.dist[i]!;
    const doseFits = available.dose === null || model.doseUSvPerS === null || fitsWithin(time * model.doseUSvPerS, available.dose);
    if (fitsWithin(time, available.time) && fitsWithin(time * model.o2GPerS, available.o2) && fitsWithin(dist * model.energyWhPerM, available.energy) && doseFits) {
      mask[i] = 1;
    }
  }
  return mask;
}

/** Планова витрата: plan.totals при обраних цілях (лише чинний план), інакше шлях position → base. null — числа не показуємо. */
function plannedUsage(input: ReachInput, toBase: CostTree, warnings: string[]): Resources | null {
  const { plan, model, grid, position } = input;
  if (input.selectedTargetIds.length > 0) {
    if (plan?.status === 'ok') return plan.totals;
    warnings.push(plan?.status === 'pending' ? REACH_WARNINGS.calculating : REACH_WARNINGS.buildRoute);
    return null;
  }

  const cell = xyToCell(grid, position!)!;
  const time = toBase.time[cell.index]!;
  if (!Number.isFinite(time)) {
    warnings.push(REACH_WARNINGS.noPathBack);
    return null;
  }
  const dist = toBase.dist[cell.index]!;
  return { time, o2: time * model.o2GPerS, energy: dist * model.energyWhPerM, dose: model.doseUSvPerS === null ? null : time * model.doseUSvPerS };
}

/** drop — обрана з найбільшою вартістю туди й назад; add — необрана в ореолі з найменшою, меншою за drop. */
function pickSwap(selected: Target[], targets: Target[], roundTripCost: (t: Target) => number, inMask: (t: Target) => boolean): ReachabilityResult['swap'] {
  if (selected.length === 0) return null;
  const drop = selected.reduce((worst, t) => (roundTripCost(t) > roundTripCost(worst) ? t : worst));
  const dropCost = roundTripCost(drop);

  const selectedIds = new Set(selected.map((t) => t.id));
  const candidates = targets.filter((t) => !selectedIds.has(t.id) && inMask(t) && roundTripCost(t) < dropCost);
  if (candidates.length === 0) return null;
  const add = candidates.reduce((best, t) => (roundTripCost(t) < roundTripCost(best) ? t : best));
  return { dropId: drop.id, addId: add.id };
}
