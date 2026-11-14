import { describe, expect, it } from 'vitest';
import type { Segment, Target, TargetPhoto, XY } from '../../contracts';
import { mockTargets } from '../../mocks';
import { findNearestPhoto, photoCandidatesFromTargets, segmentMidpoint, VIEW_RADIUS_M } from './surface-photo';

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
    expect(found?.candidate.targetId).toBe('near');
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
    expect(candidate).toMatchObject({ targetId: 'a', name: 'Target a', coordinates: [5, 5], location: 'target', photo: { url: 'a.jpg' } });
  });
});
