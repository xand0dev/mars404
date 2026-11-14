import { beforeEach, describe, expect, it } from 'vitest';
import { resetMission, useMission } from './useMission';
import { mockGrid, mockLimits, mockModel, mockTargets } from '../mocks';
import type { Region, RoutePlan } from '../contracts';

const st = () => useMission.getState();
const plan: RoutePlan = { status: 'ok', path: [], segments: [], legs: [], totals: { time: 1, o2: 1, energy: 1, dose: null, dist: 1 }, warnings: [], requestId: 1 };
const reach = { status: 'incomplete' as const, mask: new Uint8Array(0), returnInS: 60, deficits: [], swap: null, abort: null, warnings: [] };

beforeEach(() => resetMission());

describe('useMission · правила SPEC §6.1 (F0-AC4)', () => {
  it('старт: глобус і mock-дані', () => {
    expect(st().site).toBeNull();
    expect(st().grid).toBe(mockGrid);
    expect(st().position).toEqual(st().base);
  });

  it('toggleTarget: waypoints у порядку вибору, інвалідує plan/reach/selectedSegment', () => {
    st().setPlan(plan);
    st().setReach(reach);
    st().setSelectedSegment(0);
    st().toggleTarget('mock-b');
    st().toggleTarget('mock-a');
    expect(st().selectedTargetIds).toEqual(['mock-b', 'mock-a']);
    expect(st().waypoints).toEqual([mockTargets[1]!.coordinates, mockTargets[0]!.coordinates]);
    expect([st().plan, st().reach, st().selectedSegment]).toEqual([null, null, null]);
    st().toggleTarget('mock-b');
    expect(st().selectedTargetIds).toEqual(['mock-a']);
    st().toggleTarget('nope');
    expect(st().selectedTargetIds).toEqual(['mock-a']);
  });

  it('replaceTarget ставить нову ціль на місце старої', () => {
    st().toggleTarget('mock-a');
    st().toggleTarget('mock-c');
    st().toggleTarget('mock-d');
    st().setPlan(plan);
    st().replaceTarget('mock-c', 'mock-b');
    expect(st().selectedTargetIds).toEqual(['mock-a', 'mock-b', 'mock-d']);
    expect(st().waypoints[1]).toEqual(mockTargets[1]!.coordinates);
    expect(st().plan).toBeNull();
    st().replaceTarget('mock-a', 'mock-b');
    expect(st().selectedTargetIds).toEqual(['mock-a', 'mock-b', 'mock-d']);
  });

  it('setSite скидає прогін і повертає позицію на базу; null — назад до глобуса', () => {
    st().setSite('gale');
    st().toggleTarget('mock-a');
    st().setPlan(plan);
    st().setTime(600);
    st().setPosition([1, 1]);
    st().setSite(null);
    expect(st().site).toBeNull();
    expect([st().waypoints, st().selectedTargetIds, st().plan, st().time]).toEqual([[], [], null, 0]);
    expect(st().position).toEqual(st().base);
  });

  it('setRegionData замінює дані району й модель і скидає прогін', () => {
    st().toggleTarget('mock-a');
    const region = { model: { ...mockModel, speedMps: 2 }, limits: { ...mockLimits, time: 100 }, base: [5, 5] } as unknown as Region;
    const targets = [mockTargets[2]!];
    st().setRegionData({ region, grid: mockGrid, targets });
    expect(st().region).toBe(region);
    expect(st().targets).toBe(targets);
    expect(st().model.speedMps).toBe(2);
    expect(st().limits.time).toBe(100);
    expect(st().budget.time).toBe(100);
    expect(st().base).toEqual([5, 5]);
    expect(st().position).toEqual([5, 5]);
    expect(st().selectedTargetIds).toEqual([]);
  });

  it('photos: старт — [], setRegionData з photos і без них (§6.1)', () => {
    expect(st().photos).toEqual([]);
    const region = { model: mockModel, limits: mockLimits, base: [5, 5] } as unknown as Region;
    const photo = { id: 'p1', coordinates: [10, 10] as const, lonLat: [137.39, -4.82] as const, url: 'photos/p1.jpg', alt: 'Navcam view', sourceUrl: 'https://mars.nasa.gov/', credit: 'NASA/JPL-Caltech', sol: 5051, camera: 'NAV_LEFT_B', locationAccuracy: 'rover-stop' as const, status: 'verified' as const };
    st().setRegionData({ region, grid: mockGrid, targets: mockTargets, photos: [photo] });
    expect(st().photos).toEqual([photo]);
    st().setRegionData({ region, grid: mockGrid, targets: mockTargets });
    expect(st().photos).toEqual([]);
  });

  it('mockModel має emergencyO2G = 360 г зі статусом assumption (§7.8)', () => {
    expect(st().model.emergencyO2G).toBe(360);
    expect(st().model.evidence.emergencyO2G.status).toBe('assumption');
  });

  it('setWaypoints інвалідує план; setLimits скидає reach, але не plan', () => {
    st().setPlan(plan);
    st().setReach(reach);
    st().setLimits({ ...mockLimits, o2: 432 });
    expect(st().plan).toBe(plan);
    expect(st().reach).toBeNull();
    st().setWaypoints([[1, 1]]);
    expect(st().plan).toBeNull();
  });

  it('setTime відкидає NaN і від\'ємні значення', () => {
    st().setTime(NaN);
    expect(st().time).toBe(0);
    st().setTime(-5);
    expect(st().time).toBe(0);
    st().setTime(42);
    expect(st().time).toBe(42);
  });
});
