import { describe, expect, it } from 'vitest';
import type { RoutePlan, Target, XY } from '../contracts';
import { cellCenter, xyToCell } from '../contracts/planning';
import { mockBase, mockGrid, mockLimits, mockModel, mockTargets } from '../mocks';
import { emptyPlan } from './plan-route';
import { assessReach, buildReachTrees, type ReachInput } from './reachability';
import { makeTestGrid, testModel } from './test-grids';

const mockInput = (overrides: Partial<ReachInput> = {}): ReachInput => ({
  grid: mockGrid,
  model: mockModel,
  limits: mockLimits,
  elapsedS: 0,
  position: mockBase,
  base: mockBase,
  plan: null,
  targets: mockTargets,
  selectedTargetIds: [],
  ...overrides,
});

const countMask = (mask: Uint8Array) => mask.reduce((n, v) => n + v, 0);
const isSubset = (inner: Uint8Array, outer: Uint8Array) => inner.every((v, i) => v === 0 || outer[i] === 1);
const cellOf = (t: Target) => xyToCell(mockGrid, t.coordinates)!.index;

describe('reachability · F5-AC2 маска туди й назад', () => {
  // Пласка сітка, 10 м, 1 м/с: ортогональний крок = рівно 10 с.
  const flat = makeTestGrid({ width: 7, height: 7 });
  const model = testModel({ reserveFraction: 0, o2GPerS: 0.2 });
  const base = cellCenter(flat, 3, 3);
  const input = (time: number): ReachInput => ({
    grid: flat, model, limits: { time, o2: 1e6, energy: 1e6, dose: null }, elapsedS: 0,
    position: base, base, plan: null, targets: [], selectedTargetIds: [],
  });

  it('рівність бюджету приймається, перевищення — ні', () => {
    const { reach } = assessReach(input(20));
    const at = (r: number, c: number) => reach.mask[r * flat.width + c];
    expect(at(3, 3)).toBe(1);
    expect(at(3, 4)).toBe(1);
    expect(at(3, 5)).toBe(0);
    expect(at(4, 4)).toBe(0);
  });

  it('зворотні ребра окремо: на схилі маска = клітинки, де fwd + rev ≤ доступного', () => {
    const ramp = makeTestGrid({ width: 9, height: 1, elevation: (_r, c) => c * 2 });
    const start = cellCenter(ramp, 0, 4);
    const reachInput: ReachInput = { ...input(60), grid: ramp, position: start, base: start };
    const trees = buildReachTrees(ramp, model, start, start);
    const { reach } = assessReach(reachInput, trees);

    for (let c = 0; c < 9; c++) {
      const roundTrip = trees.fromPosition!.time[c]! + trees.toBase!.time[c]!;
      expect(reach.mask[c]).toBe(roundTrip <= 60 ? 1 : 0);
    }
    expect(trees.fromPosition!.time[8]).not.toBeCloseTo(trees.toBase!.time[8]!, 3);
  });

  it('сирий region.noData не входить у маску й не пропускає крізь себе', () => {
    // Sentinel близький до рельєфу, щоб клітинку не відсікав схил, а лише перевірка noData.
    const corridor = makeTestGrid({ width: 5, height: 1, elevation: () => 1 });
    corridor.elevationsM[2] = 0;
    const start = cellCenter(corridor, 0, 0);
    const { reach } = assessReach({ ...input(1e6), grid: corridor, position: start, base: start, noData: 0 });
    expect(Array.from(reach.mask)).toEqual([1, 1, 0, 0, 0]);
  });

  it('blocked і NoData не входять у маску', () => {
    const { reach } = assessReach(mockInput());
    expect(reach.mask[50 * mockGrid.width + 90]).toBe(0);
    expect(reach.mask[3 * mockGrid.width + 3]).toBe(0);
    expect(reach.mask[4 * mockGrid.width + 4]).toBe(0);
  });
});

describe('reachability · F5-AC3 звуження і заміна', () => {
  const siteC = mockTargets[2]!;

  it('«O₂ −40%» і зростання elapsed не розширюють маску', () => {
    const base = assessReach(mockInput()).reach.mask;
    const o2Cut = assessReach(mockInput({ limits: { ...mockLimits, o2: mockLimits.o2 * 0.6 } })).reach.mask;
    const later = assessReach(mockInput({ elapsedS: 900 })).reach.mask;

    expect(countMask(o2Cut)).toBeLessThan(countMask(base));
    expect(isSubset(o2Cut, base)).toBe(true);
    expect(isSubset(later, base)).toBe(true);
  });

  it('ціль в ореолі до сценарію виходить за нього після «O₂ −40%»: попередження і swap за модельною вартістю', () => {
    const selected = { selectedTargetIds: ['mock-c'] };
    expect(assessReach(mockInput(selected)).reach.mask[cellOf(siteC)]).toBe(1);

    const { reach } = assessReach(mockInput({ ...selected, limits: { ...mockLimits, o2: mockLimits.o2 * 0.6 } }));

    expect(reach.mask[cellOf(siteC)]).toBe(0);
    expect(reach.warnings.join(' ')).toMatch(/MOCK Site C is outside the reachable area/);
    expect(reach.swap?.dropId).toBe('mock-c');
    const added = mockTargets.find((t) => t.id === reach.swap?.addId)!;
    expect(reach.mask[cellOf(added)]).toBe(1);
  });

  it('add — найдешевша необрана ціль в ореолі', () => {
    const limits = { ...mockLimits, o2: mockLimits.o2 * 0.6 };
    const trees = buildReachTrees(mockGrid, mockModel, mockBase, mockBase);
    const { reach } = assessReach(mockInput({ selectedTargetIds: ['mock-c'], limits }), trees);
    const roundTripCost = (t: Target) => trees.fromPosition!.cost[cellOf(t)]! + trees.toBase!.cost[cellOf(t)]!;
    const candidates = mockTargets.filter((t) => t.id !== 'mock-c' && reach.mask[cellOf(t)] === 1);
    const cheapest = candidates.reduce((a, b) => (roundTripCost(b) < roundTripCost(a) ? b : a));
    expect(reach.swap?.addId).toBe(cheapest.id);
  });

  it('усе в ореолі й без дефіциту → swap = null', () => {
    const { reach } = assessReach(mockInput({ selectedTargetIds: ['mock-a'] }));
    expect(reach.swap).toBeNull();
  });
});

describe('reachability · returnInS і статуси', () => {
  const okPlan = (totals: Partial<RoutePlan['totals']>): RoutePlan => ({ ...emptyPlan('ok', 1), totals: { ...emptyPlan('ok', 1).totals, ...totals } });

  it('без цілей і в базі → 48 хв, incomplete з текстом про дозу', () => {
    const { reach, budget } = assessReach(mockInput());
    expect(Math.floor(reach.returnInS! / 60)).toBe(48);
    expect(reach.status).toBe('incomplete');
    expect(reach.warnings.join(' ')).toMatch(/return not fully assessed/);
    expect(budget).toEqual({ time: 3600, o2: 720, energy: 600, dose: null });
  });

  it('обрані цілі + чинний план → returnInS з plan.totals (33 хв)', () => {
    const { reach } = assessReach(mockInput({ selectedTargetIds: ['mock-a'], plan: okPlan({ time: 900, o2: 180 }) }));
    expect(Math.floor(reach.returnInS! / 60)).toBe(33);
  });

  it.each([
    ['немає плану', null],
    ['план pending (ціль щойно замінено)', emptyPlan('pending', 2)],
    ['план з помилкою', emptyPlan('no-path', 3, { code: 'blocked-point', pointIndex: 1 })],
  ])('обрані цілі, %s → returnInS = null, а не число', (_name, plan) => {
    const { reach } = assessReach(mockInput({ selectedTargetIds: ['mock-a'], plan }));
    expect(reach.returnInS).toBeNull();
  });

  it('без цілей поза базою → планова витрата = шлях position → base', () => {
    const away: XY = cellCenter(mockGrid, 64, 74);
    const atBase = assessReach(mockInput()).reach.returnInS!;
    const fromAway = assessReach(mockInput({ position: away })).reach.returnInS!;
    expect(fromAway).toBeLessThan(atBase);
  });

  it('F5-AC4: невалідний параметр → invalid, порожня маска, returnInS = null', () => {
    const { reach } = assessReach(mockInput({ model: testModel({ speedMps: 0 }) }));
    expect(reach.status).toBe('invalid');
    expect(countMask(reach.mask)).toBe(0);
    expect(reach.mask).toHaveLength(mockGrid.width * mockGrid.height);
    expect(reach.returnInS).toBeNull();
    expect(reach.swap).toBeNull();
    expect(reach.warnings.join(' ')).toMatch(/speedMps/);
  });
});
