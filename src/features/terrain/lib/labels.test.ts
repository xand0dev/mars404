import { describe, expect, it } from 'vitest';
import type { Target } from '../../../contracts';
import { labelAspect, labelledTargetIds, stackLabels } from './labels';

const t = (id: string): Target => ({ id, name: id, coordinates: [0, 0] }) as unknown as Target;

describe('підписи цілей у 3D', () => {
  it('labelledTargetIds: обрані й наведена; невідомі id відкинуто', () => {
    const targets = [t('a'), t('b'), t('c')];
    expect([...labelledTargetIds(targets, ['a'], null)]).toEqual(['a']);
    expect([...labelledTargetIds(targets, ['a'], 'c')].sort()).toEqual(['a', 'c']);
    expect([...labelledTargetIds(targets, ['zz'], 'yy')]).toEqual([]);
  });

  it('stackLabels: далекі лишаються на місці, ті, що злипаються, — сходинками вгору', () => {
    const box = (x: number, y: number) => ({ x, y, w: 100, h: 20 });
    expect(stackLabels([box(0, 100), box(500, 100)])).toEqual([0, 0]);
    expect(stackLabels([box(0, 100), box(30, 100), box(10, 100)])).toEqual([0, 1, 2]);
    // третій злипається лише з першим — бере вільну сходинку 1
    expect(stackLabels([box(0, 100), box(300, 100), box(20, 100)])).toEqual([0, 0, 1]);
    expect(stackLabels([{ x: NaN, y: 0, w: 1, h: 1 }])).toEqual([0]);
  });

  it('labelAspect росте з довжиною тексту', () => {
    expect(labelAspect('● Mont Mercou')).toBeGreaterThan(labelAspect('● A'));
  });
});
