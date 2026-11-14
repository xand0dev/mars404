// Ребра графа ходьби (SPEC §7.3): 8 сусідів, без зрізання кутів, асиметрична вартість за схилом.
import type { ModelCoefficients, PlanningGrid } from '../contracts';
import { isBlocked } from '../contracts/planning';

export interface Edge {
  dist: number;
  /** градуси, + = підйом */
  slopeDeg: number;
  time: number;
  cost: number;
}

/** Граф ходьби: сітка, модель і маска заблокованих клітинок, порахована один раз. */
export interface WalkGraph {
  grid: PlanningGrid;
  model: ModelCoefficients;
  /** 1 = заблоковано (SPEC §7.2) */
  blocked: Uint8Array;
}

/** forward — ребро from → to; reverse — ребро to → from (для дерева «до бази»). */
export type EdgeDirection = 'forward' | 'reverse';

/** Порядок обходу N, NE, E, SE, S, SW, W, NW — фіксований заради детермінізму. */
const NEIGHBOR_OFFSETS: readonly (readonly [dRow: number, dCol: number])[] = [
  [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1],
];

const RAD_TO_DEG = 180 / Math.PI;

export function createWalkGraph(grid: PlanningGrid, model: ModelCoefficients): WalkGraph {
  const blocked = new Uint8Array(grid.width * grid.height);
  for (let i = 0; i < blocked.length; i++) blocked[i] = isBlocked(grid, i, model.maxSlopeDeg) ? 1 : 0;
  return { grid, model, blocked };
}

/** Ребро між центрами сусідніх клітинок a → b; null — схил понад maxSlopeDeg. Прохідність клітинок не перевіряє. */
export function edgeBetween(grid: PlanningGrid, model: ModelCoefficients, from: number, to: number): Edge | null {
  const { width, metersPerPixel } = grid;
  const isDiagonal = from % width !== to % width && Math.floor(from / width) !== Math.floor(to / width);
  const horiz = isDiagonal ? metersPerPixel * Math.SQRT2 : metersPerPixel;
  const dz = (grid.elevationsM[to] ?? NaN) - (grid.elevationsM[from] ?? NaN);
  const slopeDeg = Math.atan2(dz, horiz) * RAD_TO_DEG;
  if (!(Math.abs(slopeDeg) <= model.maxSlopeDeg)) return null;

  const tan = dz / horiz;
  const dist = Math.hypot(horiz, dz);
  const time = (dist / model.speedMps) * (1 + model.uphillFactor * Math.max(0, tan) + model.downhillFactor * Math.max(0, -tan));
  const meanHazard = ((grid.hazard[from] ?? 0) + (grid.hazard[to] ?? 0)) / 2;
  return { dist, slopeDeg, time, cost: time * (1 + model.hazardWeight * meanHazard) };
}

/** Обходить дозволені ребра клітинки у фіксованому порядку. */
export function forEachEdge(graph: WalkGraph, cell: number, direction: EdgeDirection, visit: (neighbor: number, edge: Edge) => void): void {
  const { grid, model, blocked } = graph;
  const { width, height } = grid;
  const row = Math.floor(cell / width);
  const col = cell % width;

  for (const [dRow, dCol] of NEIGHBOR_OFFSETS) {
    const r = row + dRow;
    const c = col + dCol;
    if (r < 0 || c < 0 || r >= height || c >= width) continue;
    const neighbor = r * width + c;
    if (blocked[neighbor]) continue;
    if (dRow !== 0 && dCol !== 0 && (blocked[row * width + c] || blocked[r * width + col])) continue;

    const edge = direction === 'forward' ? edgeBetween(grid, model, cell, neighbor) : edgeBetween(grid, model, neighbor, cell);
    if (edge) visit(neighbor, edge);
  }
}
