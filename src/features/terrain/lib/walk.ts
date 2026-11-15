// Демо-прогулянка маршрутом (15.11): де астронавт у момент t модельного часу і скільки витрачено.
// Швидкість — з моделі F4: кожен відрізок проходиться за свій segment.time (повільніше вгору й крутим схилом).
import type { RoutePlan, XY } from '../../../contracts';

export interface WalkState {
  /** Позиція, локальні метри */
  xy: XY;
  /** Курс у площині (x, y): кут від осі +x проти годинникової, радіани */
  heading: number;
  /** Індекс поточного відрізка */
  segment: number;
  /** Модельний час від старту, с (обрізаний до [0, total]) */
  t: number;
  total: number;
  /** Пройдено, м; витрачено O₂, г; енергії, Wh — інтерполяція всередині відрізка */
  dist: number;
  o2: number;
  energy: number;
  /** Нахил поточного відрізка, ° (+ — підйом) */
  slope: number;
  done: boolean;
}

/** Накопичений час на початку кожного відрізка + загальний. */
export function walkTimeline(plan: Pick<RoutePlan, 'segments'>): { starts: number[]; total: number } {
  const starts: number[] = [];
  let acc = 0;
  for (const s of plan.segments) {
    starts.push(acc);
    acc += Number.isFinite(s.time) && s.time > 0 ? s.time : 0;
  }
  return { starts, total: acc };
}

/** Стан прогулянки в момент t (с модельного часу). Порожній план — null. */
export function walkAt(plan: Pick<RoutePlan, 'segments'>, t: number, timeline = walkTimeline(plan)): WalkState | null {
  const segs = plan.segments;
  if (segs.length === 0) return null;
  const { starts, total } = timeline;
  const tt = Math.min(Math.max(Number.isFinite(t) ? t : 0, 0), total);
  // Бінарний пошук відрізка: останній з starts[i] <= tt
  let lo = 0;
  let hi = segs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((starts[mid] as number) <= tt) lo = mid;
    else hi = mid - 1;
  }
  // Відрізки нульової тривалості пропускаємо вперед, щоб курс не стрибав
  let i = lo;
  while (i < segs.length - 1 && !(segs[i]!.time > 0)) i++;
  const s = segs[i]!;
  const f = s.time > 0 ? Math.min(1, Math.max(0, (tt - (starts[i] as number)) / s.time)) : 1;
  const xy: XY = [s.from[0] + (s.to[0] - s.from[0]) * f, s.from[1] + (s.to[1] - s.from[1]) * f];
  let dist = 0;
  let o2 = 0;
  let energy = 0;
  for (let k = 0; k < i; k++) {
    dist += segs[k]!.dist;
    o2 += segs[k]!.o2;
    energy += segs[k]!.energy;
  }
  dist += s.dist * f;
  o2 += s.o2 * f;
  energy += s.energy * f;
  return {
    xy,
    heading: Math.atan2(s.to[1] - s.from[1], s.to[0] - s.from[0]),
    segment: i,
    t: tt,
    total,
    dist,
    o2,
    energy,
    slope: s.slope,
    done: tt >= total,
  };
}

/** Найкоротша різниця кутів (для плавного повороту): результат у (−π, π]. */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Час у форматі «мм:сс» (або «г:мм:сс» від години). */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(ss)}` : `${two(m)}:${two(ss)}`;
}

/** Швидкості відтворення: модельних секунд за реальну. 1× — реальний час. */
export const WALK_SPEEDS = [1, 2, 5, 10, 30, 60] as const;
export const DEFAULT_WALK_SPEED = 5;

/** Вершини маршруту: старт кожного відрізка + кінець останнього. */
export function routeVertices(plan: Pick<RoutePlan, 'segments'>): XY[] {
  const segs = plan.segments;
  if (segs.length === 0) return [];
  return [...segs.map((s) => s.from), segs[segs.length - 1]!.to];
}

/** Згладжування Чайкіна лише для показу: прибирає зубці сітки 10 м, кінці не зсуваються. */
export function smoothPath(points: XY[], iterations = 2): XY[] {
  let pts = points.filter((p, i) => i === 0 || p[0] !== points[i - 1]![0] || p[1] !== points[i - 1]![1]);
  for (let k = 0; k < iterations && pts.length > 2; k++) {
    const out: XY[] = [pts[0]!];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      if (i > 0) out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      if (i < pts.length - 2) out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    out.push(pts[pts.length - 1]!);
    pts = out;
  }
  return pts;
}

export interface PathIndex {
  points: XY[];
  /** Накопичена довжина до кожної точки, м */
  cum: number[];
  length: number;
}

export function indexPath(points: XY[]): PathIndex {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    cum.push(cum[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { points, cum, length: cum[cum.length - 1] ?? 0 };
}

/** Точка на шляху на відстані d від початку (обрізано до [0, length]). */
export function pointAt(path: PathIndex, d: number): XY {
  const { points, cum, length } = path;
  if (points.length === 0) return [0, 0];
  if (points.length === 1 || !(length > 0)) return points[0]!;
  const dd = Math.min(Math.max(d, 0), length);
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid]! <= dd) lo = mid;
    else hi = mid;
  }
  const span = cum[hi]! - cum[lo]!;
  const f = span > 0 ? (dd - cum[lo]!) / span : 0;
  const a = points[lo]!;
  const b = points[hi]!;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

/** Частина шляху між d0 і d1 з кроком ≤ step м (для лінії, що лягає на рельєф). */
export function slicePath(path: PathIndex, d0: number, d1: number, step = 2): XY[] {
  const a = Math.max(0, Math.min(d0, d1));
  const b = Math.min(path.length, Math.max(d0, d1));
  if (!(b > a)) return [];
  const n = Math.max(1, Math.ceil((b - a) / step));
  return Array.from({ length: n + 1 }, (_, i) => pointAt(path, a + ((b - a) * i) / n));
}

/**
 * Хода моделі: який кліп і з якою швидкістю, щоб ступні не ковзали.
 * Цикл Walk — два кроки по ~0,7 м (assumption, як STRIDE у моделі F4), цикл Run — два кроки по ~1,3 м (assumption).
 * Вище межі бігу ноги вже не встигають — це прискорене відтворення (fastForward), анімацію обмежуємо.
 */
export const WALK_CYCLE_M = 1.4;
export const RUN_CYCLE_M = 2.6;
export interface Gait {
  clip: 'Idle' | 'Walk' | 'Run';
  timeScale: number;
  fastForward: boolean;
}
export function gaitFor(speedMps: number, walkDur: number, runDur: number): Gait {
  const v = Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0;
  if (v < 0.05) return { clip: 'Idle', timeScale: 1, fastForward: false };
  const walkNatural = WALK_CYCLE_M / walkDur;
  const runNatural = RUN_CYCLE_M / runDur;
  const WALK_MAX = 1.8;
  const RUN_MAX = 1.6;
  if (v <= walkNatural * WALK_MAX) return { clip: 'Walk', timeScale: Math.max(0.5, v / walkNatural), fastForward: false };
  const ts = v / runNatural;
  return { clip: 'Run', timeScale: Math.min(RUN_MAX, Math.max(0.7, ts)), fastForward: ts > RUN_MAX };
}
