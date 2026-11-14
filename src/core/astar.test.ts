import { describe, expect, it } from 'vitest';
import { cellIndex } from '../contracts/planning';
import { MOCK_CELLS, mockGrid, mockModel } from '../mocks';
import { findPath } from './astar';
import { createWalkGraph, edgeBetween } from './edge';
import { makeTestGrid, testModel } from './test-grids';

const pathCost = (grid: Parameters<typeof edgeBetween>[0], path: number[]) =>
  path.slice(1).reduce((sum, to, k) => sum + edgeBetween(grid, mockModel, path[k]!, to)!.cost, 0);

describe('A* (SPEC §7.3)', () => {
  it('обходить стіну через прохід і не ступає на blocked', () => {
    const graph = createWalkGraph(mockGrid, mockModel);
    const start = cellIndex(mockGrid, 60, 80);
    const goal = cellIndex(mockGrid, 60, 100);
    const path = findPath(graph, start, goal)!;

    expect(path[0]).toBe(start);
    expect(path.at(-1)).toBe(goal);
    expect(path.some((i) => i % mockGrid.width === MOCK_CELLS.wallCol)).toBe(true);
    expect(path.every((i) => graph.blocked[i] === 0)).toBe(true);
  });

  it('однакові входи → однаковий шлях', () => {
    const graph = createWalkGraph(mockGrid, mockModel);
    const a = findPath(graph, cellIndex(mockGrid, 64, 64), cellIndex(mockGrid, 20, 70));
    const b = findPath(graph, cellIndex(mockGrid, 64, 64), cellIndex(mockGrid, 20, 70));
    expect(a).toEqual(b);
  });

  it('F4-AC2: короткий крутий підйом програє довшому пологому обходу за модельною вартістю', () => {
    // Хребет у рядках 4–6: висота росте на 4 м на клітинку до колонки 5 (21.8° < 25°, але дорого).
    const ridge = (r: number, c: number) => (r >= 4 && r <= 6 ? 4 * Math.max(0, Math.min(c, 10 - c)) : 0);
    const grid = makeTestGrid({ width: 11, height: 11, elevation: ridge });
    const graph = createWalkGraph(grid, testModel());
    const start = cellIndex(grid, 5, 0);
    const goal = cellIndex(grid, 5, 10);
    const straight = Array.from({ length: 11 }, (_, c) => cellIndex(grid, 5, c));

    const path = findPath(graph, start, goal)!;

    expect(path).not.toContain(cellIndex(grid, 5, 5));
    expect(pathCost(grid, path)).toBeLessThan(pathCost(grid, straight));
  });

  it('без шляху в ізольовану клітинку → null', () => {
    const grid = makeTestGrid({ width: 5, height: 5, blocked: (r, c) => (r === 1 || r === 3 || c === 1 || c === 3) && !(r === 2 && c === 2) && r >= 1 && r <= 3 && c >= 1 && c <= 3 });
    const graph = createWalkGraph(grid, testModel());
    expect(findPath(graph, cellIndex(grid, 0, 0), cellIndex(grid, 2, 2))).toBeNull();
  });
});
