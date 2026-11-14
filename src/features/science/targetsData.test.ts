import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TargetsGeoJSON } from '../../contracts';

const BBOX = { west: 137.4, south: -4.75, east: 137.422, north: -4.728 } as const;
const targetsPath = path.join(process.cwd(), 'public/data/gale/targets.geojson');

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
