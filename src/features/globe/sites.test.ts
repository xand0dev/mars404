import { describe, expect, it } from 'vitest';
import { GALE_ID, SITES, siteById } from './sites';

describe('sites — точки глобуса з IAU Gazetteer (F1-AC2, F1-AC4)', () => {
  it('Given список; Then 3–5 точок з унікальними id', () => {
    expect(SITES.length).toBeGreaterThanOrEqual(3);
    expect(SITES.length).toBeLessThanOrEqual(5);
    expect(new Set(SITES.map((s) => s.id)).size).toBe(SITES.length);
  });

  it('Given список; Then змодельовано лише Gale, і його id збігається з MissionState.site', () => {
    expect(SITES.filter((s) => s.modelled).map((s) => s.id)).toEqual([GALE_ID]);
    expect(GALE_ID).toBe('gale');
  });

  it('Given кожна точка; Then координати planetocentric, +East 0–360, з посиланням на сторінку Gazetteer', () => {
    for (const s of SITES) {
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
