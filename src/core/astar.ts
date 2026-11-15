// A* за модельною вартістю (SPEC §7.3). Евристика допустима: cost ≥ time ≥ dist / speed ≥ horiz / speed.
import { forEachEdge, type WalkGraph } from './edge';
import { MinHeap } from './min-heap';

/** Шлях як індекси клітинок start…goal; null — шляху немає або кінцева точка заблокована. */
export function findPath(graph: WalkGraph, start: number, goal: number): number[] | null {
  const { grid, model, blocked } = graph;
  if (blocked[start] || blocked[goal]) return null;

  const { width, metersPerPixel } = grid;
  const goalRow = Math.floor(goal / width);
  const goalCol = goal % width;
  const heuristic = (cell: number) =>
    (Math.hypot(Math.floor(cell / width) - goalRow, (cell % width) - goalCol) * metersPerPixel) / model.speedMps;

  const n = width * grid.height;
  const bestCost = new Float64Array(n).fill(Infinity);
  const cameFrom = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open = new MinHeap();
  bestCost[start] = 0;
  open.push(heuristic(start), 0, start);

  while (open.size > 0) {
    const { cost, cell } = open.pop();
    if (closed[cell] || cost > bestCost[cell]!) continue;
    if (cell === goal) return reconstructPath(cameFrom, goal);
    closed[cell] = 1;

    forEachEdge(graph, cell, 'forward', (neighbor, edge) => {
      if (closed[neighbor]) return;
      const next = cost + edge.cost;
      if (next < bestCost[neighbor]!) {
        bestCost[neighbor] = next;
        cameFrom[neighbor] = cell;
        open.push(next + heuristic(neighbor), next, neighbor);
      }
    });
  }
  return null;
}

function reconstructPath(cameFrom: Int32Array, goal: number): number[] {
  const path = [goal];
  for (let cell = cameFrom[goal]!; cell !== -1; cell = cameFrom[cell]!) path.push(cell);
  return path.reverse();
}
