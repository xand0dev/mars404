import { describe, expect, it } from 'vitest';
import { mockBase, mockGrid, mockLimits, mockLimitsEvidence, mockModel, mockTargets, REFERENCE_EDGE, REFERENCE_PLAN_TOTALS, REFERENCE_RETURN_MIN } from './index';
import { isBlocked, xyToCell } from '../contracts/planning';

/** BFS по 4 сусідах: зв'язність прохідних клітинок. */
function reachableFrom(start: number): Set<number> {
  const { width, height } = mockGrid;
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const i = queue.shift()!;
    const r = Math.floor(i / width);
    const c = i % width;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= height || cc >= width) continue;
      const j = rr * width + cc;
      if (!seen.has(j) && !isBlocked(mockGrid, j, mockModel.maxSlopeDeg)) {
        seen.add(j);
        queue.push(j);
      }
    }
  }
  return seen;
}

describe('mocks', () => {
  it('база й усі цілі на прохідних зв\'язних клітинках', () => {
    const base = xyToCell(mockGrid, mockBase)!;
    expect(isBlocked(mockGrid, base.index, mockModel.maxSlopeDeg)).toBe(false);
    const area = reachableFrom(base.index);
    for (const t of mockTargets) {
      const cell = xyToCell(mockGrid, t.coordinates);
      expect(cell, t.id).not.toBeNull();
      expect(area.has(cell!.index), t.id).toBe(true);
      expect(t.status).toBe('mock');
    }
  });

  it('еталонне ребро SPEC §7.3 виходить з mockModel', () => {
    const edge = (dz: number) => {
      const horiz = mockGrid.metersPerPixel;
      const dist = Math.hypot(horiz, dz);
      const tan = dz / horiz;
      const time = (dist / mockModel.speedMps) * (1 + mockModel.uphillFactor * Math.max(0, tan) + mockModel.downhillFactor * Math.max(0, -tan));
      return { dist, slopeDeg: (Math.atan2(dz, horiz) * 180) / Math.PI, time, cost: time * (1 + mockModel.hazardWeight * 0.1) };
    };
    for (const [dz, ref] of [[1, REFERENCE_EDGE.up], [-1, REFERENCE_EDGE.down]] as const) {
      const e = edge(dz);
      expect(e.dist).toBeCloseTo(ref.dist, 2);
      expect(e.slopeDeg).toBeCloseTo(ref.slopeDeg, 2);
      expect(e.time).toBeCloseTo(ref.time, 2);
      expect(e.cost).toBeCloseTo(ref.cost, 2);
    }
  });

  it('еталонні числа «Return in N» SPEC §7.4 сходяться з mockLimits/mockModel', () => {
    const r = mockModel.reserveFraction;
    const n = (limits: typeof mockLimits, plan: { time: number; o2: number }, t: number) => {
      const time = limits.time - t - r * limits.time - plan.time;
      const o2 = (limits.o2 - t * mockModel.o2GPerS - r * limits.o2 - plan.o2) / mockModel.o2GPerS;
      return Math.floor(Math.min(time, o2) / 60);
    };
    expect(n(mockLimits, { time: 0, o2: 0 }, 0)).toBe(REFERENCE_RETURN_MIN.noPlan);
    expect(n(mockLimits, REFERENCE_PLAN_TOTALS, 0)).toBe(REFERENCE_RETURN_MIN.plan);
    expect(n(mockLimits, REFERENCE_PLAN_TOTALS, 600)).toBe(REFERENCE_RETURN_MIN.planAfter600s);
    expect(n({ ...mockLimits, o2: 432 }, REFERENCE_PLAN_TOTALS, 0)).toBe(REFERENCE_RETURN_MIN.o2Minus40);
    expect(mockLimits.dose).toBeNull();
    expect(mockModel.doseUSvPerS).toBeNull();
  });

  it('кожен ліміт має джерело (limitsEvidence, §7.6)', () => {
    expect(Object.keys(mockLimitsEvidence).sort()).toEqual(Object.keys(mockLimits).sort());
  });

  it('кожен коефіцієнт моделі має джерело', () => {
    for (const s of Object.values(mockModel.evidence)) expect(['mock', 'assumption']).toContain(s.status);
    expect(Object.keys(mockModel.evidence)).toContain('emergencyO2G');
  });
});
