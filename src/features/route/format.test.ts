import { describe, expect, it } from 'vitest';
import { describeFailure, formatDose, formatSlope, pointLabels } from './format';

describe('format · підписи', () => {
  const labels = pointLabels(['Site A', 'Site B']);

  it('точки: 0 = Start, 1…n = цілі, n+1 = Base', () => {
    expect(labels).toEqual(['Start', 'Site A', 'Site B', 'Base']);
  });

  it.each([
    [{ code: 'out-of-grid', pointIndex: 2 } as const, 'out-of-grid · point 2 (Site B) is outside the map grid'],
    [{ code: 'blocked-point', pointIndex: 1 } as const, 'blocked-point · point 1 (Site A) is on a blocked or NoData cell'],
    [{ code: 'disconnected', pointIndex: 3 } as const, 'disconnected · point 3 (Base) is in an isolated area'],
    [{ code: 'no-path-leg', legIndex: 1 } as const, 'no-path-leg · no path on leg 1 (Site A → Site B)'],
    [{ code: 'invalid-params' } as const, 'invalid-params · model parameters are invalid'],
  ])('%o', (reason, text) => {
    expect(describeFailure(reason, labels)).toBe(text);
  });

  it('dose null → «no data», ніколи не 0', () => {
    expect(formatDose(null)).toBe('no data');
    expect(formatDose(0.1234)).toBe('0.12 µSv');
  });

  it('схил зі знаком', () => {
    expect(formatSlope(5.71)).toBe('+5.7°');
    expect(formatSlope(-5.71)).toBe('−5.7°');
  });
});
