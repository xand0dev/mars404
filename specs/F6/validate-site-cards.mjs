import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'public/data/sites');
const siteIds = ['gale', 'columbia-hills', 'olympus-mons', 'valles-marineris', 'jezero', 'meridiani'];
const expectedModes = {
  gale: 'eva',
  'columbia-hills': 'eva',
  'olympus-mons': 'overview',
  'valles-marineris': 'overview',
  jezero: 'card',
  meridiani: 'card',
};
const expectedCenters = {
  gale: '5.44° S, 137.70° E',
  'columbia-hills': '14.59911° S, 175.527995° E',
  'olympus-mons': '18.40° N, 226.00° E',
  'valles-marineris': '13.74° S, 300.80° E',
  jezero: '18.41° N, 77.69° E',
  meridiani: '0.20° N, 357.50° E',
};

function loadCard(id) {
  return JSON.parse(readFileSync(join(root, `${id}.json`), 'utf8'));
}

function jpegDimensions(bytes) {
  assert.equal(bytes[0], 0xff, 'JPEG SOI byte 1');
  assert.equal(bytes[1], 0xd8, 'JPEG SOI byte 2');
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error('JPEG dimensions not found');
}

const index = JSON.parse(readFileSync(join(root, 'index.json'), 'utf8'));
assert.deepEqual(index, { schemaVersion: 1, sites: siteIds }, 'index.json');
const sourcesDoc = readFileSync(join(process.cwd(), 'docs/SOURCES.md'), 'utf8');
const f6Sources = sourcesDoc.match(/## F6\n([\s\S]*?)(?=\n## F7)/)?.[1] ?? '';

for (const id of siteIds) {
  const card = loadCard(id);
  assert.equal(card.schemaVersion, 1, `${id}: schemaVersion`);
  assert.equal(card.id, id, `${id}: id`);
  assert.equal(card.mode, expectedModes[id], `${id}: mode`);
  assert.ok(card.title.length > 0 && card.title.length <= 40, `${id}: title length`);
  assert.ok(card.subtitle.length > 0 && card.subtitle.length <= 60, `${id}: subtitle length`);
  assert.ok(card.summary.length > 0 && card.summary.length <= 320, `${id}: summary length`);
  assert.ok(card.whyGo.length > 0 && card.whyGo.length <= 160, `${id}: whyGo length`);
  assert.ok(card.facts.length >= 3 && card.facts.length <= 5, `${id}: facts count`);

  const sourceIds = new Set(card.sources.map((source) => source.id));
  assert.equal(sourceIds.size, card.sources.length, `${id}: unique source ids`);
  for (const fact of card.facts) {
    assert.ok(fact.label.length > 0, `${id}: fact label`);
    assert.ok(fact.value.length > 0 && fact.value.length <= 60, `${id}: fact value length`);
    assert.ok(sourceIds.has(fact.sourceId), `${id}: missing source ${fact.sourceId}`);
  }
  assert.equal(
    card.facts.find((fact) => fact.label === 'Center')?.value,
    expectedCenters[id],
    `${id}: center must match globe`,
  );

  for (const source of card.sources) {
    assert.ok(source.id && source.title && source.credit, `${id}: source fields`);
    assert.match(source.url, /^https:\/\//, `${id}: source URL`);
    assert.equal(source.accessedAt, '2026-11-15', `${id}: accessedAt`);
    assert.ok(['verified', 'assumption'].includes(source.status), `${id}: source status`);
    assert.ok(f6Sources.includes(`| ${source.id} |`), `${id}: ${source.id} missing from SOURCES ## F6`);
  }

  assert.equal(card.image.file, `${id}.jpg`, `${id}: image file`);
  assert.ok(card.image.alt && card.image.credit, `${id}: image accessibility and credit`);
  assert.match(card.image.sourceUrl, /^https:\/\//, `${id}: image source URL`);
  assert.equal(card.image.status, 'verified', `${id}: image status`);

  const imagePath = join(root, card.image.file);
  const bytes = readFileSync(imagePath);
  assert.ok(statSync(imagePath).size <= 250 * 1024, `${id}: image exceeds 250 KB`);
  assert.deepEqual(jpegDimensions(bytes), { width: 1200, height: 750 }, `${id}: image dimensions`);
}

const jsonBytes = siteIds.reduce((sum, id) => sum + statSync(join(root, `${id}.json`)).size, 0);
const imageBytes = siteIds.reduce((sum, id) => sum + statSync(join(root, `${id}.jpg`)).size, 0);
assert.ok(jsonBytes <= 30 * 1024, 'all card JSON exceeds 30 KB');
assert.ok(imageBytes <= 1.5 * 1024 * 1024, 'all card images exceed 1.5 MB');

console.log(`Validated ${siteIds.length} site cards: ${jsonBytes} JSON bytes, ${imageBytes} image bytes.`);
