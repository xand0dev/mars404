import { describe, expect, it } from 'vitest';
import type { PlanningGrid, XY } from '../../../contracts';
import { cellCenter } from '../../../contracts/planning';
import { mockBase, mockGrid } from '../../../mocks';
import { planThrough } from './fixtures';
import { BEACON_RANGE_M, CHECKPOINT_ERR_M, DRIFT, FIX_ERR_M, beaconLinks, driftRuns, lineOfSight, navNow, planNavigation, samplePath, type Beacon, type NavPlan } from './nav';

// Навігація без GPS: маяки (пряма видимість, дальність) + інерціалка з похибкою, що росте; контрольні точки.
const flat = (): PlanningGrid => ({ ...mockGrid, elevationsM: new Float32Array(mockGrid.elevationsM.length).fill(0) });

describe('lineOfSight', () => {
  it('рівнина — видно; хребет посередині — не видно; NoData на шляху — не видно', () => {
    const g = flat();
    const a = cellCenter(g, 64, 20);
    const b = cellCenter(g, 64, 60);
    expect(lineOfSight(g, a, 2, b, 1.7)).toBe(true);
    for (let r = 0; r < g.height; r++) g.elevationsM[r * g.width + 40] = 50;
    expect(lineOfSight(g, a, 2, b, 1.7)).toBe(false);
    const n = flat();
    n.elevationsM[64 * n.width + 40] = NaN;
    expect(lineOfSight(n, a, 2, b, 1.7)).toBe(false);
  });
});

describe('samplePath', () => {
  it('рівномірні точки з кроком, перша й остання — кінці шляху', () => {
    const pts = samplePath([[0, 0], [100, 0]], 20);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[pts.length - 1]).toEqual([100, 0]);
    expect(pts).toHaveLength(6);
  });
});

describe('planNavigation', () => {
  it('немає плану → null', () => {
    expect(planNavigation(mockGrid, { ...planThrough(mockGrid, [[64, 64], [64, 70]]), status: 'no-path' }, mockBase)).toBeNull();
  });

  it('база — завжди маяк; додаткові маяки на рівних місцях на відстані один від одного', () => {
    const g = flat();
    const nav = planNavigation(g, planThrough(g, [[64, 64], [64, 90], [80, 100]]), mockBase)!;
    expect(nav.beacons[0]).toMatchObject({ id: 'Base', isBase: true });
    expect(nav.beacons.length).toBeGreaterThan(1);
    for (const b of nav.beacons.slice(1)) expect(b.slopeDeg).toBeLessThanOrEqual(8);
    expect(nav.fixShare).toBeGreaterThan(0.5);
  });

  it('без маяків інерціальна похибка росте на DRIFT × відстань і скидається на контрольній точці', () => {
    const g = flat();
    const nav = planNavigation(g, planThrough(g, [[64, 0], [64, 127]]), [-5000, -5000], 0)!;
    expect(nav.fixShare).toBe(0);
    const second = nav.points[1]!;
    expect(second.errM).toBeCloseTo(FIX_ERR_M + DRIFT * 20, 5);
    expect(nav.checkpoints.length).toBeGreaterThan(0);
    expect(nav.maxErrM).toBeLessThan(CHECKPOINT_ERR_M + DRIFT * 20 + 1e-6);
    expect(driftRuns(nav.points).length).toBe(1);
  });
});

describe('beaconLinks (живий зв\'язок під час прогулянки)', () => {
  const beacon = (id: string, xy: XY): Beacon => ({ id, xy, elevationM: 0, slopeDeg: 0, isBase: id === 'Base' });
  it('рівнина поруч — signal; хребет між — blocked; далі за дальність — far', () => {
    const g = flat();
    const me = cellCenter(g, 64, 60);
    const near = beacon('Base', cellCenter(g, 64, 20));
    const behindRidge = beacon('B1', cellCenter(g, 30, 60));
    for (let c = 0; c < g.width; c++) g.elevationsM[45 * g.width + c] = 80;
    const far = beacon('B2', [me[0] + BEACON_RANGE_M + 50, me[1]]);
    const links = beaconLinks(g, [near, behindRidge, far], me);
    expect(links.map((l) => l.state)).toEqual(['link', 'blocked', 'far']);
    expect(links[0]?.isBase).toBe(true);
    expect(links[2]?.distM).toBeGreaterThan(BEACON_RANGE_M);
  });
});

describe('navNow (стан «зараз» для чипа й панелі)', () => {
  const nav: NavPlan = {
    beacons: [],
    points: [
      { xy: [0, 0], distM: 0, visible: 3, errM: FIX_ERR_M, fix: true },
      { xy: [100, 0], distM: 100, visible: 1, errM: 3, fix: false },
      { xy: [300, 0], distM: 300, visible: 1, errM: 7, fix: false },
    ],
    checkpoints: [[400, 0]],
    checkpointDistM: [400],
    fixShare: 0.2,
    maxErrM: 7,
    sandShare: 0,
  };
  const links = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `B${i}`, xy: [0, 0] as [number, number], isBase: false, distM: 10, state: 'link' as const }));
  it('≥ 3 маяки на зв\'язку — FIX з похибкою FIX_ERR_M', () => {
    expect(navNow(nav, links(3), 250)).toMatchObject({ links: 3, fix: true, errM: FIX_ERR_M });
  });
  it('менше 3 — інерціалка: похибка з профілю маршруту, відстань до контрольної точки', () => {
    const s = navNow(nav, links(1), 320);
    expect(s.fix).toBe(false);
    expect(s.errM).toBe(7);
    expect(s.nextCheckpointM).toBeCloseTo(80);
  });
  it('після останньої контрольної точки — nextCheckpointM = null', () => {
    expect(navNow(nav, links(0), 450).nextCheckpointM).toBeNull();
  });
});

describe('planNavigation — відстані вздовж маршруту', () => {
  it('points[].distM зростає від 0; checkpointDistM узгоджені з checkpoints', () => {
    const g = flat();
    const plan = planThrough(g, [[64, 10], [64, 120]]);
    const nav = planNavigation(g, plan, cellCenter(g, 64, 10))!;
    expect(nav.points[0]?.distM).toBe(0);
    for (let i = 1; i < nav.points.length; i++) expect(nav.points[i]!.distM).toBeGreaterThanOrEqual(nav.points[i - 1]!.distM);
    expect(nav.checkpointDistM).toHaveLength(nav.checkpoints.length);
  });
});
