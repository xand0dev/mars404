import { describe, expect, it } from 'vitest';
import { parseTextureMeta, TEXTURE_META_PATH } from './texture';

describe('parseTextureMeta — опис текстури з public/data/mars (F1-AC4)', () => {
  const ok = { file: 'mars_2k.jpg', credit: 'NASA / USGS', sourceUrl: 'https://example.org/x' };

  it('Given валідний JSON; Then meta з file, credit, sourceUrl', () => {
    expect(parseTextureMeta(ok)).toEqual(ok);
  });

  it.each([
    ['null', null],
    ['без credit', { file: 'a.jpg', sourceUrl: 'https://x' }],
    ['порожній credit', { ...ok, credit: '' }],
    ['без sourceUrl', { file: 'a.jpg', credit: 'c' }],
    ['file з шляхом угору', { ...ok, file: '../gale/hirise.jpg' }],
    ['file не рядок', { ...ok, file: 3 }],
  ])('Given %s; Then null (текстуру не показуємо без джерела)', (_, v) => {
    expect(parseTextureMeta(v)).toBeNull();
  });

  it('шлях мета-файлу — у public/data/mars', () => {
    expect(TEXTURE_META_PATH).toBe('mars/source.json');
  });
});
