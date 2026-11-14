// Ноги маршруту для «Traverse plan»: суми, «no return» і найкрутіший схил по кожній нозі.
import type { AbortPlan, RoutePlan } from '../../contracts';

export interface LegSummary {
  from: string;
  to: string;
  dist: number;
  time: number;
  o2: number;
  /** Відрізки ноги без повернення з аварійним запасом O₂ (SPEC §7.8). */
  noReturn: number;
  /** Найкрутіший |схил| ноги, градуси. */
  maxSlope: number;
}

/** Ноги за plan.legs (індекс першого відрізка кожної ноги); labels — Start, цілі, Base. */
export function legSummaries(plan: RoutePlan, labels: readonly string[], abort: AbortPlan | null): LegSummary[] {
  const abortOk = abort?.segments.length === plan.segments.length ? abort.segments : null;

  return plan.legs.map((start, leg) => {
    const end = plan.legs[leg + 1] ?? plan.segments.length;
    const summary: LegSummary = { from: labels[leg] ?? '?', to: labels[leg + 1] ?? '?', dist: 0, time: 0, o2: 0, noReturn: 0, maxSlope: 0 };
    for (let k = start; k < end; k++) {
      const segment = plan.segments[k]!;
      summary.dist += segment.dist;
      summary.time += segment.time;
      summary.o2 += segment.o2;
      summary.maxSlope = Math.max(summary.maxSlope, Math.abs(segment.slope));
      if (abortOk?.[k]?.ok === false) summary.noReturn += 1;
    }
    return summary;
  });
}
