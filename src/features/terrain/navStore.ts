// Навігація без GPS: показ на карті й обчислення плану маяків з кешем (одне обчислення на маршрут для панелі й карти).
import { create } from 'zustand';
import type { PlanningGrid, RoutePlan, XY } from '../../contracts';
import { useMission } from '../../store/useMission';
import { driftRuns, planNavigation, type BeaconLink, type NavNow, type NavPlan } from './lib/nav';

export const useNavView = create<{ show: boolean; setShow: (v: boolean) => void }>((set) => ({
  show: true,
  setShow: (show) => set({ show }),
}));

let cache: { plan: RoutePlan; grid: PlanningGrid; base: XY; nav: NavPlan | null } | null = null;

function navFor(grid: PlanningGrid, plan: RoutePlan | null, base: XY | null): NavPlan | null {
  if (!plan || !base || plan.status !== 'ok') return null;
  if (cache && cache.plan === plan && cache.grid === grid && cache.base === base) return cache.nav;
  const nav = planNavigation(grid, plan, base);
  cache = { plan, grid, base, nav };
  return nav;
}

/** План навігації для поточного маршруту (null — маршруту ще немає). */
export function useNavPlan(): NavPlan | null {
  const grid = useMission((s) => s.grid);
  const plan = useMission((s) => s.plan);
  const base = useMission((s) => s.base);
  return navFor(grid, plan, base);
}

/** Те, що малює карта (3D і 2D). */
export function navOverlay(nav: NavPlan | null) {
  if (!nav) return null;
  return {
    beacons: nav.beacons.map((b) => ({ xy: b.xy, label: b.id })),
    drift: driftRuns(nav.points),
    checkpoints: nav.checkpoints,
  };
}

/** Живий зв'язок під час прогулянки: пише сцена (NavLinks) ~5 разів на секунду, читає панель Navigation. */
export const useNavLive = create<{ now: NavNow | null; links: BeaconLink[]; set: (now: NavNow | null, links: BeaconLink[]) => void }>((set) => ({
  now: null,
  links: [],
  set: (now, links) => set({ now, links }),
}));
