// F2-AC6 (SPEC §7.8): відрізки маршруту без повернення з аварійним запасом O₂ — червоні.
// Рахує лише F5 (reach.abort); F2 тільки малює.
import type { AbortPlan, ReachabilityResult, RoutePlan, XY } from '../../../contracts';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/**
 * reach.abort (тип AbortPlan з контракту, #43) з перевіркою форми в runtime: дані приходять від F5 через store.
 * Невалідна форма → null: краще звичайний маршрут, ніж вигадані червоні відрізки.
 */
export function readAbort(reach: ReachabilityResult | null): AbortPlan | null {
  const a: unknown = reach?.abort ?? null;
  if (!isObj(a) || !Array.isArray(a.segments)) return null;
  const segOk = a.segments.every(
    (s) => isObj(s) && typeof s.ok === 'boolean' && (s.returnS === null || (typeof s.returnS === 'number' && Number.isFinite(s.returnS))),
  );
  const ponr = a.pointOfNoReturnS;
  if (!segOk || !(ponr === null || typeof ponr === 'number') || typeof a.emergencyO2G !== 'number') return null;
  return a as unknown as AbortPlan;
}

export interface NoReturnRun {
  /** індекси першого й останнього відрізка серії (включно) */
  first: number;
  last: number;
  /** точки лінії: from першого, далі to кожного */
  points: XY[];
}

export interface NoReturnRuns {
  runs: NoReturnRun[];
  /** скільки відрізків червоні */
  count: number;
  warning: string | null;
}

/** Суцільні серії відрізків з ok = false. Пізніші ok біля бази розривають серію (кожен відрізок окремо, §7.8). */
export function noReturnRuns(plan: RoutePlan | null, abort: AbortPlan | null): NoReturnRuns {
  if (!plan || !abort) return { runs: [], count: 0, warning: null };
  if (abort.segments.length !== plan.segments.length) {
    return { runs: [], count: 0, warning: `reach.abort has ${abort.segments.length} segments, plan has ${plan.segments.length}: no-return marks hidden` };
  }
  const runs: NoReturnRun[] = [];
  let count = 0;
  let cur: NoReturnRun | null = null;
  plan.segments.forEach((s, i) => {
    if (abort.segments[i]?.ok === false) {
      count++;
      if (cur) {
        cur.last = i;
        cur.points.push(s.to);
      } else {
        cur = { first: i, last: i, points: [s.from, s.to] };
        runs.push(cur);
      }
    } else cur = null;
  });
  return { runs, count, warning: null };
}

/** Знак точки неповернення (SPEC §7.8): початок першого відрізка без повернення й підпис «хвилини від старту». */
export function pointOfNoReturnMarker(plan: RoutePlan | null, abort: AbortPlan | null): { xy: XY; label: string } | null {
  if (!plan || !abort || abort.segments.length !== plan.segments.length || abort.pointOfNoReturnS === null) return null;
  const first = abort.segments.findIndex((s) => !s.ok);
  const segment = first >= 0 ? plan.segments[first] : undefined;
  if (!segment) return null;
  return { xy: segment.from, label: `Point of no return · ${Math.floor(abort.pointOfNoReturnS / 60)} min` };
}
