import { describe, expect, it } from 'vitest';
import { dnFromLegendColor, soilFromRGBA, type LegendStop } from './soil';

// Ґрунт з PNG шару THEMIS night → множник часу ходьби.
// #137: PNG кольоровий (легенда #1b1f5e → #b0306a → #f7c548), DN відновлюємо за легендою шару з region.json.
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const legend = (lo: number, hi: number): LegendStop[] => [
  { value: lo, label: 'low', color: '#1b1f5e' },
  { value: (lo + hi) / 2, label: 'mid', color: '#b0306a' },
  { value: hi, label: 'high', color: '#f7c548' },
];
/** Як pipeline/themis.colorize: лінійно між трьома точками, округлення до байта. */
const colorize = (dn: number, lo: number, hi: number) => {
  const stops = ['#1b1f5e', '#b0306a', '#f7c548'].map(hex);
  const t = Math.min(1, Math.max(0, (dn - lo) / (hi - lo))) * 2;
  const k = Math.min(Math.floor(t), 1);
  const f = t - k;
  return stops[k]!.map((a, i) => Math.round(a + (stops[k + 1]![i]! - a) * f));
};

describe('dnFromLegendColor (#137)', () => {
  it('Given колір із точок легенди, Then DN точки', () => {
    const L = legend(150, 250);
    expect(dnFromLegendColor(hex('#1b1f5e'), L)).toBe(150);
    expect(dnFromLegendColor(hex('#b0306a'), L)).toBe(200);
    expect(dnFromLegendColor(hex('#f7c548'), L)).toBe(250);
  });

  it('Given колір, пофарбований як у pipeline, Then DN відновлюється з точністю < 0,5', () => {
    const L = legend(156, 255);
    for (let dn = 156; dn <= 255; dn += 3.3) expect(Math.abs(dnFromLegendColor(colorize(dn, 156, 255), L) - dn)).toBeLessThan(0.5);
  });
});

describe('soilFromRGBA', () => {
  it('без легенди (сірий PNG): DN = червоний канал; прозора клітинка — без даних → 1', () => {
    const s = soilFromRGBA([156, 156, 156, 255, 255, 255, 255, 255, 0, 0, 0, 0], 3);
    expect(Array.from(s).map((v) => +v.toFixed(2))).toEqual([1.4, 1, 1]);
  });

  it('#137: Given кольоровий PNG і легенда, Then множник за справжнім DN, а не за червоним каналом', () => {
    const L = legend(156, 255);
    // DN 230 (щільний ґрунт): червоний канал ≈ 211 — випадково теж «щільний»; DN 180: червоний ≈ 121 → було б 1,4.
    const px = [...colorize(230, 156, 255), 255, ...colorize(180, 156, 255), 255];
    const s = Array.from(soilFromRGBA(px, 2, L)).map((v) => +v.toFixed(3));
    expect(s[0]).toBe(1);
    // soilFromNightDN(180): t = (205,5 − 180) / 49,5 ≈ 0,515 → 1 + 0,4 × 0,515 ≈ 1,206
    expect(s[1]).toBeCloseTo(1.206, 2);
  });
});
