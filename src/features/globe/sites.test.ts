import { describe, expect, it } from 'vitest';
import { COLUMBIA_HILLS_ID, GALE_ID, SITES, canOpenSite, modeLabel, siteById, type Site } from './sites';
import { isSiteId } from '../../contracts/planning';

describe('sites — точки глобуса з IAU Gazetteer (F1-AC2, F1-AC4)', () => {
  it('Given список; Then 3–6 точок з унікальними id', () => {
    expect(SITES.length).toBeGreaterThanOrEqual(3);
    expect(SITES.length).toBeLessThanOrEqual(6);
    expect(new Set(SITES.map((s) => s.id)).size).toBe(SITES.length);
  });

  it('#105 режими: eva — Gale і Columbia Hills, overview — Olympus Mons і Valles Marineris, card — Jezero і Meridiani', () => {
    const ids = (mode: Site['mode']) => SITES.filter((s) => s.mode === mode).map((s) => s.id);
    expect(ids('eva')).toEqual([GALE_ID, COLUMBIA_HILLS_ID]);
    expect(ids('overview')).toEqual(['olympus-mons', 'valles-marineris']);
    expect(ids('card')).toEqual(['jezero', 'meridiani']);
    expect(GALE_ID).toBe('gale');
  });

  it('#105 відкриваються рівно точки з SiteId (пакет public/data/<id> є в main)', () => {
    const openable = SITES.filter(canOpenSite).map((s) => s.id);
    expect(openable).toEqual([GALE_ID, COLUMBIA_HILLS_ID, 'olympus-mons', 'valles-marineris']);
    expect(openable.every(isSiteId)).toBe(true);
    expect(SITES.filter((s) => !canOpenSite(s)).every((s) => s.mode === 'card')).toBe(true);
  });

  it('#105 «coming soon» не відкривається, навіть якщо режим eva / overview', () => {
    const soon: Site = { ...siteById('olympus-mons')!, comingSoon: true };
    expect(canOpenSite(soon)).toBe(false);
    expect(modeLabel(soon)).toMatch(/Coming soon/);
  });

  it('#105 картка каже режим словами', () => {
    expect(modeLabel(siteById(COLUMBIA_HILLS_ID)!)).toBe('EVA site — plan a route');
    expect(modeLabel(siteById('valles-marineris')!)).toBe('Overview — terrain only, no EVA planning');
    expect(modeLabel(siteById('jezero')!)).toMatch(/^Card only/);
  });

  it('Columbia Hills: центр пакета (Trek spirit_waypoints), без назви в Gazetteer', () => {
    const ch = siteById(COLUMBIA_HILLS_ID);
    expect(ch?.latDeg).toBeCloseTo(-14.599, 3);
    expect(ch?.lonEastDeg).toBeCloseTo(175.528, 3);
    expect(ch?.source.url).toMatch(/^https:\/\/trek\.nasa\.gov\//);
  });

  it('Given кожна точка; Then координати planetocentric, +East 0–360, з посиланням на сторінку Gazetteer', () => {
    for (const s of SITES.filter((x) => x.id !== COLUMBIA_HILLS_ID)) {
      expect(s.latDeg).toBeGreaterThanOrEqual(-90);
      expect(s.latDeg).toBeLessThanOrEqual(90);
      expect(s.lonEastDeg).toBeGreaterThanOrEqual(0);
      expect(s.lonEastDeg).toBeLessThan(360);
      expect(s.source.url).toMatch(/^https:\/\/planetarynames\.wr\.usgs\.gov\/Feature\/\d+$/);
      expect(s.source.status).toBe('verified');
      expect(s.summary.length).toBeGreaterThan(0);
    }
  });

  it('еталон: Gale = Gazetteer Feature/2071, MDIM 2.1 центр −5.44°, 137.70°E', () => {
    const gale = siteById(GALE_ID);
    expect(gale?.latDeg).toBe(-5.44);
    expect(gale?.lonEastDeg).toBe(137.7);
    expect(gale?.source.url).toBe('https://planetarynames.wr.usgs.gov/Feature/2071');
  });

  it('Given невідомий id; Then undefined', () => {
    expect(siteById('nowhere')).toBeUndefined();
  });
});
