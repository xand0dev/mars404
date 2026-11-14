import { describe, expect, it } from 'vitest';
import { SOIL_DN, SOIL_MAX_SLOWDOWN, soilFromNightDN } from '../contracts/planning';
import { edgeBetween } from './edge';
import { makeTestGrid, testModel } from './test-grids';

// Ґрунт (assumption): пухкий пісок сповільнює ходьбу, скеля — ні; без шару модель як раніше.
describe('soilFromNightDN — нічна яскравість THEMIS → множник часу', () => {
  it('найпухкіше (156) → 1 + SOIL_MAX_SLOWDOWN; щільне (≥ середини легенди) → 1', () => {
    expect(soilFromNightDN(SOIL_DN.loose)).toBeCloseTo(1 + SOIL_MAX_SLOWDOWN);
    expect(soilFromNightDN(SOIL_DN.firm)).toBe(1);
    expect(soilFromNightDN(255)).toBe(1);
  });
  it('лінійно між межами; NaN → 1 (невідомо ≠ сповільнення)', () => {
    expect(soilFromNightDN((SOIL_DN.loose + SOIL_DN.firm) / 2)).toBeCloseTo(1 + SOIL_MAX_SLOWDOWN / 2);
    expect(soilFromNightDN(NaN)).toBe(1);
  });
});

describe('edgeBetween — ґрунт множить час ребра', () => {
  it('пісок під обома клітинками → час × 1.4; без шару — як раніше', () => {
    const grid = makeTestGrid({ width: 2, height: 1 });
    const base = edgeBetween(grid, testModel(), 0, 1)!;
    const sandy = edgeBetween({ ...grid, soil: new Float32Array([1.4, 1.4]) }, testModel(), 0, 1)!;
    expect(sandy.time).toBeCloseTo(base.time * 1.4);
    expect(sandy.dist).toBe(base.dist);
  });
});
