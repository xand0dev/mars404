// Дерева найменшої вартості (Dijkstra) для ореолу F5 (SPEC §7.4).
import { forEachEdge, type EdgeDirection, type WalkGraph } from './edge';
import { MinHeap } from './min-heap';

/**
 * forward: витрати root → клітинка; reverse: витрати клітинка → root (зворотні ребра окремо).
 * Час і відстань накопичуються вздовж шляху найменшої вартості; недосяжне — Infinity.
 */
export interface CostTree {
  root: number;
  direction: EdgeDirection;
  cost: Float64Array;
  time: Float64Array;
  dist: Float64Array;
}

export function buildCostTree(graph: WalkGraph, root: number, direction: EdgeDirection): CostTree {
  const n = graph.grid.width * graph.grid.height;
  const cost = new Float64Array(n).fill(Infinity);
  const time = new Float64Array(n).fill(Infinity);
  const dist = new Float64Array(n).fill(Infinity);
  const tree: CostTree = { root, direction, cost, time, dist };
  if (graph.blocked[root]) return tree;

  const settled = new Uint8Array(n);
  const open = new MinHeap();
  cost[root] = 0;
  time[root] = 0;
  dist[root] = 0;
  open.push(0, 0, root);

  while (open.size > 0) {
    const { cost: cellCost, cell } = open.pop();
    if (settled[cell] || cellCost > cost[cell]!) continue;
    settled[cell] = 1;

    forEachEdge(graph, cell, direction, (neighbor, edge) => {
      if (settled[neighbor]) return;
      const next = cellCost + edge.cost;
      if (next < cost[neighbor]!) {
        cost[neighbor] = next;
        time[neighbor] = time[cell]! + edge.time;
        dist[neighbor] = dist[cell]! + edge.dist;
        open.push(next, next, neighbor);
      }
    });
  }
  return tree;
}
