import { describe, expect, it } from 'vitest';
import { cellIndex } from '../contracts/planning';
import { mockGrid, mockModel } from '../mocks';
import { findPath } from './astar';
import { buildCostTree } from './cost-tree';
import { createWalkGraph, edgeBetween } from './edge';
import { makeTestGrid, testModel } from './test-grids';

describe('дерева найменшої вартості (SPEC §7.4, ореол)', () => {
  it('пряме дерево: вартість до клітинки = вартість A*', () => {
    const graph = createWalkGraph(mockGrid, mockModel);
    const root = cellIndex(mockGrid, 64, 64);
    const goal = cellIndex(mockGrid, 60, 110);
    const tree = buildCostTree(graph, root, 'forward');
    const path = findPath(graph, root, goal)!;
    const astarCost = path.slice(1).reduce((s, to, k) => s + edgeBetween(mockGrid, mockModel, path[k]!, to)!.cost, 0);

    expect(tree.cost[root]).toBe(0);
    expect(tree.cost[goal]).toBeCloseTo(astarCost, 6);
  });

  it('зворотне дерево рахує ребра у бік кореня: підйом до бази дорожчий за спуск від неї', () => {
    const grid = makeTestGrid({ width: 2, height: 1, elevation: (_r, c) => c });
    const graph = createWalkGraph(grid, testModel());
    const toHigh = buildCostTree(graph, 1, 'reverse');
    const fromHigh = buildCostTree(graph, 1, 'forward');

    expect(toHigh.time[0]).toBeCloseTo(12.06, 2);
    expect(fromHigh.time[0]).toBeCloseTo(10.552, 2);
    expect(toHigh.dist[0]).toBeCloseTo(10.05, 2);
  });

  it('недосяжні та заблоковані клітинки — Infinity, не 0', () => {
    const grid = makeTestGrid({ width: 3, height: 1, blocked: (_r, c) => c === 1 });
    const tree = buildCostTree(createWalkGraph(grid, testModel()), 0, 'forward');
    expect(tree.cost[1]).toBe(Infinity);
    expect(tree.cost[2]).toBe(Infinity);
  });
});
