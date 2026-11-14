import { describe, expect, it } from 'vitest';
import type { XY } from '../contracts';
import { cellCenter, isBlocked, xyToCell } from '../contracts/planning';
import { mockBase, mockGrid, mockModel } from '../mocks';
import { planRoute } from './plan-route';
import { makeTestGrid, testModel } from './test-grids';

const at = (row: number, col: number): XY => cellCenter(mockGrid, row, col);
const request = (waypoints: XY[], overrides: Partial<Parameters<typeof planRoute>[0]> = {}) =>
  planRoute({ grid: mockGrid, model: mockModel, start: mockBase, waypoints, base: mockBase, requestId: 7, ...overrides });

describe('planRoute · F4-AC1', () => {
  const plan = request([at(40, 110), at(20, 70)]);

  it('замкнений маршрут база → цілі в порядку → база', () => {
    expect(plan.status).toBe('ok');
    expect(plan.requestId).toBe(7);
    expect(plan.path[0]).toEqual(mockBase);
    expect(plan.path.at(-1)).toEqual(mockBase);
    expect(plan.legs).toHaveLength(3);
    const legStart = (k: number) => plan.segments[plan.legs[k]!]!.from;
    expect(legStart(1)).toEqual(at(40, 110));
    expect(legStart(2)).toEqual(at(20, 70));
  });

  it('жодної blocked/NoData клітинки, жодного ребра зі схилом > maxSlopeDeg, кути не зрізані', () => {
    for (const p of plan.path) expect(isBlocked(mockGrid, xyToCell(mockGrid, p)!.index, mockModel.maxSlopeDeg)).toBe(false);
    for (const s of plan.segments) {
      expect(Math.abs(s.slope)).toBeLessThanOrEqual(mockModel.maxSlopeDeg);
      const a = xyToCell(mockGrid, s.from)!;
      const b = xyToCell(mockGrid, s.to)!;
      if (a.row !== b.row && a.col !== b.col) {
        expect(isBlocked(mockGrid, a.row * mockGrid.width + b.col, mockModel.maxSlopeDeg)).toBe(false);
        expect(isBlocked(mockGrid, b.row * mockGrid.width + a.col, mockModel.maxSlopeDeg)).toBe(false);
      }
    }
  });

  it('ресурси відрізків і суми; невідома доза → null', () => {
    const sum = (key: 'time' | 'dist' | 'o2' | 'energy') => plan.segments.reduce((s, x) => s + x[key], 0);
    expect(plan.totals.time).toBeCloseTo(sum('time'), 6);
    expect(plan.totals.dist).toBeCloseTo(sum('dist'), 6);
    expect(plan.totals.o2).toBeCloseTo(plan.totals.time * mockModel.o2GPerS, 6);
    expect(plan.totals.energy).toBeCloseTo(plan.totals.dist * mockModel.energyWhPerM, 6);
    expect(plan.totals.dose).toBeNull();
    expect(plan.segments.every((s) => s.dose === null)).toBe(true);
  });

  it('відома доза рахується як time × rate', () => {
    const withDose = request([at(40, 50)], { model: testModel({ doseUSvPerS: 0.01 }) });
    expect(withDose.totals.dose).toBeCloseTo(withDose.totals.time * 0.01, 6);
  });
});

describe('planRoute · F4-AC2 асиметрія ніг', () => {
  it('на схилі нога вгору довша за часом, ніж нога вниз', () => {
    const grid = makeTestGrid({ width: 12, height: 3, elevation: (_r, c) => c * 2 });
    const base = cellCenter(grid, 1, 0);
    const plan = planRoute({ grid, model: testModel(), start: base, waypoints: [cellCenter(grid, 1, 11)], base, requestId: 1 });
    const legTime = (k: number) => plan.segments.slice(plan.legs[k], plan.legs[k + 1]).reduce((s, x) => s + x.time, 0);
    expect(plan.status).toBe('ok');
    expect(legTime(0)).toBeGreaterThan(legTime(1));
  });
});

describe('planRoute · F4-AC3 причини збою', () => {
  it.each([
    ['ціль поза сіткою', [at(40, 50), [-50, 10] as XY], { code: 'out-of-grid', pointIndex: 2 }],
    ['ціль на стіні', [at(50, 90)], { code: 'blocked-point', pointIndex: 1 }],
    ['ціль на NoData', [at(3, 3)], { code: 'blocked-point', pointIndex: 1 }],
  ])('%s', (_name, waypoints, reason) => {
    const plan = request(waypoints);
    expect(plan.status).toBe('no-path');
    expect(plan.reason).toEqual(reason);
    expect(plan.path).toEqual([]);
    expect(plan.segments).toEqual([]);
  });

  it('ціль в ізольованій області → disconnected з номером точки', () => {
    const grid = makeTestGrid({ width: 7, height: 7, blocked: (r, c) => (r === 4 && c >= 4) || (c === 4 && r >= 4) });
    const base = cellCenter(grid, 0, 0);
    const plan = planRoute({ grid, model: testModel(), start: base, waypoints: [cellCenter(grid, 1, 1), cellCenter(grid, 6, 6)], base, requestId: 1 });
    expect(plan.status).toBe('no-path');
    expect(plan.reason).toEqual({ code: 'disconnected', pointIndex: 2 });
  });

  it('некоректна модель → invalid', () => {
    const plan = request([at(40, 50)], { model: testModel({ speedMps: 0 }) });
    expect(plan.status).toBe('invalid');
    expect(plan.reason).toEqual({ code: 'invalid-params' });
  });
});

describe('planRoute · F4-AC5 швидкодія', () => {
  it('сітка 256×256 і 2 цілі — ≤ 2 с', () => {
    const size = 256;
    const grid = makeTestGrid({
      width: size,
      height: size,
      elevation: (r, c) => 12 * Math.sin(c / 26) + 8 * Math.cos(r / 19),
      blocked: (r, c) => c === 128 && r > 10 && r < 245,
    });
    const base = cellCenter(grid, 128, 20);
    const started = performance.now();
    const plan = planRoute({ grid, model: testModel(), start: base, waypoints: [cellCenter(grid, 240, 240), cellCenter(grid, 15, 200)], base, requestId: 1 });
    const elapsedMs = performance.now() - started;

    expect(plan.status).toBe('ok');
    expect(elapsedMs).toBeLessThan(2000);
  });
});
