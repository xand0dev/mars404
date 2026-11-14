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

/** Швидкості відтворення: модельних секунд за реальну. */
export const WALK_SPEEDS = [10, 30, 60, 120] as const;
