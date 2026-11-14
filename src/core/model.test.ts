import { describe, expect, it } from 'vitest';
import { validateModel } from './model';
import { testModel } from './test-grids';

describe('validateModel (SPEC §7.4 «invalid»)', () => {
  it('еталонна модель валідна', () => {
    expect(validateModel(testModel())).toEqual([]);
  });

  it.each([
    ['speedMps', { speedMps: 0 }],
    ['speedMps', { speedMps: NaN }],
    ['uphillFactor', { uphillFactor: -1 }],
    ['reserveFraction', { reserveFraction: 1 }],
    ['reserveFraction', { reserveFraction: -0.1 }],
    ['doseUSvPerS', { doseUSvPerS: -1 }],
    ['maxSlopeDeg', { maxSlopeDeg: Infinity }],
  ])('%s некоректний → помилка', (field, overrides) => {
    expect(validateModel(testModel(overrides))).toContain(field);
  });

  it('невідома доза (null) — не помилка', () => {
    expect(validateModel(testModel({ doseUSvPerS: null }))).toEqual([]);
  });
});
