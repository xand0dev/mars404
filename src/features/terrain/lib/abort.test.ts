import { describe, expect, it } from 'vitest';
import type { ReachabilityResult } from '../../../contracts';
import { planThrough, smallGrid } from './fixtures';
import { noReturnRuns, pointOfNoReturnMarker, readAbort } from './abort';

const grid = smallGrid();
// 5 відрізків: (0,0)→(0,1)→(0,2)→(0,3)→(1,3)→(2,3)
const plan = planThrough(grid, [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3]]);
const seg = (ok: boolean, returnS: number | null = ok ? 100 : null) => ({ returnS, ok });
const reachWith = (abort: unknown): ReachabilityResult =>
  ({ status: 'estimated', mask: new Uint8Array(12), returnInS: 600, deficits: [], swap: null, warnings: [], abort }) as unknown as ReachabilityResult;

describe('F2-AC6 readAbort — reach.abort за SPEC §6 (до contract-PR #26)', () => {
  it('немає reach, немає поля або abort = null → null (маршрут звичайний)', () => {
    expect(readAbort(null)).toBeNull();
    expect(readAbort({ ...reachWith(null) })).toBeNull();
    const noField = reachWith(null) as unknown as Record<string, unknown>;
    delete noField.abort;
    expect(readAbort(noField as unknown as ReachabilityResult)).toBeNull();
  });
  it('валідний AbortPlan повертається як є', () => {
    const abort = { segments: [seg(true), seg(false)], pointOfNoReturnS: 10, emergencyO2G: 360 };
    expect(readAbort(reachWith(abort))).toEqual(abort);
  });
  it('невалідна форма → null, а не вигадані відрізки', () => {
    expect(readAbort(reachWith({ segments: 'x', pointOfNoReturnS: null, emergencyO2G: 360 }))).toBeNull();
    expect(readAbort(reachWith({ segments: [{ ok: 'no' }], pointOfNoReturnS: null, emergencyO2G: 360 }))).toBeNull();
  });
});

describe('F2-AC6 noReturnRuns — які відрізки червоні', () => {
  it('кожен відрізок з ok = false червоний; пізніші ok біля бази розривають серію', () => {
    const abort = { segments: [seg(true), seg(false), seg(false), seg(true), seg(false)], pointOfNoReturnS: 10, emergencyO2G: 360 };
    const r = noReturnRuns(plan, abort);
    expect(r.runs.map((x) => [x.first, x.last])).toEqual([[1, 2], [4, 4]]);
    expect(r.runs[0]?.points).toEqual([plan.segments[1]?.from, plan.segments[1]?.to, plan.segments[2]?.to]);
    expect(r.count).toBe(3);
    expect(r.warning).toBeNull();
  });
  it('усі ok або abort = null → червоного немає', () => {
    expect(noReturnRuns(plan, { segments: plan.segments.map(() => seg(true)), pointOfNoReturnS: null, emergencyO2G: 360 }).runs).toEqual([]);
    expect(noReturnRuns(plan, null).runs).toEqual([]);
    expect(noReturnRuns(null, { segments: [seg(false)], pointOfNoReturnS: 0, emergencyO2G: 360 }).runs).toEqual([]);
  });
  it('довжина abort.segments ≠ plan.segments (застарілий abort) → без червоного й з попередженням', () => {
    const r = noReturnRuns(plan, { segments: [seg(false)], pointOfNoReturnS: 0, emergencyO2G: 360 });
    expect(r.runs).toEqual([]);
    expect(r.warning).toMatch(/abort/i);
  });
});

describe('F2-AC6 pointOfNoReturnMarker — знак точки неповернення на карті (2D і 3D)', () => {
  it('стоїть на початку першого відрізка без повернення; підпис — хвилини від старту', () => {
    const abort = { segments: plan.segments.map((_, i) => seg(i !== 2)), pointOfNoReturnS: 845, emergencyO2G: 56 };
    const m = pointOfNoReturnMarker(plan, abort)!;
    expect(m.xy).toEqual(plan.segments[2]?.from);
    expect(m.label).toBe('Point of no return · 14 min');
  });
  it('усі ok, abort = null або застарілий abort → знака немає', () => {
    expect(pointOfNoReturnMarker(plan, { segments: plan.segments.map(() => seg(true)), pointOfNoReturnS: null, emergencyO2G: 56 })).toBeNull();
    expect(pointOfNoReturnMarker(plan, null)).toBeNull();
    expect(pointOfNoReturnMarker(plan, { segments: [seg(false)], pointOfNoReturnS: 0, emergencyO2G: 56 })).toBeNull();
  });
});
