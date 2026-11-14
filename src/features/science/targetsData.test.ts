import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TargetsGeoJSON } from '../../contracts';

const BBOX = { west: 137.4, south: -4.75, east: 137.422, north: -4.728 } as const;
const targetsPath = path.join(process.cwd(), 'public/data/gale/targets.geojson');
const photosPath = path.join(process.cwd(), 'public/data/gale/photos/photos.geojson');

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('expected object');
  return value as Record<string, unknown>;
}

describe('F6-AC1/AC2 · пакет цілей Gale', () => {
  it('Given targets.geojson, When пакет перевірено, Then є 5–8 унікальних MMGIS-цілей у bbox', async () => {
    const data = JSON.parse(await readFile(targetsPath, 'utf8')) as TargetsGeoJSON;

    expect(data.type).toBe('FeatureCollection');
    expect(data.features.length).toBeGreaterThanOrEqual(5);
    expect(data.features.length).toBeLessThanOrEqual(8);
    expect(new Set(data.features.map((feature) => feature.id)).size).toBe(data.features.length);

    for (const feature of data.features) {
      const [lon, lat] = feature.geometry.coordinates;
      expect(feature.geometry.type).toBe('Point');
      expect(lon).toBeGreaterThanOrEqual(BBOX.west);
      expect(lon).toBeLessThanOrEqual(BBOX.east);
      expect(lat).toBeGreaterThanOrEqual(BBOX.south);
      expect(lat).toBeLessThanOrEqual(BBOX.north);
      expect(feature.properties.locationAccuracy).toBe('verified');
      expect(feature.properties.status).toBe('verified');
      expect(feature.properties.sourceIds).toContain('mmgis-msl-waypoints');
      expect(feature.properties).not.toHaveProperty('coordinates');
      expect(feature.properties).not.toHaveProperty('lonLat');
    }
  });

  it('Given кожну ціль, When фото перевірено, Then локальний JPEG має alt, credit, sol і NASA source URL', async () => {
    const data = JSON.parse(await readFile(targetsPath, 'utf8')) as TargetsGeoJSON;

    for (const feature of data.features) {
      const photo = feature.properties.photo;
      expect(photo).not.toBeNull();
      if (!photo) continue;
      expect(photo.url).toMatch(/^\.\/data\/gale\/photos\/[a-z0-9-]+\.jpg$/);
      expect(photo.alt.length).toBeGreaterThan(10);
      expect(photo.credit).toBe('NASA/JPL-Caltech');
      expect(photo.sol).toBeGreaterThan(0);
      expect(photo.status).toBe('verified');
      expect(photo.sourceUrl).toMatch(/^https:\/\/mars\.nasa\.gov\/raw_images\/\d+$/);
      const localPath = path.join(process.cwd(), 'public', photo.url.replace(/^\.\//, ''));
      await expect(access(localPath)).resolves.toBeUndefined();
    }
  });
});

describe('F6-AC5 · каталог поверхневих фото', () => {
  it('Given bbox Gale, When photos.geojson перевірено, Then є 8–20 verified Navcam rover-stop фото', async () => {
    const targets = JSON.parse(await readFile(targetsPath, 'utf8')) as TargetsGeoJSON;
    const targetCoordinates = new Set(targets.features.map((feature) => feature.geometry.coordinates.join(',')));
    const data = record(JSON.parse(await readFile(photosPath, 'utf8')) as unknown);
    const features = data.features;

    expect(data.type).toBe('FeatureCollection');
    expect(Array.isArray(features)).toBe(true);
    if (!Array.isArray(features)) return;
    expect(features.length).toBeGreaterThanOrEqual(8);
    expect(features.length).toBeLessThanOrEqual(20);

    const ids = new Set<string>();
    for (const value of features) {
      const feature = record(value);
      const geometry = record(feature.geometry);
      const properties = record(feature.properties);
      const coordinates = geometry.coordinates;
      if (!Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') {
        throw new TypeError('expected [lon, lat]');
      }
      const [lon, lat] = coordinates;
      expect(feature.type).toBe('Feature');
      expect(geometry.type).toBe('Point');
      expect(lon).toBeGreaterThanOrEqual(BBOX.west);
      expect(lon).toBeLessThanOrEqual(BBOX.east);
      expect(lat).toBeGreaterThanOrEqual(BBOX.south);
      expect(lat).toBeLessThanOrEqual(BBOX.north);
      expect(targetCoordinates).toContain(coordinates.join(','));
      expect(properties.locationAccuracy).toBe('rover-stop');
      expect(properties.status).toBe('verified');
      expect(properties.camera).toMatch(/^NAV_(LEFT|RIGHT)_[AB]$/);
      expect(properties.credit).toBe('NASA/JPL-Caltech');
      expect(properties.sol).toBeTypeOf('number');
      expect(properties.sourceUrl).toMatch(/^https:\/\/mars\.nasa\.gov\/raw_images\/\d+$/);
      expect(properties.alt).toMatch(/Navcam view from Curiosity rover stop/i);
      expect(properties).not.toHaveProperty('coordinates');
      expect(properties).not.toHaveProperty('lonLat');
      expect(feature.id).toBe(properties.id);
      expect(typeof feature.id).toBe('string');
      ids.add(String(feature.id));

      expect(properties.url).toMatch(/^\.\/data\/gale\/photos\/[a-z0-9-]+\.jpg$/);
      if (typeof properties.url !== 'string') throw new TypeError('expected photo URL');
      const localPath = path.join(process.cwd(), 'public', properties.url.replace(/^\.\//, ''));
      await expect(access(localPath)).resolves.toBeUndefined();
    }
    expect(ids.size).toBe(features.length);
  });
});
