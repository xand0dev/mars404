// Єдиний shared store (SPEC §6.1). Змінюється лише PR з міткою `contract`.
import { create } from 'zustand';
import type { MissionData, MissionState, Target, XY } from '../contracts';
import { mockBase, mockGrid, mockLimits, mockModel, mockTargets } from '../mocks';

const waypointsFor = (ids: string[], targets: Target[]): XY[] =>
  ids.flatMap((id) => {
    const t = targets.find((x) => x.id === id);
    return t ? [t.coordinates] : [];
  });

/** Стартовий стан: глобус, mock-дані. */
export function initialMission(): MissionData {
  return {
    site: null,
    layers: {},
    targets: mockTargets,
    selectedTargetIds: [],
    selectedSegment: null,
    region: null,
    grid: mockGrid,
    model: mockModel,
    limits: mockLimits,
    waypoints: [],
    plan: null,
    budget: { ...mockLimits },
    reach: null,
    time: 0,
    base: mockBase,
    position: mockBase,
  };
}

/** Що скидає зміна місця або даних району. */
const resetRun = (s: MissionData): Partial<MissionData> => ({
  waypoints: [],
  plan: null,
  reach: null,
  selectedTargetIds: [],
  selectedSegment: null,
  time: 0,
  budget: { ...s.limits },
  position: s.base,
});

/** Інвалідація після зміни цілей. */
const invalidate = { plan: null, reach: null, selectedSegment: null } as const;

export const useMission = create<MissionState>()((set) => ({
  ...initialMission(),

  setSite: (site) => set((s) => ({ site, ...resetRun(s) })),

  toggleLayer: (id) => set((s) => ({ layers: { ...s.layers, [id]: !s.layers[id] } })),

  setRegionData: ({ region, grid, targets }) =>
    set((s) => {
      const next = { ...s, region, grid, targets, model: region.model, limits: region.limits, base: region.base };
      return { region, grid, targets, model: region.model, limits: region.limits, base: region.base, ...resetRun(next) };
    }),

  toggleTarget: (id) =>
    set((s) => {
      if (!s.targets.some((t) => t.id === id)) return {};
      const ids = s.selectedTargetIds.includes(id) ? s.selectedTargetIds.filter((x) => x !== id) : [...s.selectedTargetIds, id];
      return { selectedTargetIds: ids, waypoints: waypointsFor(ids, s.targets), ...invalidate };
    }),

  replaceTarget: (dropId, addId) =>
    set((s) => {
      if (!s.selectedTargetIds.includes(dropId) || s.selectedTargetIds.includes(addId)) return {};
      if (!s.targets.some((t) => t.id === addId)) return {};
      const ids = s.selectedTargetIds.map((x) => (x === dropId ? addId : x));
      return { selectedTargetIds: ids, waypoints: waypointsFor(ids, s.targets), ...invalidate };
    }),

  setWaypoints: (points) => set({ waypoints: points, ...invalidate }),
  setPlan: (plan) => set({ plan, selectedSegment: null }),
  setSelectedSegment: (selectedSegment) => set({ selectedSegment }),
  setBudget: (budget) => set({ budget }),
  setReach: (reach) => set({ reach }),
  setLimits: (limits) => set({ limits, reach: null }),
  setTime: (time) => set({ time: Number.isFinite(time) && time >= 0 ? time : 0 }),
  setPosition: (position) => set({ position }),
}));

/** Для тестів: повернути store у стартовий стан. */
export function resetMission(): void {
  useMission.setState(initialMission());
}
