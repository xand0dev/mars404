// Abort map і точка неповернення (SPEC §7.8): з кінця якого відрізка плану можна дійти до бази з аварійним запасом O₂.
import type { AbortPlan, ModelCoefficients, PlanningGrid, Resources, RoutePlan } from '../contracts';
import { xyToCell } from '../contracts/planning';
import { fitsWithin } from './budget';
import type { CostTree } from './cost-tree';

/** Тип результату — AbortPlan з контракту (#26). */
export type AbortAssessment = AbortPlan;

export interface AbortInput {
  plan: RoutePlan | null;
  grid: PlanningGrid;
  /** Те саме зворотне дерево до бази, що й для ореолу. */
  toBase: CostTree;
  budget: Resources;
  reserve: Resources;
  model: ModelCoefficients;
  emergencyO2G: number;
}

/** null — немає чинного плану або невалідний аварійний запас. */
export function assessAbort({ plan, grid, toBase, budget, reserve, model, emergencyO2G }: AbortInput): AbortAssessment | null {
  if (plan?.status !== 'ok' || !(Number.isFinite(emergencyO2G) && emergencyO2G >= 0)) return null;

  const doseKnown = budget.dose !== null && reserve.dose !== null && model.doseUSvPerS !== null;
  const used = { time: 0, o2: 0, energy: 0, dose: 0 };
  const segments: AbortAssessment['segments'] = [];
  let pointOfNoReturnS: number | null = null;

  for (const segment of plan.segments) {
    const startS = used.time;
    used.time += segment.time;
    used.o2 += segment.o2;
    used.energy += segment.energy;
    used.dose += segment.dose ?? 0;

    const cell = xyToCell(grid, segment.to);
    const backTime = cell ? toBase.time[cell.index]! : Infinity;
    if (!Number.isFinite(backTime)) {
      segments.push({ returnS: null, ok: false });
      pointOfNoReturnS ??= startS;
      continue;
    }

    const backDist = toBase.dist[cell!.index]!;
    const ok =
      fitsWithin(backTime, budget.time - used.time - reserve.time) &&
      fitsWithin(backTime * model.o2GPerS, budget.o2 - used.o2 - emergencyO2G) &&
      fitsWithin(backDist * model.energyWhPerM, budget.energy - used.energy - reserve.energy) &&
      (!doseKnown || fitsWithin(backTime * model.doseUSvPerS!, budget.dose! - used.dose - reserve.dose!));
    segments.push({ returnS: backTime, ok });
    if (!ok) pointOfNoReturnS ??= startS;
  }

  return { segments, pointOfNoReturnS, emergencyO2G };
}
