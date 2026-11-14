import { describe, expect, it } from 'vitest';
import { cellCenter } from '../../../contracts/planning';
import { planThrough, smallGrid } from './fixtures';
import { segmentMarker } from './segment';

describe('F2-AC3 маркер вибраного відрізка', () => {
  const grid = smallGrid();
  const plan = { ...planThrough(grid, [[0, 0], [1, 0], [2, 0], [2, 1]]), legs: [0, 2] };

  it('середина відрізка i, підпис 1-based з ногою (як у таблиці F4)', () => {
    const m = segmentMarker(plan, 2);
    const [ax, ay] = cellCenter(grid, 2, 0);
    const [bx, by] = cellCenter(grid, 2, 1);
    expect(m?.mid).toEqual([(ax + bx) / 2, (ay + by) / 2]);
    expect(m?.label).toBe('Segment 3 · leg 2');
  });

  it('перша нога', () => expect(segmentMarker(plan, 0)?.label).toBe('Segment 1 · leg 1'));

  it('null, поза межами або без плану → немає маркера', () => {
    expect(segmentMarker(plan, null)).toBeNull();
    expect(segmentMarker(plan, 9)).toBeNull();
    expect(segmentMarker(null, 0)).toBeNull();
  });
});
