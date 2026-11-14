// Маркер вибраного відрізка (F2-AC3): відрізок F4 — один крок сітки, тож поруч помітна позначка з підписом.
import type { RoutePlan, XY } from '../../../contracts';

export interface SegmentMarker {
  mid: XY;
  /** 1-based, як у таблиці відрізків F4 */
  label: string;
}

export function segmentMarker(plan: RoutePlan | null, i: number | null): SegmentMarker | null {
  if (!plan || i === null) return null;
  const s = plan.segments[i];
  if (!s) return null;
  // Нога — остання з legs, що починається не пізніше за i.
  const leg = plan.legs.reduce((acc, start, k) => (start <= i ? k : acc), 0);
  return { mid: [(s.from[0] + s.to[0]) / 2, (s.from[1] + s.to[1]) / 2], label: `Segment ${i + 1} · leg ${leg + 1}` };
}
