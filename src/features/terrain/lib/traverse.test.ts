import { describe, expect, it } from 'vitest';
import { lonLatToXY } from '../../../contracts/planning';
import { mockGrid } from '../../../mocks';
import { testRegion } from './fixtures';
import { isRasterUrl, parseTraverse, traverseToXY, traverseVisible } from './traverse';

const line = (coords: unknown[][]) => ({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }],
});

describe('T12 parseTraverse — traverse.geojson (SPEC §6.0)', () => {
  it('LineString [lon, lat, elev] → лінії [lon, lat]', () => {
    const r = parseTraverse(line([[137.405, -4.735, -4400], [137.41, -4.74, -4410]]));
    expect(r.lines).toEqual([[[137.405, -4.735], [137.41, -4.74]]]);
    expect(r.warnings).toEqual([]);
  });

  it('не FeatureCollection → порожньо з попередженням', () => {
    const r = parseTraverse({ type: 'Feature' });
    expect(r.lines).toEqual([]);
    expect(r.warnings).toEqual([expect.stringMatching(/FeatureCollection/)]);
  });

  it('нечислові точки й не-LineString пропускаються з попередженням', () => {
    const json = line([[137.405, -4.735], ['x', -4.74], [137.41, null]]);
    json.features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [[137.4, -4.7]] }, properties: {} });
    const r = parseTraverse(json);
    expect(r.lines).toEqual([]);
    expect(r.warnings.join(' ')).toMatch(/2 invalid point/);
    expect(r.warnings.join(' ')).toMatch(/1 non-LineString/);
  });
});

describe('T12 traverseToXY — через lonLatToXY, лише в межах сітки', () => {
  const region = testRegion(mockGrid);

  it('точки конвертуються lonLatToXY (не вигадана формула)', () => {
    const pts: [number, number][] = [[137.405, -4.735], [137.41, -4.74]];
    const r = traverseToXY(region, mockGrid, [pts]);
    expect(r.lines).toEqual([pts.map((p) => lonLatToXY(region, p))]);
    expect(r.outside).toBe(0);
  });

  it('точки поза сіткою розривають лінію й рахуються', () => {
    const r = traverseToXY(region, mockGrid, [[[137.405, -4.735], [137.406, -4.736], [137.5, -4.736], [137.407, -4.737], [137.408, -4.738]]]);
    expect(r.lines).toHaveLength(2);
    expect(r.lines.every((l) => l.length === 2)).toBe(true);
    expect(r.outside).toBe(1);
  });

  it('уривки з однієї точки відкидаються (лінії не буде)', () => {
    const r = traverseToXY(region, mockGrid, [[[137.405, -4.735], [137.5, -4.736]]]);
    expect(r.lines).toEqual([]);
  });
});

describe('T12 traverseVisible і isRasterUrl', () => {
  const region = testRegion(mockGrid);
  it('без шару traverse у region.layers — видно, якщо є файл', () => {
    expect(traverseVisible({ ...region, files: { ...region.files, traverse: 'traverse.geojson' } }, {})).toBe(true);
  });
  it('без файлу — не видно', () => expect(traverseVisible(region, { traverse: true })).toBe(false));
  it('є шар traverse → слухаємося перемикача F3', () => {
    const r = {
      ...region,
      files: { ...region.files, traverse: 'traverse.geojson' },
      layers: [{ id: 'traverse', name: 'Traverse', kind: 'mission' as const, url: 'traverse.geojson', sourceIds: [], status: 'verified' as const, units: '', nativeResolutionM: null, gridResolutionM: 10, method: 'MMGIS', legend: [] }],
    };
    expect(traverseVisible(r, {})).toBe(false);
    expect(traverseVisible(r, { traverse: true })).toBe(true);
  });
  it('растр — png/jpg/webp; geojson — ні (не вантажимо як текстуру)', () => {
    expect(isRasterUrl('layers/thermal.png')).toBe(true);
    expect(isRasterUrl('hirise.JPG?v=2')).toBe(true);
    expect(isRasterUrl('traverse.geojson')).toBe(false);
    expect(isRasterUrl('elevation.f32')).toBe(false);
  });
});
