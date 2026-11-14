import { describe, expect, it } from 'vitest';
import { dataUrl } from '../../../contracts/planning';
import { median } from './fps';
import { regionFileUrl } from './paths';

describe('regionFileUrl — файли регіону через dataUrl()', () => {
  it('шлях відносно папки регіону', () => expect(regionFileUrl('gale', 'hirise.jpg')).toBe(dataUrl('gale/hirise.jpg')));
  it('шлях уже з префіксом регіону не дублюється', () => expect(regionFileUrl('gale', 'gale/layers/a.png')).toBe(dataUrl('gale/layers/a.png')));
  it('абсолютний URL лишається', () => expect(regionFileUrl('gale', 'https://x/y.png')).toBe('https://x/y.png'));
});

describe('F2-AC5 median', () => {
  it('непарна кількість', () => expect(median([30, 60, 45])).toBe(45));
  it('парна кількість', () => expect(median([10, 20, 30, 40])).toBe(25));
  it('порожньо → null', () => expect(median([])).toBeNull());
});
