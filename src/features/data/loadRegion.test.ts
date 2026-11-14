// F3-AC2, F3-AC4, F3-AC5: loadRegion на справжньому пакеті public/data/gale і на зіпсованих копіях.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { Region } from '../../contracts';
import { lonLatToXY } from '../../contracts/planning';
import { mockGrid } from '../../mocks';
import { FileMissingError, loadRegion, type GetFile } from './loadRegion';

const dir = 'public/data/gale/';
const toAB = (b: Buffer): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const disk: GetFile = async (path) => {
  try {
    return toAB(await readFile(dir + path));
  } catch {
    throw new FileMissingError(path);
  }
};
const json = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).buffer as ArrayBuffer;
const realRegion = async (): Promise<Region> => JSON.parse((await readFile(dir + 'region.json')).toString('utf-8'));

/** Пакет з підмінами: undefined → файла немає. */
const patched = (over: Record<string, ArrayBuffer | undefined>): GetFile => async (path) => {
  if (path in over) {
    const v = over[path];
    if (!v) throw new FileMissingError(path);
    return v;
  }
  return disk(path);
};

describe('F3-AC2: справжня сітка Gale', () => {
  it('Given пакет Gale, When вантажиться район, Then grid реальна, verified, висоти в діапазоні exportImage', async () => {
    const r = await loadRegion(disk);
    expect(r.kind).toBe('real');
    if (r.kind !== 'real') return;
    expect(r.grid).not.toBe(mockGrid);
    expect(r.region.status).toBe('verified');
    expect([r.grid.width, r.grid.height, r.grid.metersPerPixel]).toEqual([256, 256, 10]);
    expect(r.grid.elevationsM.length).toBe(256 * 256);
    const src = JSON.parse((await readFile(dir + 'source.json')).toString('utf-8'));
    let lo = Infinity;
    let hi = -Infinity;
    for (const h of r.grid.elevationsM) {
      if (Number.isNaN(h)) continue;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
    // Середнє по клітинці лежить між мін. і макс. пікселем exportImage.
    expect(lo).toBeGreaterThanOrEqual(src.native.elevMinM);
    expect(hi).toBeLessThanOrEqual(src.native.elevMaxM);
    expect(r.issues).toEqual([]);
  });

  it('Then NoData → NaN і walkable = 0', async () => {
    const reg = await realRegion();
    const elev = new Float32Array(await disk(reg.files.elevation));
    elev[5] = reg.noData;
    elev[6] = 3.4e38;
    const r = await loadRegion(patched({ [reg.files.elevation]: elev.buffer }));
    if (r.kind !== 'real') throw new Error(r.kind);
    expect(Number.isNaN(r.grid.elevationsM[5])).toBe(true);
    expect(Number.isNaN(r.grid.elevationsM[6])).toBe(true);
    expect([r.grid.walkable[5], r.grid.walkable[6]]).toEqual([0, 0]);
  });
});

describe('F3-AC4: битий шар', () => {
  it('Given slope.f32 іншого розміру, Then помилка саме slope, сітка реальна, slope не в grid', async () => {
    const r = await loadRegion(patched({ 'slope.f32': new ArrayBuffer(100) }));
    expect(r.kind).toBe('real');
    if (r.kind !== 'real') return;
    expect(r.issues.map((i) => i.id)).toEqual(['slope']);
    expect(r.issues[0]!.message).toMatch(/100 bytes.*262144/);
    expect(r.grid.slopesDeg.every(Number.isNaN)).toBe(true);
    // Інші шари на місці.
    expect(r.grid.hazard.some((v) => v > 0 && v <= 1)).toBe(true);
  });

  it('Given немає накладки thermal, Then помилка лише thermal, решта шарів без помилок', async () => {
    const r = await loadRegion(patched({ 'layers/themis-night.png': undefined }));
    expect(r.kind).toBe('real');
    expect(r.issues).toEqual([{ id: 'thermal', file: 'layers/themis-night.png', message: 'file missing' }]);
  });

  it('Given texture не JPEG, Then помилка optical', async () => {
    const r = await loadRegion(patched({ 'hirise.jpg': json({ nope: 1 }) }));
    expect(r.issues.map((i) => i.id)).toEqual(['optical']);
  });

  it('Given бита висота, Then лишається mock із причиною й помилкою terrain', async () => {
    const r = await loadRegion(patched({ 'elevation.f32': new ArrayBuffer(8) }));
    expect(r.kind).toBe('mock');
    if (r.kind !== 'mock') return;
    expect(r.reason).toMatch(/elevation/);
    expect(r.issues.map((i) => i.id)).toContain('terrain');
    expect(r.region?.id).toBe('gale');
  });

  it('Given бита walkable, Then mock', async () => {
    const r = await loadRegion(patched({ 'walkable.u8': undefined }));
    expect(r.kind).toBe('mock');
  });

  it('Given немає region.json, Then mock без region', async () => {
    const r = await loadRegion(patched({ 'region.json': undefined }));
    expect(r).toMatchObject({ kind: 'mock', region: null });
  });

  it('Given region.json не тієї схеми, Then mock', async () => {
    const r = await loadRegion(patched({ 'region.json': json({ schemaVersion: 2 }) }));
    expect(r.kind).toBe('mock');
  });
});

describe('targets.geojson (SPEC §6.0)', () => {
  const props = (id: string) => ({ id, name: id, why: 'why', sourceIds: [], status: 'verified', locationAccuracy: 'verified', photo: null });
  const fc = (pts: [string, number, number][]) =>
    json({ type: 'FeatureCollection', features: pts.map(([id, lon, lat]) => ({ type: 'Feature', id, geometry: { type: 'Point', coordinates: [lon, lat] }, properties: props(id) })) });

  it('Given цілі в і поза сіткою, Then coordinates з lonLatToXY, поза сіткою — відкинуто з попередженням', async () => {
    const reg = await realRegion();
    const r = await loadRegion(patched({ 'targets.geojson': fc([['in', 137.40674, -4.73802], ['out', 137.5, -4.73802]]) }));
    if (r.kind !== 'real') throw new Error(r.kind);
    expect(r.targets.map((t) => t.id)).toEqual(['in']);
    expect(r.targets[0]!.coordinates).toEqual(lonLatToXY(reg, [137.40674, -4.73802]));
    expect(r.targets[0]!.lonLat).toEqual([137.40674, -4.73802]);
    expect(r.warnings.join(' ')).toMatch(/out.*outside/);
  });

  it('Given файла цілей немає, Then targets = [] і попередження', async () => {
    const r = await loadRegion(patched({ 'targets.geojson': undefined }));
    if (r.kind !== 'real') throw new Error(r.kind);
    expect(r.targets).toEqual([]);
    expect(r.warnings.join(' ')).toMatch(/targets/);
    expect(r.issues).toEqual([]);
  });
});

describe('F3-AC5: photos і emergencyO2G', () => {
  const photo = (id: string, lon: number, lat: number) => ({
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: { id, url: `photos/${id}.jpg`, alt: 'Navcam', sourceUrl: 'https://mars.nasa.gov/raw', credit: 'NASA/JPL-Caltech', sol: 3100, camera: 'NAV_LEFT_B', locationAccuracy: 'rover-stop', status: 'verified' },
  });

  it('Given files.photos і photos.geojson, Then coordinates з lonLatToXY, поза сіткою відкинуто', async () => {
    const reg = await realRegion();
    const withPhotos = { ...reg, files: { ...reg.files, photos: 'photos/photos.geojson' } };
    const r = await loadRegion(
      patched({
        'region.json': json(withPhotos),
        'photos/photos.geojson': json({ type: 'FeatureCollection', features: [photo('a', 137.40674, -4.73802), photo('b', 138, -4.7)] }),
      }),
    );
    if (r.kind !== 'real') throw new Error(r.kind);
    expect(r.photos.map((p) => p.id)).toEqual(['a']);
    expect(r.photos[0]!.coordinates).toEqual(lonLatToXY(reg, [137.40674, -4.73802]));
    expect(r.warnings.join(' ')).toMatch(/photo b.*outside/i);
  });

  it('Given files.photos, але файла ще немає, Then photos = [] і попередження, не помилка', async () => {
    const reg = await realRegion();
    const r = await loadRegion(patched({ 'region.json': json({ ...reg, files: { ...reg.files, photos: 'photos/none.geojson' } }) }));
    if (r.kind !== 'real') throw new Error(r.kind);
    expect(r.photos).toEqual([]);
    expect(r.issues).toEqual([]);
    expect(r.warnings.join(' ')).toMatch(/photos/);
  });

  it('Given без files.photos, Then photos = []', async () => {
    const r = await loadRegion(disk);
    if (r.kind !== 'real') throw new Error(r.kind);
    expect(r.photos).toEqual([]);
  });

  it('Then region.json має model.emergencyO2G з evidence', async () => {
    const reg = await realRegion();
    expect(reg.model.emergencyO2G).toBe(360);
    expect(reg.model.evidence.emergencyO2G).toMatchObject({ status: 'assumption', url: expect.stringContaining('ntrs.nasa.gov') });
  });
});
