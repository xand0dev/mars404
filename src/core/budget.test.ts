import { describe, expect, it } from 'vitest';
import type { Resources } from '../contracts';
import { mockLimits, mockModel, REFERENCE_PLAN_TOTALS, REFERENCE_RETURN_MIN } from '../mocks';
import { budgetStatus, computeBudget, estimateReturn, reserveOf, validateBudgetInputs } from './budget';
import { testModel } from './test-grids';

const NO_PLAN: Resources = { time: 0, o2: 0, energy: 0, dose: null };
const PLAN: Resources = { ...REFERENCE_PLAN_TOTALS, energy: 0, dose: null };

const returnMinutes = (limits: Resources, elapsedS: number, planned: Resources) => {
  const budget = computeBudget(limits, mockModel, elapsedS);
  const { returnInS } = estimateReturn({ budget, reserve: reserveOf(limits, mockModel), model: mockModel, planned });
  return Math.floor(returnInS! / 60);
};

describe('budget · F5-AC1 еталон SPEC §7.4', () => {
  it('без плану, t = 0 → 48 хв', () => {
    expect(returnMinutes(mockLimits, 0, NO_PLAN)).toBe(REFERENCE_RETURN_MIN.noPlan);
  });

  it('план 900 с / 180 г → 33 хв', () => {
    expect(returnMinutes(mockLimits, 0, PLAN)).toBe(REFERENCE_RETURN_MIN.plan);
  });

  it('той самий план, t = 600 с → 23 хв', () => {
    expect(returnMinutes(mockLimits, 600, PLAN)).toBe(REFERENCE_RETURN_MIN.planAfter600s);
  });

  it('«O₂ −40%» → 13 хв', () => {
    expect(returnMinutes({ ...mockLimits, o2: mockLimits.o2 * 0.6 }, 0, PLAN)).toBe(REFERENCE_RETURN_MIN.o2Minus40);
  });

  it('невідома доза → incomplete, відома → estimated', () => {
    expect(budgetStatus(mockLimits, mockModel)).toBe('incomplete');
    expect(budgetStatus({ ...mockLimits, dose: 500 }, testModel({ doseUSvPerS: 0.01 }))).toBe('estimated');
  });
});

describe('budget · елементи формули', () => {
  it('бюджет від elapsed: енергія не тане з часом, доза null лишається null', () => {
    expect(computeBudget(mockLimits, mockModel, 600)).toEqual({ time: 3000, o2: 600, energy: 600, dose: null });
  });

  it('резерв береться від ліміту один раз', () => {
    expect(reserveOf(mockLimits, mockModel)).toEqual({ time: 720, o2: 144, energy: 120, dose: null });
  });

  it('доза входить у N, якщо відома', () => {
    const model = testModel({ doseUSvPerS: 0.1 });
    const limits = { ...mockLimits, dose: 100 };
    const { returnInS } = estimateReturn({ budget: computeBudget(limits, model, 0), reserve: reserveOf(limits, model), model, planned: { ...NO_PLAN, dose: 0 } });
    expect(returnInS).toBeCloseTo((100 - 20) / 0.1, 6);
  });

  it('нестача енергії — дефіцит, але не входить у N', () => {
    const planned = { ...PLAN, energy: 500 };
    const result = estimateReturn({ budget: computeBudget(mockLimits, mockModel, 0), reserve: reserveOf(mockLimits, mockModel), model: mockModel, planned });
    expect(result.deficits).toEqual(['energy']);
    expect(result.returnInS).toBe(1980);
  });

  it('від\'ємний запас → дефіцит із від\'ємним returnInS', () => {
    const planned = { ...PLAN, time: 4000 };
    const result = estimateReturn({ budget: computeBudget(mockLimits, mockModel, 0), reserve: reserveOf(mockLimits, mockModel), model: mockModel, planned });
    expect(result.returnInS).toBeLessThan(0);
    expect(result.deficits).toContain('time');
  });
});

describe('budget · F5-AC4 невалідні параметри', () => {
  it.each([
    ['speed ≤ 0', testModel({ speedMps: 0 }), mockLimits, 0],
    ['NaN', testModel({ o2GPerS: NaN }), mockLimits, 0],
    ['reserveFraction ≥ 1', testModel({ reserveFraction: 1 }), mockLimits, 0],
    ['від\'ємний ліміт', mockModel, { ...mockLimits, o2: -1 }, 0],
    ['NaN elapsed', mockModel, mockLimits, NaN],
  ])('%s → помилки', (_name, model, limits, elapsed) => {
    expect(validateBudgetInputs(model, limits, elapsed).length).toBeGreaterThan(0);
  });

  it('еталонні входи валідні', () => {
    expect(validateBudgetInputs(mockModel, mockLimits, 0)).toEqual([]);
  });
});
