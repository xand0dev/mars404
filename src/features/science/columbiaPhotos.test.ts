import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TargetsGeoJSON } from '../../contracts';

// #106: фото Spirit для цілей Columbia Hills. Координати й id цілей не змінюємо (E2E і демо).
const targetsPath = path.join(process.cwd(), 'public/data/columbia-hills/targets.geojson');
const WITH_PHOTO = ['home-plate', 'comanche', 'troy'];
const IDS = ['husband-hill', 'pot-of-gold', 'comanche', 'home-plate', 'silica-valley', 'troy'];
const MAX_BYTES = 400 * 1024;

describe('F6 #106 · фото Spirit для Columbia Hills', () => {
  it('Given targets.geojson, When фото додано, Then id цілей ті самі, що були', async () => {
    const data = JSON.parse(await readFile(targetsPath, 'utf8')) as TargetsGeoJSON;
    expect(data.features.map((f) => f.id)).toEqual(IDS);
  });

  it('Given Home Plate, Comanche, Troy, When фото перевірено, Then локальний JPEG ≤ 400 КБ з alt, credit, sol і Photojournal URL', async () => {
    const data = JSON.parse(await readFile(targetsPath, 'utf8')) as TargetsGeoJSON;

    for (const id of WITH_PHOTO) {
      const photo = data.features.find((f) => f.id === id)?.properties.photo;
      expect(photo, id).toBeTruthy();
      if (!photo) continue;
      expect(photo.url).toMatch(/^\.\/data\/columbia-hills\/photos\/[a-z0-9-]+\.jpg$/);
      expect(photo.alt.length).toBeGreaterThan(10);
      expect(photo.credit).toMatch(/^NASA\/JPL-Caltech/);
      expect(photo.sol).toBeGreaterThan(0);
      expect(photo.status).toBe('verified');
      expect(photo.sourceUrl).toMatch(/^https:\/\/photojournal\.jpl\.nasa\.gov\/catalog\/PIA\d{5}$/);
      const file = await stat(path.join(process.cwd(), 'public', photo.url.replace(/^\.\//, '')));
      expect(file.size).toBeGreaterThan(0);
      expect(file.size).toBeLessThanOrEqual(MAX_BYTES);
    }
  });
});
