import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSiteCardCache, loadSiteCard, parseSiteCard } from './siteCard';

const card = {
  schemaVersion: 1,
  id: 'gale',
  title: 'Gale Crater · Mount Sharp',
  subtitle: 'Curiosity rover field site',
  mode: 'eva',
  summary: 'Gale is an impact crater with Mount Sharp at its center.',
  whyGo: 'Compare exposed terrain along Mount Sharp.',
  facts: [
    { label: 'Center', value: '5.44° S, 137.70° E', sourceId: 'iau-gale' },
    { label: 'Rover', value: 'Curiosity', sourceId: 'nasa-gale' },
    { label: 'Relief', value: '~5.5 km', sourceId: 'nasa-gale' },
  ],
  image: {
    file: 'gale.jpg',
    alt: 'Orbital view of Gale Crater',
    credit: 'NASA/JPL-Caltech',
    sourceUrl: 'https://science.nasa.gov/gale',
    status: 'verified',
  },
  sources: [
    { id: 'iau-gale', title: 'IAU Gale', url: 'https://example.test/iau', credit: 'IAU / USGS', accessedAt: '2026-11-15', status: 'verified' },
    { id: 'nasa-gale', title: 'NASA Gale', url: 'https://example.test/nasa', credit: 'NASA/JPL-Caltech', accessedAt: '2026-11-15', status: 'verified' },
  ],
};

beforeEach(() => {
  clearSiteCardCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('#112 · site card loader', () => {
  it('Given валідний schemaVersion 1; When двічі завантажено Gale; Then fetch один і результат кешований', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => card });
    vi.stubGlobal('fetch', fetchMock);

    const first = await loadSiteCard('gale');
    const second = await loadSiteCard('gale');

    expect(first).toEqual(card);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/data\/sites\/gale\.json$/);
  });

  it('Given мережа або файл недоступні; Then повертає null без console.warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    await expect(loadSiteCard('gale')).resolves.toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('Given невалідні необов’язкові поля; Then попереджає і пропускає їх, а картка не падає', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const parsed = parseSiteCard(
      {
        ...card,
        subtitle: 42,
        facts: [...card.facts, { label: '', value: 'bad', sourceId: 'missing' }],
        image: { ...card.image, sourceUrl: 'not-a-url' },
      },
      'gale',
    );

    expect(parsed).toMatchObject({ id: 'gale', subtitle: undefined, image: null });
    expect(parsed?.facts).toHaveLength(3);
    expect(warn).toHaveBeenCalled();
  });

  it('Given неправильна схема або id; Then повертає null', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parseSiteCard({ ...card, schemaVersion: 2 }, 'gale')).toBeNull();
    expect(parseSiteCard({ ...card, id: 'jezero' }, 'gale')).toBeNull();
  });

  it('Given 5 валідних фактів (межа #111: 3–5); Then показує всі 5', () => {
    const extra = [
      { label: 'Mission', value: 'MSL', sourceId: 'nasa-gale' },
      { label: 'Landing', value: '2012', sourceId: 'nasa-gale' },
    ];
    expect(parseSiteCard({ ...card, facts: [...card.facts, ...extra] }, 'gale')?.facts).toHaveLength(5);
  });
});
