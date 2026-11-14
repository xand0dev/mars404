// Тестові сітки для ядра F4/F5. Синтетика, не дані NASA.
import type { ModelParams, PlanningGrid } from '../contracts';
import { cellIndex } from '../contracts/planning';
import { mockModel } from '../mocks';

export interface TestGridOptions {
  width: number;
  height: number;
  metersPerPixel?: number;
  elevation?: (row: number, col: number) => number;
  blocked?: (row: number, col: number) => boolean;
  hazard?: number;
}

/** Сітка з висотами за функцією; схил клітинок = 0, щоб тестувати саме ребра. */
export function makeTestGrid({ width, height, metersPerPixel = 10, elevation, blocked, hazard = 0.1 }: TestGridOptions): PlanningGrid {
  const n = width * height;
  const grid: PlanningGrid = {
    width,
    height,
    metersPerPixel,
    originM: [0, height * metersPerPixel],
    elevationsM: new Float32Array(n),
    slopesDeg: new Float32Array(n),
    walkable: new Uint8Array(n).fill(1),
    hazard: new Float32Array(n).fill(hazard),
  };

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = cellIndex(grid, row, col);
      grid.elevationsM[i] = elevation ? elevation(row, col) : 0;
      if (blocked?.(row, col)) grid.walkable[i] = 0;
    }
  }
  return grid;
}

/** Еталонна модель SPEC §7.3–7.4 з можливістю перевизначити коефіцієнти. */
export function testModel(overrides: Partial<ModelParams> = {}): ModelParams {
  return { ...mockModel, ...overrides };
}
