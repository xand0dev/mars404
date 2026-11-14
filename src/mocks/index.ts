// Детерміновані MOCK-дані (SPEC §6, §7.3, §7.4). Синтетика, не дані NASA і не наукові константи.
import type { ModelParams, PlanningGrid, Resources, Source, Target, XY } from '../contracts';
import { cellCenter, cellIndex } from '../contracts/planning';

export const MOCK_SOURCE: Source = {
  id: 'mock',
  title: 'MOCK — синтетичні дані F0',
  status: 'mock',
  note: 'Тестова фікстура, не дані NASA. Замінюється пакетом public/data/gale (F3).',
};

const mockSrc = (note: string): Source => ({ ...MOCK_SOURCE, note });

const SIZE = 128;
const MPP = 10;

/** Синтетична сітка 128×128 по 10 м: пагорб, стіна з проходом, одна NoData-клітинка, одна «підступна» NaN. */
export const mockGrid: PlanningGrid = (() => {
  const n = SIZE * SIZE;
  const elevationsM = new Float32Array(n);
  const slopesDeg = new Float32Array(n);
  const walkable = new Uint8Array(n).fill(1);
  const hazard = new Float32Array(n).fill(0.1);
  const grid: PlanningGrid = { width: SIZE, height: SIZE, metersPerPixel: MPP, originM: [0, SIZE * MPP], elevationsM, slopesDeg, walkable, hazard };

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const [x, y] = cellCenter(grid, r, c);
      elevationsM[cellIndex(grid, r, c)] = 12 * Math.sin(x / 260) + 8 * Math.cos(y / 190) + 0.01 * x;
    }
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const h = (rr: number, cc: number) =>
        elevationsM[cellIndex(grid, Math.min(SIZE - 1, Math.max(0, rr)), Math.min(SIZE - 1, Math.max(0, cc)))] ?? 0;
      const dzdx = (h(r, c + 1) - h(r, c - 1)) / (2 * MPP);
      const dzdy = (h(r - 1, c) - h(r + 1, c)) / (2 * MPP);
      slopesDeg[cellIndex(grid, r, c)] = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
    }
  }
  // Стіна: колонка 90, рядки 10–110; прохід лишається на півночі та півдні.
  for (let r = 10; r <= 110; r++) {
    walkable[cellIndex(grid, r, 90)] = 0;
    hazard[cellIndex(grid, r, 90)] = 1;
  }
  // Правильна NoData: NaN + walkable = 0.
  elevationsM[cellIndex(grid, 3, 3)] = NaN;
  walkable[cellIndex(grid, 3, 3)] = 0;
  // «Підступна» клітинка: walkable = 1, але висота NaN — ядро має вважати її заблокованою.
  elevationsM[cellIndex(grid, 4, 4)] = NaN;
  return grid;
})();

export const MOCK_CELLS = { wallCol: 90, wallRows: [10, 110], noData: [3, 3], trickyNaN: [4, 4] } as const;

/** База — центр клітинки (64, 64). */
export const mockBase: XY = cellCenter(mockGrid, 64, 64);

/** Еталонна модель SPEC §7.3–7.4. Значення без джерела — MOCK. */
export const mockModel: ModelParams = {
  speedMps: 1,
  uphillFactor: 2,
  downhillFactor: 0.5,
  o2GPerS: 0.2,
  energyWhPerM: 0.05,
  doseUSvPerS: null,
  maxSlopeDeg: 25,
  hazardWeight: 0.5,
  reserveFraction: 0.2,
  emergencyO2G: 360,
  evidence: {
    speedMps: mockSrc('SPEC §7.3 еталонне ребро'),
    uphillFactor: mockSrc('SPEC §7.3 еталонне ребро'),
    downhillFactor: mockSrc('SPEC §7.3 еталонне ребро'),
    o2GPerS: mockSrc('SPEC §7.4 еталонний приклад'),
    energyWhPerM: mockSrc('MOCK, у SPEC не задано'),
    doseUSvPerS: mockSrc('невідомо → null → статус incomplete'),
    maxSlopeDeg: mockSrc('MOCK, у SPEC не задано'),
    hazardWeight: mockSrc('SPEC §7.3 еталонне ребро'),
    reserveFraction: mockSrc('SPEC §7.4 еталонний приклад'),
    emergencyO2G: { ...MOCK_SOURCE, status: 'assumption', note: 'SPEC §7.6/§7.8: кандидат — аварійний кисневий блок EMU (~30 хв); 30 хв × 0.2 г/с = 360 г, до перевірки — assumption' },
  },
};

/** Еталонні ліміти SPEC §7.4 (energy — MOCK, у SPEC не задано). */
export const mockLimits: Resources = { time: 3600, o2: 720, energy: 600, dose: null };

/** Еталонні витрати плану SPEC §7.4: план 900 с, 180 г O₂. */
export const REFERENCE_PLAN_TOTALS = { time: 900, o2: 180 } as const;
/** Очікувані «Return in N min» SPEC §7.4. */
export const REFERENCE_RETURN_MIN = { noPlan: 48, plan: 33, planAfter600s: 23, o2Minus40: 13 } as const;
/** Еталонне ребро SPEC §7.3 (dz = +1 м і −1 м між ортогональними сусідами). */
export const REFERENCE_EDGE = {
  up: { dist: 10.05, slopeDeg: 5.71, time: 12.06, cost: 12.663 },
  down: { dist: 10.05, slopeDeg: -5.71, time: 10.552, cost: 11.08 },
} as const;

const target = (id: string, name: string, row: number, col: number, why: string): Target => ({
  id,
  name,
  coordinates: cellCenter(mockGrid, row, col),
  lonLat: [0, 0],
  why,
  sourceIds: ['mock'],
  status: 'mock',
  locationAccuracy: 'mock',
  photo: null,
});

/** 5 MOCK-цілей на прохідних, зв'язних клітинках. */
export const mockTargets: Target[] = [
  target('mock-a', 'MOCK Site A', 40, 50, 'MOCK: шаруваті відклади на схилі.'),
  target('mock-b', 'MOCK Site B', 80, 40, 'MOCK: світлі жили в аргілітах.'),
  target('mock-c', 'MOCK Site C', 60, 110, 'MOCK: далека ціль за стіною.'),
  target('mock-d', 'MOCK Site D', 20, 70, 'MOCK: піщані брижі, обережно.'),
  target('mock-e', 'MOCK Site E', 100, 75, 'MOCK: валуни біля підніжжя.'),
];
