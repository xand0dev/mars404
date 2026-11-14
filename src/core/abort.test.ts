import { describe, expect, it } from 'vitest';
import type { Resources, RoutePlan, Segment } from '../contracts';
import { cellCenter } from '../contracts/planning';
import { mockLimits, mockModel } from '../mocks';
import { assessAbort, type AbortInput } from './abort';
import { computeBudget, reserveOf } from './budget';
import type { CostTree } from './cost-tree';
import { buildReachTrees } from './reachability';
import { planRoute } from './plan-route';
import { makeTestGrid, testModel } from './test-grids';

// Еталон SPEC §7.8: mock-модель, ліміти §7.4, t = 0, emergencyO2G = 360 г (MOCK, «assumption»).
const EMERGENCY_O2_G = 360;
const line = makeTestGrid({ width: 4, height: 1 });

/** Дерево «до бази» з заданим часом шляху назад для кожної клітинки рядка; Infinity — шляху немає. */
const backTree = (times: number[]): CostTree => ({
  root: 0,
  direction: 'reverse',
  cost: Float64Array.from(times),
  time: Float64Array.from(times),
  dist: Float64Array.from(times, (t) => (Number.isFinite(t) ? t * mockModel.speedMps : Infinity)),
});

/** Відрізок, що закінчується в клітинці `col`, з витратою O₂ і часом. */
const segmentTo = (col: number, o2: number, time = o2 / mockModel.o2GPerS): Segment => ({
  from: cellCenter(line, 0, Math.max(0, col - 1)),
  to: cellCenter(line, 0, col),
  dist: time * mockModel.speedMps,
  slope: 0,
  time,
  o2,
  energy: 0,
  dose: null,
});

const okPlan = (segments: Segment[]): RoutePlan => ({
  status: 'ok', path: [], segments, legs: [0],
  totals: { time: 0, o2: 0, energy: 0, dose: null, dist: 0 }, warnings: [], requestId: 1,
});

const abortInput = (plan: RoutePlan | null, toBase: CostTree, limits: Resources = mockLimits): AbortInput => ({
  plan,
  grid: line,
  toBase,
  budget: computeBudget(limits, mockModel, 0),
  reserve: reserveOf(limits, mockModel),
  model: mockModel,
  emergencyO2G: EMERGENCY_O2_G,
});

describe('abort · F5-AC5 еталон SPEC §7.8', () => {
  it('used.o2 = 100 г, back.time = 500 с → back.o2 = 100 ≤ 260 → ok', () => {
    const abort = assessAbort(abortInput(okPlan([segmentTo(1, 100)]), backTree([0, 500, 0, 0])))!;
    expect(abort.segments).toEqual([{ returnS: 500, ok: true }]);
    expect(abort.pointOfNoReturnS).toBeNull();
    expect(abort.emergencyO2G).toBe(EMERGENCY_O2_G);
  });

  it('той самий відрізок з back.time = 1400 с → 280 > 260 → не ok', () => {
    const abort = assessAbort(abortInput(okPlan([segmentTo(1, 100)]), backTree([0, 1400, 0, 0])))!;
    expect(abort.segments).toEqual([{ returnS: 1400, ok: false }]);
    expect(abort.pointOfNoReturnS).toBe(0);
  });

  it('рівність допустима: back.o2 = 260 г рівно → ok', () => {
    const abort = assessAbort(abortInput(okPlan([segmentTo(1, 100)]), backTree([0, 1300, 0, 0])))!;
    expect(abort.segments[0]!.ok).toBe(true);
  });
});

describe('abort · F5-AC5 точка неповернення', () => {
  it('= сума часу відрізків до першого не-ok; пізніший відрізок біля бази знову ok', () => {
    // used.o2: 50 → 150 → 200; back.o2: 40 → 220 (> 720 − 150 − 360 = 210) → 0.
    const plan = okPlan([segmentTo(1, 50), segmentTo(2, 100), segmentTo(3, 50)]);
    const abort = assessAbort(abortInput(plan, backTree([0, 200, 1100, 0])))!;
    expect(abort.segments.map((s) => s.ok)).toEqual([true, false, true]);
    expect(abort.pointOfNoReturnS).toBe(250);
  });

  it('немає шляху назад → ok = false, returnS = null', () => {
    const abort = assessAbort(abortInput(okPlan([segmentTo(1, 10)]), backTree([0, Infinity, 0, 0])))!;
    expect(abort.segments).toEqual([{ returnS: null, ok: false }]);
    expect(abort.pointOfNoReturnS).toBe(0);
  });

  it('час і енергія — з резервом §7.4: шлях назад довший за доступний час → не ok', () => {
    // Доступно часу: 3600 − 720 = 2880 с; O₂ малий, щоб різав саме час.
    const model = testModel({ o2GPerS: 0.0001 });
    const input = { ...abortInput(okPlan([segmentTo(1, 0.01, 1000)]), backTree([0, 1881, 0, 0])), model };
    expect(assessAbort(input)!.segments[0]!.ok).toBe(false);
  });

  it('невідома доза не блокує відрізок', () => {
    const abort = assessAbort(abortInput(okPlan([segmentTo(1, 100)]), backTree([0, 500, 0, 0])))!;
    expect(abort.segments[0]!.ok).toBe(true);
  });
});

describe('abort · F5-AC5 без чинного плану', () => {
  it.each([null, { ...okPlan([]), status: 'pending' as const }, { ...okPlan([]), status: 'no-path' as const }])('план %# → null', (plan) => {
    expect(assessAbort(abortInput(plan, backTree([0, 0, 0, 0])))).toBeNull();
  });

  it.each([NaN, -1, Infinity])('emergencyO2G = %s → null', (emergencyO2G) => {
    expect(assessAbort({ ...abortInput(okPlan([segmentTo(1, 10)]), backTree([0, 0, 0, 0])), emergencyO2G })).toBeNull();
  });
});

describe('abort · F5-AC5 «O₂ −40%» не покращує жоден відрізок', () => {
  // Справжній план на пласкій сітці: база → дальня ціль → база, дерево назад — те саме, що в ореолі.
  const grid = makeTestGrid({ width: 40, height: 3 });
  const base = cellCenter(grid, 1, 0);
  const plan = planRoute({ grid, model: mockModel, start: base, waypoints: [cellCenter(grid, 1, 39)], base, requestId: 1 });
  const { toBase } = buildReachTrees(grid, mockModel, base, base);
  const run = (limits: Resources) => assessAbort({ ...abortInput(plan, toBase!, limits), grid })!;

  it('кожен відрізок ok під «O₂ −40%» був ok і без нього; точка неповернення не пізніша', () => {
    const normal = run(mockLimits);
    const reduced = run({ ...mockLimits, o2: mockLimits.o2 * 0.6 });

    expect(plan.status).toBe('ok');
    expect(reduced.segments).toHaveLength(plan.segments.length);
    reduced.segments.forEach((s, i) => {
      if (s.ok) expect(normal.segments[i]!.ok).toBe(true);
    });
    expect(reduced.segments.some((s) => !s.ok)).toBe(true);
    expect(reduced.pointOfNoReturnS!).toBeLessThanOrEqual(normal.pointOfNoReturnS ?? Infinity);
  });
});
