// План маршруту (SPEC §7.3): position → цілі в порядку waypoints → base. Збій будь-якої ноги анулює весь план.
import type { ModelParams, PlanningGrid, RouteFailure, RoutePlan, Segment, XY } from '../contracts';
import { cellCenter, validateGrid, xyToCell } from '../contracts/planning';
import { findPath } from './astar';
import { createWalkGraph, edgeBetween, forEachEdge, type WalkGraph } from './edge';
import { validateModel } from './model';

export interface RouteRequest {
  grid: PlanningGrid;
  model: ModelParams;
  start: XY;
  waypoints: XY[];
  base: XY;
  requestId: number;
  /** Сирий sentinel `region.noData`; до завантаження району — немає. */
  noData?: number;
}

export function emptyPlan(status: RoutePlan['status'], requestId: number, reason?: RouteFailure, warnings: string[] = []): RoutePlan {
  return {
    status,
    path: [],
    segments: [],
    legs: [],
    totals: { time: 0, o2: 0, energy: 0, dose: null, dist: 0 },
    ...(reason ? { reason } : {}),
    warnings,
    requestId,
  };
}

export function planRoute({ grid, model, start, waypoints, base, requestId, noData }: RouteRequest): RoutePlan {
  const invalid = [...validateModel(model), ...validateGrid(grid)];
  if (invalid.length > 0) return emptyPlan('invalid', requestId, { code: 'invalid-params' }, invalid.map((e) => `invalid: ${e}`));

  const graph = createWalkGraph(grid, model, noData);
  const points = [start, ...waypoints, base];
  const resolved = resolveCells(graph, points);
  if ('code' in resolved) return emptyPlan('no-path', requestId, resolved);

  const cellPath: number[] = [resolved[0]!];
  const legStarts: number[] = [];
  for (let leg = 0; leg < resolved.length - 1; leg++) {
    legStarts.push(cellPath.length - 1);
    const legPath = findPath(graph, resolved[leg]!, resolved[leg + 1]!);
    if (!legPath) return emptyPlan('no-path', requestId, { code: 'no-path-leg', legIndex: leg });
    cellPath.push(...legPath.slice(1));
  }

  const segments = toSegments(grid, model, cellPath);
  return {
    status: 'ok',
    path: cellPath.map((cell) => centerOf(grid, cell)),
    segments,
    legs: legStarts,
    totals: sumSegments(segments, model.doseUSvPerS !== null),
    warnings: [],
    requestId,
  };
}

/** Клітинки точок або перша причина збою: поза сіткою → заблокована → в іншій зв'язній області, ніж старт. */
function resolveCells(graph: WalkGraph, points: XY[]): number[] | RouteFailure {
  const cells: number[] = [];
  for (const [pointIndex, point] of points.entries()) {
    const cell = xyToCell(graph.grid, point);
    if (!cell) return { code: 'out-of-grid', pointIndex };
    if (graph.blocked[cell.index]) return { code: 'blocked-point', pointIndex };
    cells.push(cell.index);
  }

  const connected = floodFrom(graph, cells[0]!);
  const isolated = cells.findIndex((cell) => !connected[cell]);
  return isolated === -1 ? cells : { code: 'disconnected', pointIndex: isolated };
}

/** Клітинки, досяжні від старту; дозволені ребра симетричні (|slope|, кути), тож зв'язність неорієнтована. */
function floodFrom(graph: WalkGraph, start: number): Uint8Array {
  const seen = new Uint8Array(graph.blocked.length);
  const stack = [start];
  seen[start] = 1;
  while (stack.length > 0) {
    forEachEdge(graph, stack.pop()!, 'forward', (neighbor) => {
      if (seen[neighbor]) return;
      seen[neighbor] = 1;
      stack.push(neighbor);
    });
  }
  return seen;
}

function centerOf(grid: PlanningGrid, cell: number): XY {
  return cellCenter(grid, Math.floor(cell / grid.width), cell % grid.width);
}

function toSegments(grid: PlanningGrid, model: ModelParams, cellPath: number[]): Segment[] {
  const segments: Segment[] = [];
  for (let k = 1; k < cellPath.length; k++) {
    const from = cellPath[k - 1]!;
    const to = cellPath[k]!;
    const edge = edgeBetween(grid, model, from, to)!;
    segments.push({
      from: centerOf(grid, from),
      to: centerOf(grid, to),
      dist: edge.dist,
      slope: edge.slopeDeg,
      time: edge.time,
      o2: edge.time * model.o2GPerS,
      energy: edge.dist * model.energyWhPerM,
      dose: model.doseUSvPerS === null ? null : edge.time * model.doseUSvPerS,
    });
  }
  return segments;
}

function sumSegments(segments: Segment[], doseKnown: boolean): RoutePlan['totals'] {
  const totals = { time: 0, o2: 0, energy: 0, dist: 0, dose: doseKnown ? 0 : null as number | null };
  for (const s of segments) {
    totals.time += s.time;
    totals.o2 += s.o2;
    totals.energy += s.energy;
    totals.dist += s.dist;
    if (totals.dose !== null) totals.dose = s.dose === null ? null : totals.dose + s.dose;
  }
  return totals;
}
