import { describe, expect, it } from 'vitest';
import type { Annotation } from '../../contracts';
import { mergeImported, parseAnnotationsFile, toAnnotationsFile } from './annotationsFile';

const mark = (id: string, over: Partial<Annotation> = {}): Annotation => ({
  id,
  kind: 'note',
  coordinates: [10, 20],
  radiusM: 20,
  text: 'loose sand',
  createdAt: '2026-11-14T10:00:00.000Z',
  origin: 'this-eva',
  ...over,
});

describe('F1-AC6 · експорт AnnotationsFile', () => {
  it('Given мітки; When експорт; Then schemaVersion 1, site, exportedAt і мітки', () => {
    const file = toAnnotationsFile('gale', [mark('a')], new Date('2026-11-14T12:00:00Z'));
    expect(file).toEqual({ schemaVersion: 1, site: 'gale', exportedAt: '2026-11-14T12:00:00.000Z', annotations: [mark('a')] });
  });

  it('експорт → імпорт: ті самі мітки, але origin = "imported"', () => {
    const text = JSON.stringify(toAnnotationsFile('gale', [mark('a'), mark('b', { kind: 'impassable' })]));
    const res = parseAnnotationsFile(text);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.annotations).toEqual([mark('a', { origin: 'imported' }), mark('b', { kind: 'impassable', origin: 'imported' })]);
  });
});

describe('F1-AC6 · імпорт невалідного файла', () => {
  const valid = () => JSON.parse(JSON.stringify(toAnnotationsFile('gale', [mark('a')]))) as Record<string, unknown>;
  const withMark = (over: Record<string, unknown>) => ({ ...valid(), annotations: [{ ...mark('a'), ...over }] });

  it.each<[string, string]>([
    ['не JSON', '{oops'],
    ['не обʼєкт', '[]'],
    ['інша schemaVersion', JSON.stringify({ ...valid(), schemaVersion: 2 })],
    ['невідомий site', JSON.stringify({ ...valid(), site: 'jezero' })],
    ['site іншого району (не поточний)', JSON.stringify({ ...valid(), site: 'columbia-hills' })],
    ['annotations не масив', JSON.stringify({ ...valid(), annotations: {} })],
    ['невідомий вид', JSON.stringify(withMark({ kind: 'lava' }))],
    ['координати не числа', JSON.stringify(withMark({ coordinates: ['1', 2] }))],
    ['координати null (NaN у JSON)', JSON.stringify(withMark({ coordinates: [null, 2] }))],
    ['відʼємний радіус', JSON.stringify(withMark({ radiusM: -1 }))],
    ['порожній id', JSON.stringify(withMark({ id: '' }))],
    ['текст не рядок', JSON.stringify(withMark({ text: 5 }))],
    ['час не ISO', JSON.stringify(withMark({ createdAt: 'yesterday' }))],
    ['дубль id', JSON.stringify({ ...valid(), annotations: [mark('a'), mark('a')] })],
  ])('%s → помилка з текстом', (_, text) => {
    const res = parseAnnotationsFile(text);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/\S/);
  });
});

describe('mergeImported', () => {
  it('поточні лишаються, імпортовані додаються; той самий id — імпортована', () => {
    const cur = [mark('a'), mark('b')];
    const imp = [mark('b', { text: 'new', origin: 'imported' }), mark('c', { origin: 'imported' })];
    expect(mergeImported(cur, imp).map((m) => [m.id, m.text])).toEqual([
      ['a', 'loose sand'],
      ['b', 'new'],
      ['c', 'loose sand'],
    ]);
  });
});

describe('#105 · site через isSiteId і поточний район', () => {
  it('Given відкрито Columbia Hills; When імпорт файла columbia-hills; Then ok', () => {
    const text = JSON.stringify(toAnnotationsFile('columbia-hills', [mark('a')]));
    const res = parseAnnotationsFile(text, 'columbia-hills');
    expect(res.ok).toBe(true);
  });

  it('Given відкрито Columbia Hills; When імпорт файла Gale; Then помилка з обома назвами', () => {
    const res = parseAnnotationsFile(JSON.stringify(toAnnotationsFile('gale', [mark('a')])), 'columbia-hills');
    expect(res).toEqual({ ok: false, error: 'marks are for site "gale", not "columbia-hills"' });
  });
});
