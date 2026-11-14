import { describe, expect, it } from 'vitest';
import { soilFromRGBA } from './soil';

// Ґрунт з PNG шару THEMIS night (RGBA, сірий) → множник часу ходьби.
describe('soilFromRGBA', () => {
  it('RGBA: прозора клітинка — без даних → 1', () => {
    const s = soilFromRGBA([156, 156, 156, 255, 255, 255, 255, 255, 0, 0, 0, 0], 3);
    expect(Array.from(s).map((v) => +v.toFixed(2))).toEqual([1.4, 1, 1]);
  });
});
