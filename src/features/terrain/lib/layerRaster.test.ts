import { describe, expect, it } from 'vitest';
import type { Layer } from '../../../contracts';
import { smallGrid } from './fixtures';
import { RENDER_ORDER, gridLayerKind, gridLayerRGBA, legendColor } from './layerRaster';

// Легенда шару slope з пакета F3 (region.json).
const SLOPE_LEGEND = [
  { value: 0, label: '0° flat', color: '#2f6f4f' },
  { value: 15, label: '15° moderate', color: '#c9a227' },
  { value: 25, label: '25° model limit', color: '#c0392b' },
];
const layer = (over: Partial<Layer>): Layer => ({
  id: 'x', name: 'X', kind: 'slope', url: 'slope.f32', sourceIds: [], status: 'assumption', units: '°',
  nativeResolutionM: 1, gridResolutionM: 10, method: 'test', legend: SLOPE_LEGEND, ...over,
});

describe('legendColor — колір за легендою шару F3', () => {
  it('точно на зупинках', () => {
    expect(legendColor(SLOPE_LEGEND, 0)).toEqual([0x2f, 0x6f, 0x4f]);
    expect(legendColor(SLOPE_LEGEND, 25)).toEqual([0xc0, 0x39, 0x2b]);
  });
  it('лінійно між зупинками', () => {
    expect(legendColor(SLOPE_LEGEND, 7.5)).toEqual([Math.round((0x2f + 0xc9) / 2), Math.round((0x6f + 0xa2) / 2), Math.round((0x4f + 0x27) / 2)]);
  });
  it('за межами — колір крайньої зупинки; порядок зупинок неважливий', () => {
    expect(legendColor(SLOPE_LEGEND, 40)).toEqual([0xc0, 0x39, 0x2b]);
    expect(legendColor([...SLOPE_LEGEND].reverse(), -5)).toEqual([0x2f, 0x6f, 0x4f]);
  });
  it('NaN або порожня легенда → null (не вигадуємо колір)', () => {
    expect(legendColor(SLOPE_LEGEND, NaN)).toBeNull();
    expect(legendColor([], 5)).toBeNull();
  });
});

describe('gridLayerKind — як F2 малює шар', () => {
  it('растр за url', () => expect(gridLayerKind(layer({ kind: 'thermal', url: 'layers/themis.png' }))).toBe('raster'));
  it('slope / terrain з .f32 — з сітки', () => {
    expect(gridLayerKind(layer({ kind: 'slope', url: 'slope.f32' }))).toBe('slope');
    expect(gridLayerKind(layer({ kind: 'terrain', url: 'elevation.f32' }))).toBe('terrain');
  });
  it('без легенди або інший тип не з растра — не малюється (чесно в легенді)', () => {
    expect(gridLayerKind(layer({ kind: 'slope', url: 'slope.f32', legend: [] }))).toBeNull();
    expect(gridLayerKind(layer({ kind: 'thermal', url: 'themis.f32' }))).toBeNull();
    expect(gridLayerKind(layer({ kind: 'mission', url: 'traverse.geojson' }))).toBeNull();
  });
});

describe('gridLayerRGBA — шар slope зі схилів сітки', () => {
  it('колір клітинки = legendColor(схил), непрозорий; NaN → прозоро', () => {
    const grid = smallGrid();
    grid.slopesDeg[5] = NaN;
    const rgba = gridLayerRGBA(grid, 'slope', SLOPE_LEGEND, { northUp: true });
    expect(Array.from(rgba.slice(0, 4))).toEqual([...(legendColor(SLOPE_LEGEND, 5) as number[]), 255]);
    expect(rgba[5 * 4 + 3]).toBe(0);
  });
  it('для 3D рядки перевернуто (рядок 0 текстури — південь)', () => {
    const grid = smallGrid();
    grid.slopesDeg[0] = 25;
    const up = gridLayerRGBA(grid, 'slope', SLOPE_LEGEND, { northUp: true });
    const tex = gridLayerRGBA(grid, 'slope', SLOPE_LEGEND, { northUp: false });
    const lastRow = (grid.height - 1) * grid.width * 4;
    expect(Array.from(tex.slice(lastRow, lastRow + 4))).toEqual(Array.from(up.slice(0, 4)));
  });
  it('terrain — з висот', () => {
    const grid = smallGrid();
    const legend = [{ value: 0, label: 'low', color: '#000000' }, { value: 30, label: 'high', color: '#ffffff' }];
    const rgba = gridLayerRGBA(grid, 'terrain', legend, { northUp: true });
    expect(Array.from(rgba.slice(2 * 4, 2 * 4 + 3))).toEqual(legendColor(legend, 2));
  });
});

describe('порядок малювання 3D', () => {
  it('лінії й маркери — після напівпрозорої накладки ореолу/blocked, інакше вона їх перекриває', () => {
    expect(RENDER_ORDER.lines).toBeGreaterThan(RENDER_ORDER.overlay);
    expect(RENDER_ORDER.markers).toBeGreaterThan(RENDER_ORDER.overlay);
    expect(RENDER_ORDER.segment).toBeGreaterThan(RENDER_ORDER.lines);
    expect(RENDER_ORDER.layers).toBeLessThan(RENDER_ORDER.overlay);
  });
});
