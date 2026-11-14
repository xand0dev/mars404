// Рівень шкали ресурсу (F7) за правилом SPEC §7.4: у нормі, якщо need ≤ value − reserve (рівність допустима).
export type GaugeLevel = 'ok' | 'deficit' | 'unknown';

const known = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);

/**
 * value — залишок (budget_k), reserve — резерв (reserveFraction × limits_k), need — планова витрата.
 * Без reserve рахуємо від нуля. Невідомий залишок — 'unknown', ніколи не 'ok'.
 */
export function gaugeLevel(value: number | null | undefined, reserve?: number | null, need?: number | null): GaugeLevel {
  if (!known(value)) return 'unknown';
  const floor = known(reserve) ? reserve : 0;
  const spend = known(need) ? need : 0;
  return value - floor >= spend ? 'ok' : 'deficit';
}
