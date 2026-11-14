// Бюджет, резерв і «Return in N» (SPEC §7.4). Невідоме (null) ніколи не стає нулем.
import type { ModelCoefficients, ReachabilityResult, ResourceKey, Resources } from '../contracts';
import { validateModel } from './model';

/** Бюджет після elapsed: час, O₂ і доза тануть з часом, енергія — лише від руху. */
export function computeBudget(limits: Resources, model: ModelCoefficients, elapsedS: number): Resources {
  return {
    time: limits.time - elapsedS,
    o2: limits.o2 - elapsedS * model.o2GPerS,
    energy: limits.energy,
    dose: limits.dose === null || model.doseUSvPerS === null ? null : limits.dose - elapsedS * model.doseUSvPerS,
  };
}

/** Резерв береться один раз від ліміту. */
export function reserveOf(limits: Resources, model: ModelCoefficients): Resources {
  const f = model.reserveFraction;
  return { time: f * limits.time, o2: f * limits.o2, energy: f * limits.energy, dose: limits.dose === null ? null : f * limits.dose };
}

/** Доступно до резерву; null — ресурс невідомий. */
export function availableOf(budget: Resources, reserve: Resources): Resources {
  return {
    time: budget.time - reserve.time,
    o2: budget.o2 - reserve.o2,
    energy: budget.energy - reserve.energy,
    dose: budget.dose === null || reserve.dose === null ? null : budget.dose - reserve.dose,
  };
}

export function budgetStatus(limits: Resources, model: ModelCoefficients): Exclude<ReachabilityResult['status'], 'invalid'> {
  return limits.dose === null || model.doseUSvPerS === null ? 'incomplete' : 'estimated';
}

export interface ReturnEstimateInput {
  budget: Resources;
  reserve: Resources;
  model: ModelCoefficients;
  /** Планова витрата: plan.totals або шлях position → base. */
  planned: Resources;
}

/** returnInS = min_k((budget − reserve − planned) / rate) для time, O₂ і дози (якщо відома); енергія — лише в deficits. */
export function estimateReturn({ budget, reserve, model, planned }: ReturnEstimateInput): { returnInS: number; deficits: ResourceKey[] } {
  const available = availableOf(budget, reserve);
  const margins: Record<ResourceKey, number | null> = {
    time: available.time - planned.time,
    o2: available.o2 - planned.o2,
    energy: available.energy - planned.energy,
    dose: available.dose === null || planned.dose === null ? null : available.dose - planned.dose,
  };
  const rates: [ResourceKey, number | null][] = [['time', 1], ['o2', model.o2GPerS], ['dose', model.doseUSvPerS]];

  let returnInS = Infinity;
  for (const [key, rate] of rates) {
    const margin = margins[key];
    if (margin !== null && rate !== null && rate > 0) returnInS = Math.min(returnInS, margin / rate);
  }
  const deficits = (Object.keys(margins) as ResourceKey[]).filter((key) => margins[key] !== null && margins[key]! < 0);
  return { returnInS, deficits };
}

/** Помилки входів (SPEC §7.4 «invalid»): модель, від'ємні/NaN ліміти, elapsed. */
export function validateBudgetInputs(model: ModelCoefficients, limits: Resources, elapsedS: number): string[] {
  const errors: string[] = [...validateModel(model)];
  for (const key of ['time', 'o2', 'energy'] as const) {
    if (!(Number.isFinite(limits[key]) && limits[key] >= 0)) errors.push(`limits.${key}`);
  }
  if (limits.dose !== null && !(Number.isFinite(limits.dose) && limits.dose >= 0)) errors.push('limits.dose');
  if (!(Number.isFinite(elapsedS) && elapsedS >= 0)) errors.push('elapsed');
  return errors;
}
