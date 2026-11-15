import { readFile } from 'node:fs/promises';

const paths = ['public/data/olympus-mons/targets.geojson', 'public/data/valles-marineris/targets.geojson'];

for (const path of paths) {
  const data = JSON.parse(await readFile(path, 'utf8'));
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length !== 0) {
    throw new Error(`${path}: expected an empty GeoJSON FeatureCollection`);
  }
}

console.log(`Validated ${paths.length} empty overview target collections.`);
