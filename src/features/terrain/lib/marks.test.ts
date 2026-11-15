import { describe, expect, it } from 'vitest';
import { mockGrid } from '../../../mocks';
import { cellCenter } from '../../../contracts/planning';
import type { Annotation, RoutePlan } from '../../../contracts';
import { createMark, keyboardMarkPoint, markLabel, planToXY, r3fToXY, snapToCell, visibleMarks, DEFAULT_MARK_RADIUS_M } from './marks';

describe('marks (F2-AC8, SPEC §7.12)', () => {
  it('snapToCell: центр клітинки; поза сіткою — null', () => {
    expect(snapToCell(mockGrid, [12.3, 1275])).toEqual(cellCenter(mockGrid, 0, 1));
    expect(snapToCell(mockGrid, [-5, 10])).toBeNull();
    expect(snapToCell(mockGrid, [NaN, 10])).toBeNull();
  });

  it('planToXY — обернене до planPoint; r3fToXY — обернене до toR3F', () => {
    expect(planToXY(mockGrid, 0.5, 0.5)).toEqual(cellCenter(mockGrid, 0, 0));
    expect(r3fToXY({ x: 100, z: -200 })).toEqual([100, 200]);
  });

  it('createMark: центр клітинки, радіус за замовчуванням, origin this-eva, текст без пробілів по краях', () => {
    const m = createMark(mockGrid, [643, 637], 'impassable', '  soft sand ', { now: new Date('2026-11-14T15:00:00Z'), id: 'm1' })!;
    expect(m).toEqual({ id: 'm1', kind: 'impassable', coordinates: cellCenter(mockGrid, 64, 64), radiusM: DEFAULT_MARK_RADIUS_M, text: 'soft sand', createdAt: '2026-11-14T15:00:00.000Z', origin: 'this-eva' });
    expect(createMark(mockGrid, [5000, 5000], 'note')).toBeNull();
  });

  it('markLabel: вид, текст, імпорт з попереднього виходу', () => {
    const base: Annotation = { id: 'a', kind: 'hazard', coordinates: [5, 5], radiusM: 20, text: 'loose rock', createdAt: '', origin: 'imported' };
    expect(markLabel(base)).toBe('Hazard mark: loose rock (previous EVA)');
    expect(markLabel({ ...base, text: '', origin: 'this-eva' })).toBe('Hazard mark');
  });

  it('visibleMarks відкидає мітки поза сіткою й з невалідними числами', () => {
    const ok: Annotation = { id: 'a', kind: 'note', coordinates: [5, 5], radiusM: 20, text: '', createdAt: '', origin: 'this-eva' };
    expect(visibleMarks(mockGrid, [ok, { ...ok, id: 'b', coordinates: [-9, 5] }, { ...ok, id: 'c', radiusM: NaN }]).map((m) => m.id)).toEqual(['a']);
  });

  it('keyboardMarkPoint: середина обраного відрізка', () => {
    const plan = { segments: [{ from: [0, 0], to: [10, 20] }] } as unknown as RoutePlan;
    expect(keyboardMarkPoint(plan, 0)).toEqual([5, 10]);
    expect(keyboardMarkPoint(plan, null)).toBeNull();
    expect(keyboardMarkPoint(null, 0)).toBeNull();
  });
});
