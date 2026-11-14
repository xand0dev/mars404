import type { ModelCoefficients } from '../contracts';

const isNonNegative = (v: number) => Number.isFinite(v) && v >= 0;

/** Назви некоректних коефіцієнтів (SPEC §7.4 «invalid»); порожній масив — модель валідна. */
export function validateModel(model: ModelCoefficients): (keyof ModelCoefficients)[] {
  const errors: (keyof ModelCoefficients)[] = [];

  if (!(Number.isFinite(model.speedMps) && model.speedMps > 0)) errors.push('speedMps');
  for (const key of ['uphillFactor', 'downhillFactor', 'o2GPerS', 'energyWhPerM', 'hazardWeight'] as const) {
    if (!isNonNegative(model[key])) errors.push(key);
  }
  if (model.doseUSvPerS !== null && !isNonNegative(model.doseUSvPerS)) errors.push('doseUSvPerS');
  if (!(Number.isFinite(model.maxSlopeDeg) && model.maxSlopeDeg > 0 && model.maxSlopeDeg < 90)) errors.push('maxSlopeDeg');
  if (!(Number.isFinite(model.reserveFraction) && model.reserveFraction >= 0 && model.reserveFraction < 1)) errors.push('reserveFraction');

  return errors;
}
