import { describe, expect, it } from 'vitest';
import { formatAmount, formatMinutes } from './format';

describe('F7 · formatMinutes (SPEC §7.4: N = floor(returnInS / 60))', () => {
  it('рахує цілі хвилини з еталону §7.4', () => {
    expect(formatMinutes(2880)).toBe('48');
    expect(formatMinutes(1980)).toBe('33');
    expect(formatMinutes(1380)).toBe('23');
    expect(formatMinutes(828)).toBe('13');
  });

  it('F7-AC4: невідоме й NaN показано як «—», а не «NaN»', () => {
    for (const v of [null, undefined, NaN, Infinity, -Infinity]) expect(formatMinutes(v)).toBe('—');
  });
});

describe('F7 · formatAmount', () => {
  it('округлює скінченне значення з одиницею', () => {
    expect(formatAmount(575.6, 'g')).toBe('576 g');
  });
  it('NaN / null → «—»', () => {
    expect(formatAmount(NaN, 'g')).toBe('—');
    expect(formatAmount(null, 'µSv')).toBe('—');
  });
});
