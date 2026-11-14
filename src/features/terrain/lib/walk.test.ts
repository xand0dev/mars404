import { describe, expect, it } from 'vitest';
import type { RoutePlan, Segment } from '../../../contracts';
import { angleDelta, clock, walkAt, walkTimeline } from './walk';

const seg = (from: [number, number], to: [number, number], time: number, extra: Partial<Segment> = {}): Segment => ({
  from,
  to,
  dist: Math.hypot(to[0] - from[0], to[1] - from[1]),
  slope: 0,
  time,
  o2: time * 0.031,
  energy: 1,
  dose: null,
  ...extra,
});
const plan = { segments: [seg([0, 0], [10, 0], 10), seg([10, 0], [10, 10], 30, { slope: 12 })] } as Pick<RoutePlan, 'segments'>;

describe('демо-прогулянка (walk)', () => {
  it('walkTimeline: початки відрізків і загальний час', () => {
    expect(walkTimeline(plan)).toEqual({ starts: [0, 10], total: 40 });
  });

  it('walkAt: позиція за модельним часом — повільний відрізок триває довше', () => {
    expect(walkAt(plan, 5)!.xy).toEqual([5, 0]);
    const w = walkAt(plan, 25)!;
    expect(w.segment).toBe(1);
    expect(w.xy[0]).toBe(10);
    expect(w.xy[1]).toBeCloseTo(5);
    expect(w.slope).toBe(12);
    expect(w.heading).toBeCloseTo(Math.PI / 2);
    expect(w.dist).toBeCloseTo(15);
    expect(w.o2).toBeCloseTo(25 * 0.031);
  });

  it('walkAt: межі — до старту стоїть на базі, після кінця — done', () => {
    expect(walkAt(plan, -5)!.xy).toEqual([0, 0]);
    const end = walkAt(plan, 999)!;
    expect(end.done).toBe(true);
    expect(end.xy).toEqual([10, 10]);
    expect(walkAt({ segments: [] }, 1)).toBeNull();
  });

  it('angleDelta — найкоротший поворот; clock — мм:сс і г:мм:сс', () => {
    expect(angleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
    expect(clock(75)).toBe('01:15');
    expect(clock(3725)).toBe('1:02:05');
  });
});
