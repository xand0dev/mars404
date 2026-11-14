// Форматування чисел для HUD і панелей (F7). Невідоме чи NaN — завжди «—» (SPEC §7.6, F7-AC4).
export const DASH = '—';

const known = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);

/** «Return in N min»: N = floor(s / 60) (SPEC §7.4). */
export function formatMinutes(seconds: number | null | undefined): string {
  return known(seconds) ? String(Math.floor(seconds / 60)) : DASH;
}

/** Ціле значення з одиницею або «—». */
export function formatAmount(value: number | null | undefined, unit: string): string {
  return known(value) ? `${Math.round(value)} ${unit}` : DASH;
}
