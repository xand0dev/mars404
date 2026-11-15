// Марсохід у маршруті (specs/F4/rover.md): F4-AC8 (їдемо швидше й дешевше за O₂) і F5-AC7 (повернення — пішки, walkback).
import { describe, expect, it } from 'vitest';
import { mockBase, mockGrid, mockLimits, mockModel, mockTargets } from '../mocks';
import { planRoute } from './plan-route';
import { assessReach, buildReachTrees } from './reachability';
import { compareTravelModes, modelFor, riderModel, ROVER, roverEnergyWh } from './rover';

const target = mockTargets[0]!;
const route = (model = mockModel) =>
  planRoute({ grid: mockGrid, model, start: mockBase, waypoints: [target.coordinates], base: mockBase, requestId: 1 });

describe('riderModel', () => {
  it('Given пішохідна модель, When режим Rover, Then швидкість і O₂ ровера, енергія скафандра на метр = 0, решта без змін', () => {
    const rider = riderModel(mockModel);

    expect(rider.speedMps).toBe(ROVER.speedMps);
    expect(rider.o2GPerS).toBe(ROVER.o2GPerSRiding);
    expect(rider.energyWhPerM).toBe(0);
    expect(rider.maxSlopeDeg).toBe(Math.min(mockModel.maxSlopeDeg, ROVER.maxSlopeDeg));
    expect(rider.reserveFraction).toBe(mockModel.reserveFraction);
    expect(rider.emergencyO2G).toBe(mockModel.emergencyO2G);
    expect(rider.evidence.speedMps.status).toBe('assumption');
    expect(rider.evidence.speedMps.id).toBe('rover-lrv-speed');
  });

  it('modelFor: walk — та сама модель, rover — riderModel', () => {
    expect(modelFor('walk', mockModel)).toBe(mockModel);
    expect(modelFor('rover', mockModel).speedMps).toBe(ROVER.speedMps);
  });
});

describe('F4-AC8: маршрут на ровері', () => {
  it('Given та сама ціль, When Rover, Then той самий шлях, час менший у speedRover / speedWalk разів, O₂ менше', () => {
    const walk = route();
    const ride = route(riderModel(mockModel));

    expect(walk.status).toBe('ok');
    expect(ride.status).toBe('ok');
    expect(ride.path).toEqual(walk.path);
    expect(ride.totals.dist).toBeCloseTo(walk.totals.dist, 6);
    expect(ride.totals.time).toBeCloseTo((walk.totals.time * mockModel.speedMps) / ROVER.speedMps, 6);
    expect(ride.totals.o2).toBeLessThan(walk.totals.o2);
    expect(ride.totals.energy).toBe(0);
  });

  it('roverEnergyWh: дистанція × Wh/м ровера; без чинного плану — null', () => {
    const ride = route(riderModel(mockModel));
    expect(roverEnergyWh(ride)).toBeCloseTo(ride.totals.dist * ROVER.energyWhPerM, 6);
    expect(roverEnergyWh(null)).toBeNull();
  });
});

describe('F5-AC7: walkback — повернення з будь-якої точки їзди рахується пішки', () => {
  const reach = (plan: ReturnType<typeof route>, limits = mockLimits) => {
    const trees = buildReachTrees(mockGrid, mockModel, mockBase, mockBase);
    return assessReach(
      { grid: mockGrid, model: mockModel, limits, elapsedS: 0, position: mockBase, base: mockBase, plan, targets: mockTargets, selectedTargetIds: [target.id] },
      trees,
    ).reach;
  };

  it('Given план на ровері, When рахується Abort map, Then час повернення кожного відрізка — пішохідний (як у пішого плану)', () => {
    const walkAbort = reach(route()).abort!;
    const rideAbort = reach(route(riderModel(mockModel))).abort!;

    expect(rideAbort.segments.map((s) => s.returnS)).toEqual(walkAbort.segments.map((s) => s.returnS));
  });

  it('Given мало O₂, When пішки дефіцит, Then на ровері запас більший (менше O₂ на дорогу), але повернення лишається пішим', () => {
    const tight = { ...mockLimits, o2: mockLimits.o2 * 0.6 };
    const walk = reach(route(), tight);
    const ride = reach(route(riderModel(mockModel)), tight);

    expect(ride.returnInS ?? -Infinity).toBeGreaterThan(walk.returnInS ?? -Infinity);
    expect(ride.abort!.segments.map((s) => s.returnS)).toEqual(walk.abort!.segments.map((s) => s.returnS));
  });
});

describe('compareTravelModes: обидва варіанти з одного плану', () => {
  const walkPlan = route();
  const ridePlan = route(riderModel(mockModel));
  const input = { model: mockModel, limits: mockLimits, elapsedS: 0 };

  it('Given пішохідний план, Then підсумки пішки й на ровері збігаються з окремими planRoute', () => {
    const options = compareTravelModes({ ...input, plan: walkPlan, planMode: 'walk' })!;
    expect(options.walk.totals.time).toBeCloseTo(walkPlan.totals.time, 6);
    expect(options.walk.totals.o2).toBeCloseTo(walkPlan.totals.o2, 6);
    expect(options.rover.totals.time).toBeCloseTo(ridePlan.totals.time, 6);
    expect(options.rover.totals.o2).toBeCloseTo(ridePlan.totals.o2, 6);
    expect(options.rover.totals.energy).toBe(0);
    expect(options.rover.roverWh).toBeCloseTo(ridePlan.totals.dist * ROVER.energyWhPerM, 6);
    expect(options.walk.roverWh).toBeNull();
  });

  it('Given план ровера, Then ті самі числа (порядок побудови не важливий)', () => {
    const a = compareTravelModes({ ...input, plan: walkPlan, planMode: 'walk' })!;
    const b = compareTravelModes({ ...input, plan: ridePlan, planMode: 'rover' })!;
    expect(b.walk.totals.time).toBeCloseTo(a.walk.totals.time, 6);
    expect(b.rover.totals.o2).toBeCloseTo(a.rover.totals.o2, 6);
  });

  it('Return in кожного варіанта — як у HUD (estimateReturn), на ровері більше; без плану — null', () => {
    const options = compareTravelModes({ ...input, plan: walkPlan, planMode: 'walk' })!;
    expect(options.rover.returnInS).toBeGreaterThan(options.walk.returnInS);
    expect(compareTravelModes({ ...input, plan: null, planMode: 'walk' })).toBeNull();
  });

  it('Given мало O₂, When пішки дефіцит, Then deficits пішки містять o2', () => {
    const tight = { ...mockLimits, o2: 1 };
    const options = compareTravelModes({ ...input, limits: tight, plan: walkPlan, planMode: 'walk' })!;
    expect(options.walk.deficits).toContain('o2');
  });
});
