// Траверс марсохода (T12, SPEC §6.0): traverse.geojson (F3) → лінії в локальних метрах через lonLatToXY.
// Висоту з geojson не беремо: лінія лягає на ту саму сітку, що й рельєф (F2-AC1).
import type { PlanningGrid, Region, XY } from '../../../contracts';
import { lonLatToXY, xyToCell } from '../../../contracts/planning';

type LonLat = [number, number];

export interface ParsedTraverse {
  lines: LonLat[][];
  warnings: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Розбір FeatureCollection з LineString [lon, lat, elev?]. Невалідне відкидається з попередженням, не вигадується. */
export function parseTraverse(json: unknown): ParsedTraverse {
  if (!isObj(json) || json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
    return { lines: [], warnings: ['Traverse: file is not a GeoJSON FeatureCollection'] };
  }
  const lines: LonLat[][] = [];
  let badPoints = 0;
  let otherGeom = 0;
  for (const f of json.features as unknown[]) {
    const g = isObj(f) && isObj(f.geometry) ? f.geometry : null;
    if (!g || g.type !== 'LineString' || !Array.isArray(g.coordinates)) {
      otherGeom++;
      continue;
    }
    const pts: LonLat[] = [];
    for (const c of g.coordinates as unknown[]) {
      const lon = Array.isArray(c) ? c[0] : undefined;
      const lat = Array.isArray(c) ? c[1] : undefined;
      if (typeof lon === 'number' && typeof lat === 'number' && Number.isFinite(lon) && Number.isFinite(lat)) pts.push([lon, lat]);
      else badPoints++;
    }
    if (pts.length >= 2) lines.push(pts);
  }
  const warnings: string[] = [];
  if (badPoints) warnings.push(`Traverse: ${badPoints} invalid point(s) skipped`);
  if (otherGeom) warnings.push(`Traverse: ${otherGeom} non-LineString feature(s) skipped`);
  return { lines, warnings };
}

/** Lon/lat → XY; точки поза сіткою розривають лінію (не тягнемо відрізок через невідоме). */
export function traverseToXY(region: Pick<Region, 'grid'>, grid: PlanningGrid, lines: LonLat[][]): { lines: XY[][]; outside: number } {
  const out: XY[][] = [];
  let outside = 0;
  for (const l of lines) {
    let cur: XY[] = [];
    const flush = () => {
      if (cur.length >= 2) out.push(cur);
      cur = [];
    };
    for (const p of l) {
      const xy = lonLatToXY(region, p);
      if (xyToCell(grid, xy)) cur.push(xy);
      else {
        outside++;
        flush();
      }
    }
    flush();
  }
  return { lines: out, outside };
}

/** Показувати траверс: є файл; якщо F3 оголосив шар 'traverse' — за його перемикачем. */
export function traverseVisible(region: Pick<Region, 'files' | 'layers'> | null, flags: Record<string, boolean>): boolean {
  if (!region?.files.traverse) return false;
  return region.layers.some((l) => l.id === 'traverse') ? flags.traverse === true : true;
}

/** Растр, який можна вантажити як текстуру шару (geojson, .f32 тощо — ні). */
export function isRasterUrl(url: string): boolean {
  return /\.(png|jpe?g|webp)(\?.*)?$/i.test(url);
}
