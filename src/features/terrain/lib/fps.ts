// Замір FPS для F2-AC5: прогрів, потім 60 секундних вибірок, медіана.
export const FPS_WARMUP_S = 5;
export const FPS_WINDOW_S = 60;

/** Замір вмикається параметром ?fps у URL. */
export function fpsEnabled(): boolean {
  return typeof location !== 'undefined' && new URLSearchParams(location.search).has('fps');
}

export function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}
