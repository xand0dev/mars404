// Чиста логіка 2D-плану Б (SPEC §7.5). Координати плану — у клітинках: (col, row), північ угорі.
import type { PlanningGrid, RoutePlan, XY } from '../../../contracts';

type Shape = Pick<PlanningGrid, 'width' | 'height' | 'metersPerPixel' | 'originM'>;

export type PlanReasonCode = 'no-webgl' | 'context-lost' | 'invalid-grid' | 'render-error' | 'forced';
export interface PlanReason {
  code: PlanReasonCode;
  text: string;
}

/**
 * Чому показуємо 2D замість 3D; null — 3D можна. Справжні причини (невалідна сітка, втрата
 * контексту, немає WebGL) важливіші за свідомий вибір ?2d.
 */
export function planReason({ webgl, lost, gridErrors, forced = false }: { webgl: boolean; lost: boolean; gridErrors: string[]; forced?: boolean }): PlanReason | null {
  if (gridErrors.length > 0) return { code: 'invalid-grid', text: `Invalid grid: ${gridErrors.join('; ')}` };
  if (lost) return { code: 'context-lost', text: 'WebGL context lost' };
  if (!webgl) return { code: 'no-webgl', text: 'WebGL unavailable' };
  if (forced) return { code: 'forced', text: '2D map' };
  return null;
}

/** План Б для демо (SPEC §12: низький FPS → 2D-план): ?2d в адресі вмикає 2D навіть з WebGL. */
export function force2DRequested(): boolean {
  return typeof location !== 'undefined' && new URLSearchParams(location.search).has('2d');
}

/** Локальні метри → координати плану (col, row) з дробовою частиною. */
export function planPoint(grid: Shape, [x, y]: XY): [number, number] {
  const [ox, oy] = grid.originM;
  return [(x - ox) / grid.metersPerPixel, (oy - y) / grid.metersPerPixel];
}

/** Один SVG-path для клітинок, що задовольняють pick; сусіди в рядку зливаються. */
export function cellsPath(width: number, classes: Uint8Array, pick: (c: number) => boolean): string {
  const parts: string[] = [];
  const height = Math.floor(classes.length / width);
  for (let r = 0; r < height; r++) {
    let c = 0;
    while (c < width) {
      if (!pick(classes[r * width + c] as number)) {
        c++;
        continue;
      }
      const start = c;
      while (c < width && pick(classes[r * width + c] as number)) c++;
      const len = c - start;
      parts.push(`M${start} ${r}h${len}v1h-${len}z`);
    }
  }
  return parts.join(' ');
}

const fmt = (v: number) => String(Math.round(v * 1000) / 1000);

export function polyline(grid: Shape, path: readonly XY[]): string {
  return path.map((p) => planPoint(grid, p).map(fmt).join(',')).join(' ');
}

/** Відрізок plan.segments[i] у координатах плану; null — підсвітки немає. */
export function selectedSegmentLine(grid: Shape, plan: RoutePlan | null, i: number | null): [[number, number], [number, number]] | null {
  if (!plan || i === null) return null;
  const s = plan.segments[i];
  if (!s) return null;
  return [planPoint(grid, s.from), planPoint(grid, s.to)];
}
