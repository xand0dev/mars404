import { describe, expect, it } from 'vitest';
import { canPlaceMark, MARK_CURSOR, markCursorFor } from './markCursor';

const grid = { width: 4, height: 4, metersPerPixel: 10, originM: [0, 40] as [number, number] };

describe('курсор Add mark (#134)', () => {
  it('normal → Add mark → normal: звичайний, pin, знову звичайний', () => {
    expect(markCursorFor('off')).toBe('');
    expect(markCursorFor('valid')).toBe(MARK_CURSOR);
    expect(markCursorFor('off')).toBe('');
  });

  it('недоступна область — not-allowed', () => {
    expect(markCursorFor('invalid')).toBe('not-allowed');
  });

  it('pin: hotspot на кінчику, запасний crosshair', () => {
    expect(MARK_CURSOR).toMatch(/^url\("data:image\/svg\+xml,.+"\) 16 31, crosshair$/);
  });

  it('canPlaceMark: усередині сітки — так, поза нею — ні', () => {
    expect(canPlaceMark(grid, [15, 25])).toBe(true);
    expect(canPlaceMark(grid, [-5, 25])).toBe(false);
    expect(canPlaceMark(grid, [15, 45])).toBe(false);
  });
});
