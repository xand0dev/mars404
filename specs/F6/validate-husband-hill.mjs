import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dataDir = new URL('../../public/data/columbia-hills/', import.meta.url);
const region = JSON.parse(await readFile(new URL('region.json', dataDir), 'utf8'));
const targets = JSON.parse(await readFile(new URL('targets.geojson', dataDir), 'utf8'));
const slope = await readFile(new URL(region.files.slope, dataDir));
const walkable = await readFile(new URL(region.files.walkable, dataDir));

const husbandHill = targets.features.find((feature) => feature.properties?.id === 'husband-hill');
assert(husbandHill, 'Husband Hill target is missing');
assert.deepEqual(
  husbandHill.geometry.coordinates,
  [175.52477, -14.59194],
  'Husband Hill must use the nearest walkable approach cell supplied by F3',
);

const note = husbandHill.properties.note ?? '';
assert.match(note, /10 m north/i, 'Target note must disclose the 10 m move');
assert.match(note, /nearest walkable/i, 'Target note must disclose that this is an approach cell');
assert.match(note, /summit cell is 27/i, 'Target note must disclose the blocked summit cell');

// Same equirectangular conversion as src/contracts/planning.ts.
const metersPerDegree = (Math.PI * 3_396_190) / 180;
const [west, south, , north] = region.grid.boundsLonLat;
const [originX, originY] = region.grid.originM;
const midLatitude = ((south + north) / 2) * (Math.PI / 180);
const [longitude, latitude] = husbandHill.geometry.coordinates;
const x = originX + (longitude - west) * metersPerDegree * Math.cos(midLatitude);
const y = originY - (north - latitude) * metersPerDegree;
const col = Math.floor((x - originX) / region.grid.metersPerPixel);
const row = Math.floor((originY - y) / region.grid.metersPerPixel);

assert.deepEqual({ row, col }, { row: 85, col: 109 }, 'Husband Hill must map to the F3-verified approach cell');
const index = row * region.grid.width + col;
const slopeDeg = slope.readFloatLE(index * Float32Array.BYTES_PER_ELEMENT);
assert.equal(walkable[index], 1, 'Husband Hill approach cell must be walkable');
assert(
  slopeDeg <= region.model.maxSlopeDeg,
  `Husband Hill approach slope ${slopeDeg.toFixed(2)}° exceeds ${region.model.maxSlopeDeg}°`,
);

console.log(`Husband Hill: row ${row}, col ${col}, slope ${slopeDeg.toFixed(2)}° — walkable`);
