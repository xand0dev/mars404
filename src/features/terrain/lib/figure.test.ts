import { describe, expect, it } from 'vitest';
import { figureFor } from './figure';

describe('figureFor · хто йде маршрутом', () => {
  it('Given режим walk, Then астронавт зростом 1,85 м з анімацією ходи', () => {
    expect(figureFor('walk')).toEqual({ kind: 'astronaut', size: { axis: 'y', meters: 1.85 }, animated: true });
  });

  it('Given режим rover, Then марсохід Curiosity шириною 2,7 м, без анімації ходи', () => {
    expect(figureFor('rover')).toEqual({ kind: 'rover', size: { axis: 'x', meters: 2.7 }, animated: false });
  });
});
