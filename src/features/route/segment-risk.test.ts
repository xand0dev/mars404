import { describe, expect, it } from 'vitest';
import type { AbortPlan, Annotation, RoutePlan, Segment, XY } from '../../contracts';
import { cellCenter } from '../../contracts/planning';
import { makeTestGrid } from '../../core/test-grids';
import { emptyPlan } from '../../core';
import { formatRisks, segmentRisks } from './segment-risk';

// Пласка сітка 5×5 по 10 м; NoData у клітинці (0, 4).
const grid = makeTestGrid({ width: 5, height: 5 });
grid.elevationsM[4] = NaN;

const segment = (from: XY, to: XY, slope = 0): Segment => ({ from, to, dist: 10, slope, time: 10, o2: 2, energy: 0.5, dose: null });
const planOf = (segments: Segment[]): RoutePlan => ({ ...emptyPlan('ok', 1), segments, legs: [0] });
const mark = (kind: Annotation['kind'], coordinates: XY, radiusM = 15): Annotation => ({
  id: `${kind}-1`, kind, coordinates, radiusM, text: '', createdAt: '2026-11-14T12:00:00Z', origin: 'this-eva',
});
const abortOf = (ok: boolean[]): AbortPlan => ({ segments: ok.map((o) => ({ returnS: o ? 100 : null, ok: o })), pointOfNoReturnS: null, emergencyO2G: 56 });

const far = (col: number): Segment => segment(cellCenter(grid, 4, col), cellCenter(grid, 4, col + 1));

describe('segment-risk · F4-AC7 причини ризику (SPEC §7.14)', () => {
  it('схил ≥ 20° і вгору, і вниз — «slope N°»; менше 20° — без причини', () => {
    const plan = planOf([segment(cellCenter(grid, 4, 0), cellCenter(grid, 4, 1), 27.4), segment(cellCenter(grid, 4, 1), cellCenter(grid, 4, 2), -22), segment(cellCenter(grid, 4, 2), cellCenter(grid, 4, 3), 19.6)]);
    const risks = segmentRisks({ plan, grid, annotations: [], abort: null });
    expect(risks).toEqual([['slope 27°'], ['slope 22°'], []]);
  });

  it('сусідня клітинка без даних (NoData) — «next to NoData»', () => {
    const plan = planOf([segment(cellCenter(grid, 2, 2), cellCenter(grid, 1, 3)), far(0)]);
    expect(segmentRisks({ plan, grid, annotations: [], abort: null })).toEqual([['next to NoData'], []]);
  });

  it('сира NoData (sentinel region.noData) теж рахується', () => {
    const raw = makeTestGrid({ width: 5, height: 5 });
    raw.elevationsM[4] = -9999;
    const plan = planOf([segment(cellCenter(raw, 2, 2), cellCenter(raw, 1, 3))]);
    expect(segmentRisks({ plan, grid: raw, annotations: [], abort: null, noData: -9999 })).toEqual([['next to NoData']]);
  });

  it('заблокована схилом, але з даними клітинка — не NoData', () => {
    const steep = makeTestGrid({ width: 5, height: 5, blocked: (r, c) => r === 0 && c === 4 });
    const plan = planOf([segment(cellCenter(steep, 2, 2), cellCenter(steep, 1, 3))]);
    expect(segmentRisks({ plan, grid: steep, annotations: [], abort: null })).toEqual([[]]);
  });

  it('кінець відрізка в радіусі мітки hazard — «crew mark: hazard»; note і impassable — ні', () => {
    const plan = planOf([far(0), far(2)]);
    const annotations = [mark('hazard', cellCenter(grid, 4, 1), 5), mark('note', cellCenter(grid, 4, 3)), mark('impassable', cellCenter(grid, 0, 0), 5)];
    expect(segmentRisks({ plan, grid, annotations, abort: null })).toEqual([['crew mark: hazard'], []]);
  });

  it('abort.ok = false — «no return with emergency O₂»; довжина abort ≠ плану — ігнорується', () => {
    const plan = planOf([far(0), far(1)]);
    expect(segmentRisks({ plan, grid, annotations: [], abort: abortOf([true, false]) })).toEqual([[], ['no return with emergency O₂']]);
    expect(segmentRisks({ plan, grid, annotations: [], abort: abortOf([false]) })).toEqual([[], []]);
  });

  it('кілька причин — через «, »; без причин — «nominal»', () => {
    expect(formatRisks(['slope 27°', 'crew mark: hazard'])).toBe('slope 27°, crew mark: hazard');
    expect(formatRisks([])).toBe('nominal');
  });
});
