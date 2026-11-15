import { describe, expect, it } from 'vitest';
import type { RoutePlan, Segment } from '../../../contracts';
import { angleDelta, clock, DEFAULT_WALK_SPEED, gaitFor, indexPath, pointAt, RUN_CYCLE_M, slicePath, smoothPath, walkAt, walkTimeline, WALK_CYCLE_M, WALK_SPEEDS } from './walk';

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

  it('швидкості: є реальний час 1×, за замовчуванням 5×', () => {
    expect(WALK_SPEEDS[0]).toBe(1);
    expect(WALK_SPEEDS).toContain(DEFAULT_WALK_SPEED);
  });

  it('smoothPath: кінці на місці, кут згладжено, усі точки в межах ламаної', () => {
    const raw: [number, number][] = [[0, 0], [10, 0], [10, 10]];
    const sm = smoothPath(raw);
    expect(sm[0]).toEqual([0, 0]);
    expect(sm[sm.length - 1]).toEqual([10, 10]);
    expect(sm).not.toContainEqual([10, 0]);
    for (const [x, y] of sm) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(10);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(10);
    }
    expect(smoothPath([[0, 0], [5, 5]])).toEqual([[0, 0], [5, 5]]);
  });

  it('pointAt / slicePath: точка за відстанню і шматок шляху з кроком', () => {
    const p = indexPath([[0, 0], [10, 0], [10, 10]]);
    expect(p.length).toBe(20);
    expect(pointAt(p, 5)).toEqual([5, 0]);
    expect(pointAt(p, 15)).toEqual([10, 5]);
    expect(pointAt(p, -3)).toEqual([0, 0]);
    expect(pointAt(p, 99)).toEqual([10, 10]);
    const s = slicePath(p, 5, 15, 2);
    expect(s[0]).toEqual([5, 0]);
    expect(s[s.length - 1]).toEqual([10, 5]);
    expect(s.length).toBe(6);
    expect(slicePath(p, 7, 7)).toEqual([]);
  });

  it('gaitFor: стоїть — Idle; темп кроку пропорційний швидкості; вище бігу — fast-forward', () => {
    const walkDur = 1.23;
    const runDur = 0.73;
    expect(gaitFor(0, walkDur, runDur).clip).toBe('Idle');
    const natural = WALK_CYCLE_M / walkDur;
    const g1 = gaitFor(natural, walkDur, runDur);
    expect(g1.clip).toBe('Walk');
    expect(g1.timeScale).toBeCloseTo(1, 5);
    expect(gaitFor(natural * 1.5, walkDur, runDur).timeScale).toBeCloseTo(1.5, 5);
    const run = gaitFor((RUN_CYCLE_M / runDur) * 1.2, walkDur, runDur);
    expect(run.clip).toBe('Run');
    expect(run.fastForward).toBe(false);
    const ff = gaitFor(50, walkDur, runDur);
    expect(ff.clip).toBe('Run');
    expect(ff.timeScale).toBeLessThanOrEqual(1.6);
    expect(ff.fastForward).toBe(true);
    expect(gaitFor(Number.NaN, walkDur, runDur).clip).toBe('Idle');
  });
});
