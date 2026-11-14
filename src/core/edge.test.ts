import { describe, expect, it } from 'vitest';
import { cellIndex } from '../contracts/planning';
import { REFERENCE_EDGE } from '../mocks';
import { createWalkGraph, edgeBetween, forEachEdge } from './edge';
import { makeTestGrid, testModel } from './test-grids';

describe('edge · еталонне ребро (SPEC §7.3)', () => {
  const grid = makeTestGrid({ width: 2, height: 1, elevation: (_r, c) => c });
  const model = testModel();

  it('підйом dz = +1 м: dist, slope, time, cost', () => {
    const e = edgeBetween(grid, model, 0, 1);
    expect(e).not.toBeNull();
    expect(e!.dist).toBeCloseTo(REFERENCE_EDGE.up.dist, 2);
    expect(e!.slopeDeg).toBeCloseTo(REFERENCE_EDGE.up.slopeDeg, 2);
    expect(e!.time).toBeCloseTo(REFERENCE_EDGE.up.time, 2);
    expect(e!.cost).toBeCloseTo(REFERENCE_EDGE.up.cost, 2);
  });

  it('спуск dz = −1 м дешевший за підйом (асиметрія)', () => {
    const e = edgeBetween(grid, model, 1, 0);
    expect(e!.slopeDeg).toBeCloseTo(REFERENCE_EDGE.down.slopeDeg, 2);
    expect(e!.time).toBeCloseTo(REFERENCE_EDGE.down.time, 2);
    expect(e!.cost).toBeCloseTo(REFERENCE_EDGE.down.cost, 2);
  });

  it('ребро зі схилом > maxSlopeDeg заборонене в обидва боки', () => {
    const steep = makeTestGrid({ width: 2, height: 1, elevation: (_r, c) => c * 6 });
    expect(edgeBetween(steep, model, 0, 1)).toBeNull();
    expect(edgeBetween(steep, model, 1, 0)).toBeNull();
  });
});

describe('edge · сусіди', () => {
  const model = testModel();

  const neighborsOf = (grid: ReturnType<typeof makeTestGrid>, row: number, col: number) => {
    const graph = createWalkGraph(grid, model);
    const found: number[] = [];
    forEachEdge(graph, cellIndex(grid, row, col), 'forward', (to) => found.push(to));
    return found;
  };

  it('8 сусідів у фіксованому порядку N, NE, E, SE, S, SW, W, NW', () => {
    const grid = makeTestGrid({ width: 3, height: 3 });
    const at = (r: number, c: number) => cellIndex(grid, r, c);
    expect(neighborsOf(grid, 1, 1)).toEqual([at(0, 1), at(0, 2), at(1, 2), at(2, 2), at(2, 1), at(2, 0), at(1, 0), at(0, 0)]);
  });

  it('діагональ не зрізає заблокований кут', () => {
    const grid = makeTestGrid({ width: 3, height: 3, blocked: (r, c) => r === 0 && c === 1 });
    const at = (r: number, c: number) => cellIndex(grid, r, c);
    const found = neighborsOf(grid, 1, 1);
    expect(found).not.toContain(at(0, 1));
    expect(found).not.toContain(at(0, 0));
    expect(found).not.toContain(at(0, 2));
  });

  it('сирий region.noData (sentinel замість NaN) теж заблокований', () => {
    const grid = makeTestGrid({ width: 3, height: 1 });
    grid.elevationsM[2] = -9999;
    const graph = createWalkGraph(grid, model, -9999);
    expect(graph.blocked[2]).toBe(1);
    const found: number[] = [];
    forEachEdge(graph, 1, 'forward', (to) => found.push(to));
    expect(found).toEqual([0]);
  });

  it('NoData (NaN при walkable = 1) не стає сусідом', () => {
    const grid = makeTestGrid({ width: 3, height: 1 });
    grid.elevationsM[2] = NaN;
    expect(neighborsOf(grid, 0, 1)).toEqual([0]);
  });
});
