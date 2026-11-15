import { describe, expect, it } from 'vitest';
import type { Segment, SurfacePhoto, Target, TargetPhoto, XY } from '../../contracts';
import { mockTargets } from '../../mocks';
import { findNearestPhoto, locationAccuracyNote, photoCameraName, photoCandidates, photoCandidatesFromTargets, segmentMidpoint, sourceLinkLabel, VIEW_RADIUS_M } from './surface-photo';

const segment = (from: XY, to: XY): Segment => ({ from, to, dist: 0, slope: 0, time: 0, o2: 0, energy: 0, dose: null });

const photo = (url: string): TargetPhoto => ({ url, alt: `alt ${url}`, credit: 'NASA/JPL-Caltech', sol: 3010, sourceUrl: 'https://mars.nasa.gov/raw_images/887166', status: 'verified' });

const targetAt = (id: string, coordinates: XY, withPhoto = true): Target => ({
  ...mockTargets[0]!,
  id,
  name: `Target ${id}`,
  coordinates,
  photo: withPhoto ? photo(`${id}.jpg`) : null,
});

describe('surface-photo · F4-AC6 найближчий знімок до відрізка', () => {
  it('середина відрізка — середнє from і to', () => {
    expect(segmentMidpoint(segment([0, 0], [20, 10]))).toEqual([10, 5]);
  });

  it('обирає найближчий до середини знімок і повертає відстань у метрах', () => {
    const candidates = photoCandidatesFromTargets([targetAt('far', [200, 0]), targetAt('near', [50, 40])]);
    const found = findNearestPhoto(segment([0, 0], [100, 0]), candidates);
    expect(found?.candidate.name).toBe('Target near');
    expect(found?.distanceM).toBeCloseTo(40, 6);
  });

  it('рівно 300 м — показуємо, далі — ні', () => {
    const mid: XY = [0, 0];
    const at = (d: number) => findNearestPhoto(segment(mid, mid), photoCandidatesFromTargets([targetAt('t', [d, 0])]));
    expect(VIEW_RADIUS_M).toBe(300);
    expect(at(300)?.distanceM).toBe(300);
    expect(at(300.5)).toBeNull();
  });

  it('цілі без фото не є кандидатами; без кандидатів — null', () => {
    const candidates = photoCandidatesFromTargets([targetAt('nophoto', [1, 0], false)]);
    expect(candidates).toEqual([]);
    expect(findNearestPhoto(segment([0, 0], [10, 0]), candidates)).toBeNull();
  });

  it('кандидат з фото цілі несе фото, координати й тип місця «target»', () => {
    const [candidate] = photoCandidatesFromTargets([targetAt('a', [5, 5])]);
    expect(candidate).toMatchObject({ name: 'Target a', coordinates: [5, 5], location: 'target', photo: { url: 'a.jpg' } });
  });
});

const surfacePhoto = (id: string, coordinates: XY): SurfacePhoto => ({
  id, coordinates, lonLat: [0, 0], url: `photos/${id}.jpg`, alt: `Navcam ${id}`, sourceUrl: 'https://mars.nasa.gov/raw_images/887166',
  credit: 'NASA/JPL-Caltech', sol: 3010, camera: 'NAV_LEFT_B', locationAccuracy: 'rover-stop', status: 'verified',
});

describe('surface-photo · F4-AC6 кандидати з photos (SPEC §7.9)', () => {
  it('є photos — кандидати лише з них, тип місця «rover-stop», з камерою', () => {
    const candidates = photoCandidates([surfacePhoto('p1', [10, 0])], [targetAt('t', [0, 0])]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ location: 'rover-stop', camera: 'NAV_LEFT_B', coordinates: [10, 0], photo: { url: 'photos/p1.jpg', sol: 3010 } });
  });

  it('photos порожні — запасний варіант: фото цілей', () => {
    const candidates = photoCandidates([], [targetAt('t', [0, 0])]);
    expect(candidates.map((c) => c.location)).toEqual(['target']);
  });

  it('найближчий серед photos', () => {
    const candidates = photoCandidates([surfacePhoto('far', [250, 0]), surfacePhoto('near', [60, 0])], []);
    expect(findNearestPhoto(segment([0, 0], [100, 0]), candidates)?.candidate.photo.url).toBe('photos/near.jpg');
  });
});

describe('surface-photo · підпис з даних джерела (SPEC §7.9)', () => {
  it('камера з даних: NAV_LEFT_B (Curiosity) і NAVCAM_LEFT (Spirit, PDS) — Navcam; інша — як у джерелі; без камери — Surface photo', () => {
    expect(photoCameraName('NAV_LEFT_B')).toBe('Navcam');
    expect(photoCameraName('NAVCAM_LEFT')).toBe('Navcam');
    expect(photoCameraName('PANCAM')).toBe('PANCAM');
    expect(photoCameraName(undefined)).toBe('Surface photo');
  });

  it('посилання на домен NASA — «NASA source», інший домен або сміття — «Source»', () => {
    expect(sourceLinkLabel('https://mars.nasa.gov/raw_images/886246')).toBe('NASA source');
    expect(sourceLinkLabel('https://planetarydata.jpl.nasa.gov/img/data/mer/spirit/mer2no_0xxx/data/sol0738/edr/x.img')).toBe('NASA source');
    expect(sourceLinkLabel('https://nasa.gov.example.com/x')).toBe('Source');
    expect(sourceLinkLabel('not a url')).toBe('Source');
  });

  it('точність місця: rover-stop — зупинка ровера; approximate і target — assumption', () => {
    expect(locationAccuracyNote('rover-stop')).toBe('Location: rover stop, not the exact camera spot.');
    expect(locationAccuracyNote('approximate')).toBe('Location: approximate rover site — assumption.');
    expect(locationAccuracyNote('target')).toBe('Location: science target coordinates — assumption.');
  });
});
