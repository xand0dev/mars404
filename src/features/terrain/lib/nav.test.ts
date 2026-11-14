import { describe, expect, it } from 'vitest';
import type { PlanningGrid } from '../../../contracts';
import { cellCenter } from '../../../contracts/planning';
import { mockBase, mockGrid } from '../../../mocks';
import { planThrough } from './fixtures';
import { CHECKPOINT_ERR_M, DRIFT, FIX_ERR_M, driftRuns, lineOfSight, planNavigation, samplePath } from './nav';

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
