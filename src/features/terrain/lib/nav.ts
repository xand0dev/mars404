// Навігація без GPS (assumption-модель): локальні радіомаяки + інерціальна навігація між ними.
// Маяк бачить точку, якщо між ними немає рельєфу (пряма видимість) і відстань ≤ дальності. ≥ 3 маяки → точне місце (трилатерація);
// інакше — інерціалка (IMU + крокомір), похибка росте з пройденою відстанню; на контрольній точці вона скидається.
// Усе рахується з тієї ж сітки висот, що й маршрут; store не змінюється.
import type { PlanningGrid, RoutePlan, XY } from '../../../contracts';
import { cellCenter, xyToCell } from '../../../contracts/planning';

/** Дальність маяка, м. Assumption: UHF / UWB-маяк на щоглі, пряма видимість. */
export const BEACON_RANGE_M = 1000;
/** Висота щогли маяка й антени на скафандрі, м. Assumption. */
export const MAST_M = 2;
export const SUIT_ANTENNA_M = 1.7;
/** Дрейф інерціалки: частка пройденої відстані. Assumption (типово 1–3 % для пішохідної навігації). */
export const DRIFT = 0.02;
/** Похибка з маяками, м (трилатерація). Assumption. */
export const FIX_ERR_M = 1;
/** Коли інерціальна похибка сягає цього, ставимо контрольну точку, м. */
export const CHECKPOINT_ERR_M = 10;
/** Маяк ставимо лише на рівне місце, °. */
export const MAX_BEACON_SLOPE_DEG = 8;
/** Мінімальна відстань між маяками, м — щоб трилатерація мала добру геометрію. */
export const MIN_BEACON_SPACING_M = 250;

export interface Beacon {
  id: string;
  xy: XY;
  elevationM: number;
  slopeDeg: number;
  /** База (житловий модуль) — теж маяк. */
  isBase: boolean;
}

export interface NavPoint {
  xy: XY;
  /** Скільки маяків бачать точку. */
  visible: number;
  /** Похибка місця, м. */
  errM: number;
  fix: boolean;
}

export interface NavPlan {
  beacons: Beacon[];
  points: NavPoint[];
  checkpoints: XY[];
  /** Частка маршруту (за відстанню) з точним місцем, 0…1. */
  fixShare: number;
  maxErrM: number;
  /** Частка маршруту на пухкому ґрунті (множник ≥ 1.2). */
  sandShare: number;
}

const dist = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Висота поверхні в точці (найближча клітинка); NaN — NoData / поза сіткою. */
function groundAt(grid: PlanningGrid, xy: XY): number {
  const c = xyToCell(grid, xy);
  return c ? (grid.elevationsM[c.index] ?? NaN) : NaN;
}

/** Пряма видимість між двома точками над рельєфом (вибірка кожні пів клітинки). NoData на шляху — невидимо. */
export function lineOfSight(grid: PlanningGrid, a: XY, ha: number, b: XY, hb: number): boolean {
  const za = groundAt(grid, a) + ha;
  const zb = groundAt(grid, b) + hb;
  if (!Number.isFinite(za) || !Number.isFinite(zb)) return false;
  const d = dist(a, b);
  const steps = Math.max(2, Math.ceil(d / (grid.metersPerPixel / 2)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const g = groundAt(grid, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    if (!Number.isFinite(g)) return false;
    if (g > za + (zb - za) * t) return false;
  }
  return true;
}

/** Точки маршруту з кроком ~ step м (щоб рахунок був швидким і рівномірним). */
export function samplePath(path: XY[], step: number): XY[] {
  if (path.length === 0) return [];
  const out: XY[] = [path[0] as XY];
  let carry = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1] as XY;
    const b = path[i] as XY;
    const d = dist(a, b);
    let t = step - carry;
    while (t <= d) {
      out.push([a[0] + ((b[0] - a[0]) * t) / d, a[1] + ((b[1] - a[1]) * t) / d]);
      t += step;
    }
    carry = d - (t - step);
  }
  const last = path[path.length - 1] as XY;
  if (dist(out[out.length - 1] as XY, last) > 1e-6) out.push(last);
  return out;
}

/** Кандидати під маяк: прохідні рівні клітинки, що виступають над околицею (видно далеко), у межах дальності від маршруту. */
function candidates(grid: PlanningGrid, route: XY[], max: number): Beacon[] {
  const { width, height } = grid;
  const stride = 3;
  const out: { b: Beacon; score: number }[] = [];
  for (let r = 2; r < height - 2; r += stride) {
    for (let c = 2; c < width - 2; c += stride) {
      const i = r * width + c;
      const z = grid.elevationsM[i] ?? NaN;
      const slope = grid.slopesDeg[i] ?? NaN;
      if (grid.walkable[i] !== 1 || !Number.isFinite(z) || !(slope <= MAX_BEACON_SLOPE_DEG)) continue;
      const xy = cellCenter(grid, r, c);
      if (!route.some((p) => dist(p, xy) <= BEACON_RANGE_M)) continue;
      // Перевищення над середнім у радіусі 6 клітинок: чим вище, тим ширший огляд.
      let sum = 0;
      let k = 0;
      for (let dr = -6; dr <= 6; dr += 3)
        for (let dc = -6; dc <= 6; dc += 3) {
          const v = grid.elevationsM[(r + dr) * width + (c + dc)];
          if (v !== undefined && Number.isFinite(v) && r + dr >= 0 && r + dr < height && c + dc >= 0 && c + dc < width) {
            sum += v;
            k++;
          }
        }
      const score = k > 0 ? z - sum / k : 0;
      out.push({ b: { id: '', xy, elevationM: z, slopeDeg: slope, isBase: false }, score });
    }
  }
  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((o) => o.b);
}

/**
 * План навігації: база + до `extra` маяків, обраних жадібно — щоб якомога більше маршруту бачило ≥ 3 маяки.
 * Далі — профіль похибки вздовж маршруту і контрольні точки, де інерціалка перевищує CHECKPOINT_ERR_M.
 */
export function planNavigation(grid: PlanningGrid, plan: RoutePlan, base: XY, extra = 3): NavPlan | null {
  if (plan.status !== 'ok' || plan.path.length < 2) return null;
  const route = samplePath(plan.path, grid.metersPerPixel * 2);
  const sees = (b: XY, p: XY) => dist(b, p) <= BEACON_RANGE_M && lineOfSight(grid, b, MAST_M, p, SUIT_ANTENNA_M);

  const baseBeacon: Beacon = { id: 'Base', xy: base, elevationM: groundAt(grid, base), slopeDeg: 0, isBase: true };
  const counts: number[] = route.map((p) => (sees(base, p) ? 1 : 0));
  const pool = candidates(grid, route, 260).map((b) => ({ b, vis: route.map((p) => sees(b.xy, p)) }));
  const chosen: Beacon[] = [baseBeacon];

  for (let k = 0; k < extra; k++) {
    let best: (typeof pool)[number] | null = null;
    let bestGain = 0;
    for (const cand of pool) {
      if (chosen.some((c) => dist(c.xy, cand.b.xy) < MIN_BEACON_SPACING_M)) continue;
      // Виграш: наближення кожної точки до 3 видимих маяків.
      let gain = 0;
      cand.vis.forEach((v, i) => {
        if (v && (counts[i] ?? 0) < 3) gain += 1;
      });
      if (gain > bestGain) {
        bestGain = gain;
        best = cand;
      }
    }
    if (!best) break;
    chosen.push({ ...best.b, id: `B${chosen.length}` });
    best.vis.forEach((v, i) => {
      if (v) counts[i] = (counts[i] ?? 0) + 1;
    });
  }

  // Похибка вздовж маршруту.
  const points: NavPoint[] = [];
  const checkpoints: XY[] = [];
  let err = FIX_ERR_M;
  let fixDist = 0;
  let total = 0;
  let sand = 0;
  route.forEach((p, i) => {
    const step = i > 0 ? dist(route[i - 1] as XY, p) : 0;
    total += step;
    const visible = counts[i] ?? 0;
    const fix = visible >= 3;
    if (fix) {
      err = FIX_ERR_M;
      fixDist += step;
    } else {
      err += DRIFT * step;
      if (err >= CHECKPOINT_ERR_M) {
        checkpoints.push(p);
        err = FIX_ERR_M * 2;
      }
    }
    const cell = xyToCell(grid, p);
    if (cell && (grid.soil?.[cell.index] ?? 1) >= 1.2) sand += step;
    points.push({ xy: p, visible, errM: err, fix });
  });

  return {
    beacons: chosen,
    points,
    checkpoints,
    fixShare: total > 0 ? fixDist / total : 0,
    maxErrM: Math.max(...points.map((p) => p.errM)),
    sandShare: total > 0 ? sand / total : 0,
  };
}

/** Відрізки маршруту без точного місця (для пунктиру на карті). */
export function driftRuns(points: NavPoint[]): XY[][] {
  const runs: XY[][] = [];
  let cur: XY[] | null = null;
  points.forEach((p, i) => {
    if (!p.fix) {
      if (!cur) {
        cur = i > 0 ? [(points[i - 1] as NavPoint).xy] : [];
        runs.push(cur);
      }
      cur.push(p.xy);
    } else if (cur) {
      cur.push(p.xy);
      cur = null;
    }
  });
  return runs.filter((r) => r.length >= 2);
}
