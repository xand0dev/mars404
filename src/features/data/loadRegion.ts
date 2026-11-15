// F3: читання пакета public/data/<SiteId> без React (SPEC §6.0, §7.2). Кожен файл перевіряється окремо:
// бита висота чи walkable → лишається mock; битий slope/hazard → NaN (клітинки заблоковані) і помилка шару;
// бита накладка/текстура/траверс → лише помилка шару.
import { decodeSoil } from './soil';
import type { PlanningGrid, Region, SurfacePhoto, SurfacePhotosGeoJSON, Target, TargetsGeoJSON, XY } from '../../contracts';
import { isNoDataValue, isSiteId, lonLatToXY, xyToCell } from '../../contracts/planning';

/** Байти файлу відносно папки регіону; файла немає → FileMissingError. */
export type GetFile = (path: string) => Promise<ArrayBuffer>;

export class FileMissingError extends Error {
  constructor(path: string) {
    super(`file missing: ${path}`);
    this.name = 'FileMissingError';
  }
}

export interface LayerIssue {
  /** id шару з region.layers або назва растра сітки (walkable, hazard) */
  id: string;
  file: string;
  message: string;
}

export type RegionLoad =
  | { kind: 'real'; region: Region; grid: PlanningGrid; targets: Target[]; photos: SurfacePhoto[]; issues: LayerIssue[]; warnings: string[] }
  | { kind: 'mock'; region: Region | null; reason: string; issues: LayerIssue[]; warnings: string[] };

const GRID_FILES = ['elevation', 'slope', 'walkable', 'hazard'] as const;
type GridFile = (typeof GRID_FILES)[number];
const ISSUE_ID: Record<GridFile, string> = { elevation: 'terrain', slope: 'slope', walkable: 'walkable', hazard: 'hazard' };

const describe = (e: unknown) => (e instanceof FileMissingError ? 'file missing' : e instanceof Error ? e.message : String(e));

function checkRegion(v: unknown): Region {
  const r = v as Region;
  const g = r?.grid;
  const ok =
    r?.schemaVersion === 1 &&
    isSiteId(r.id) &&
    Number.isInteger(g?.width) &&
    Number.isInteger(g?.height) &&
    g.width > 0 &&
    g.height > 0 &&
    g.metersPerPixel > 0 &&
    Array.isArray(g.originM) &&
    Array.isArray(g.boundsLonLat) &&
    typeof r.files?.elevation === 'string' &&
    Array.isArray(r.layers) &&
    Array.isArray(r.sources) &&
    typeof r.model === 'object' &&
    typeof r.limits === 'object' &&
    Array.isArray(r.base);
  if (!ok) throw new Error('region.json does not match schemaVersion 1');
  return r;
}

const decodeJSON = (b: ArrayBuffer): unknown => JSON.parse(new TextDecoder().decode(b));

function sized(b: ArrayBuffer, n: number, bytesPer: number): void {
  if (b.byteLength !== n * bytesPer) throw new Error(`${b.byteLength} bytes, expected ${n * bytesPer} (${n} cells × ${bytesPer})`);
}

const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];
function checkOverlay(path: string, b: ArrayBuffer): void {
  const head = new Uint8Array(b, 0, Math.min(4, b.byteLength));
  const starts = (sig: number[]) => sig.every((x, i) => head[i] === x);
  if (/\.png$/i.test(path) && !starts(PNG)) throw new Error('not a PNG');
  if (/\.jpe?g$/i.test(path) && !starts(JPEG)) throw new Error('not a JPEG');
  if (/\.geojson$/i.test(path) && (decodeJSON(b) as { type?: string })?.type !== 'FeatureCollection') throw new Error('not a FeatureCollection');
}

interface PointFeature<P> {
  id?: string;
  geometry?: { type?: string; coordinates?: unknown };
  properties?: P;
}

/** Точки [lon, lat] → у сітці; поза сіткою чи без координат — попередження. */
function placePoints<P extends { id?: string }>(region: Region, fc: unknown, what: string, warnings: string[]) {
  const feats = (fc as { type?: string; features?: PointFeature<P>[] })?.features;
  if ((fc as { type?: string })?.type !== 'FeatureCollection' || !Array.isArray(feats)) throw new Error('not a FeatureCollection');
  const out: { props: P; id: string; coordinates: XY; lonLat: readonly [number, number] }[] = [];
  for (const f of feats) {
    const id = String(f.properties?.id ?? f.id ?? '?');
    const c = f.geometry?.coordinates;
    if (f.geometry?.type !== 'Point' || !Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || !f.properties) {
      warnings.push(`${what} ${id}: invalid point, skipped`);
      continue;
    }
    const lonLat = [c[0] as number, c[1] as number] as const;
    const coordinates = lonLatToXY(region, lonLat);
    if (!xyToCell(region.grid, coordinates)) {
      warnings.push(`${what} ${id}: outside the grid, skipped`);
      continue;
    }
    out.push({ props: f.properties, id, coordinates, lonLat });
  }
  return out;
}

export async function loadRegion(get: GetFile): Promise<RegionLoad> {
  const issues: LayerIssue[] = [];
  const warnings: string[] = [];

  let region: Region;
  try {
    region = checkRegion(decodeJSON(await get('region.json')));
  } catch (e) {
    issues.push({ id: 'region', file: 'region.json', message: describe(e) });
    return { kind: 'mock', region: null, reason: `region.json: ${describe(e)}`, issues, warnings };
  }

  const { width, height, metersPerPixel, originM } = region.grid;
  const n = width * height;
  const raw = await Promise.all(GRID_FILES.map((k) => get(region.files[k]).then((b) => ({ k, b }), (e: unknown) => ({ k, e }))));
  const arrays: Partial<Record<GridFile, Float32Array | Uint8Array>> = {};
  for (const r of raw) {
    const file = region.files[r.k];
    try {
      if ('e' in r) throw r.e;
      const bytesPer = r.k === 'walkable' ? 1 : 4;
      sized(r.b, n, bytesPer);
      arrays[r.k] = r.k === 'walkable' ? new Uint8Array(r.b.slice(0)) : new Float32Array(r.b.slice(0));
    } catch (e) {
      issues.push({ id: ISSUE_ID[r.k], file, message: describe(e) });
    }
  }

  const elevation = arrays.elevation as Float32Array | undefined;
  const walkableRaw = arrays.walkable as Uint8Array | undefined;
  const overlayIssues = await checkOverlays(region, get);
  issues.push(...overlayIssues);
  if (!elevation || !walkableRaw) {
    const broken = [!elevation && 'elevation', !walkableRaw && 'walkable'].filter(Boolean).join(', ');
    return { kind: 'mock', region, reason: `planning grid is broken (${broken}); showing mock terrain`, issues, warnings };
  }

  const nanFilled = () => new Float32Array(n).fill(NaN);
  const slopesDeg = (arrays.slope as Float32Array | undefined) ?? nanFilled();
  const hazard = (arrays.hazard as Float32Array | undefined) ?? nanFilled();
  const walkable = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (isNoDataValue(elevation[i]!, region.noData)) elevation[i] = NaN;
    walkable[i] = walkableRaw[i] === 1 && !Number.isNaN(elevation[i]!) ? 1 : 0;
  }
  if (!arrays.slope || !arrays.hazard) warnings.push('Slope or hazard missing: all cells are treated as blocked');

  const grid: PlanningGrid = { width, height, metersPerPixel, originM, elevationsM: elevation, slopesDeg, walkable, hazard };

  // Ґрунт (assumption): нічний THEMIS → сповільнення ходьби. Не вдалося — модель без ґрунту, як раніше.
  const night = region.layers.find((l) => l.id === 'thermal' && /\.png$/i.test(l.url));
  if (night) {
    try {
      const soil = await decodeSoil(await get(night.url), width, height);
      if (soil) grid.soil = soil;
    } catch {
      warnings.push('Ground type (THEMIS) not applied: walking speed ignores sand vs rock');
    }
  }

  let targets: Target[] = [];
  try {
    const fc = decodeJSON(await get(region.files.targets)) as TargetsGeoJSON;
    targets = placePoints<TargetsGeoJSON['features'][number]['properties']>(region, fc, 'Target', warnings).map((p) => ({
      ...p.props,
      id: p.id,
      coordinates: p.coordinates,
      lonLat: p.lonLat,
    }));
  } catch (e) {
    if (e instanceof FileMissingError) warnings.push(`No targets file (${region.files.targets}) yet: targets = []`);
    else issues.push({ id: 'targets', file: region.files.targets, message: describe(e) });
  }

  let photos: SurfacePhoto[] = [];
  const photosFile = region.files.photos;
  if (photosFile) {
    try {
      photos = placePoints<SurfacePhotosGeoJSON['features'][number]['properties']>(region, decodeJSON(await get(photosFile)), 'Photo', warnings).map((p) => ({
        ...p.props,
        id: p.id,
        coordinates: p.coordinates,
        lonLat: p.lonLat,
      }));
    } catch (e) {
      if (e instanceof FileMissingError) warnings.push(`No photos file (${photosFile}) yet: photos = []`);
      else issues.push({ id: 'photos', file: photosFile, message: describe(e) });
    }
  }

  return { kind: 'real', region, grid, targets, photos, issues, warnings };
}

/** Шари, що не входять у сітку (накладки, текстура, траверс): лише наявність і формат. */
async function checkOverlays(region: Region, get: GetFile): Promise<LayerIssue[]> {
  const gridFiles = new Set<string>(GRID_FILES.map((k) => region.files[k]));
  const byFile = new Map<string, string>();
  for (const l of region.layers) if (l.url && !gridFiles.has(l.url)) byFile.set(l.url, l.id);
  if (!byFile.has(region.files.texture)) byFile.set(region.files.texture, 'texture');
  const out = await Promise.all(
    [...byFile].map(async ([file, id]) => {
      try {
        checkOverlay(file, await get(file));
        return null;
      } catch (e) {
        return { id, file, message: describe(e) };
      }
    }),
  );
  return out.filter((x): x is LayerIssue => x !== null);
}
