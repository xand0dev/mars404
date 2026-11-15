// F3-AC1: пакет public/data/gale від pipeline — схема region.json, розміри файлів, NoData, sha256.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import type { Region } from '../../contracts';
import { isNoDataValue } from '../../contracts/planning';

const dir = 'public/data/gale/';
const file = (name: string) => readFile(dir + name);
const region = async (): Promise<Region> => JSON.parse((await file('region.json')).toString('utf-8'));
const f32 = (b: Buffer) => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));

describe('F3-AC1: пакет Gale', () => {
  it('Given пакет, Then region.json має схему контракту й сітку ≤256×256', async () => {
    const r = await region();
    expect(r.schemaVersion).toBe(1);
    expect(r.id).toBe('gale');
    const { width, height, metersPerPixel, rowOrder, boundsLonLat, originM } = r.grid;
    expect(Number.isInteger(width) && Number.isInteger(height)).toBe(true);
    expect(Math.max(width, height)).toBeLessThanOrEqual(256);
    expect(metersPerPixel).toBeGreaterThan(0);
    expect(metersPerPixel).toBeLessThanOrEqual(10);
    expect(rowOrder).toBe('north-to-south');
    expect(originM.every(Number.isFinite)).toBe(true);
    const [w, s, e, n] = boundsLonLat;
    expect(w < e && s < n).toBe(true);
    for (const k of ['elevation', 'slope', 'walkable', 'hazard', 'texture', 'targets'] as const) expect(typeof r.files[k]).toBe('string');
    expect(Number.isFinite(r.noData)).toBe(true);
    expect(r.base.every(Number.isFinite)).toBe(true);
    const ids = new Set(r.sources.map((s) => s.id));
    for (const l of r.layers) {
      expect(l.gridResolutionM).toBe(metersPerPixel);
      expect(l.legend.length).toBeGreaterThan(0);
      for (const id of l.sourceIds) expect(ids.has(id), `${l.id} → ${id}`).toBe(true);
    }
    expect(r.sources.find((s) => s.id === 'hazard-from-slope')?.status).toBe('assumption');
  });

  it('Then растри мають розміри w×h×4 (float32) і w×h (uint8)', async () => {
    const r = await region();
    const n = r.grid.width * r.grid.height;
    for (const k of ['elevation', 'slope', 'hazard'] as const) expect((await file(r.files[k])).byteLength, k).toBe(n * 4);
    expect((await file(r.files.walkable)).byteLength).toBe(n);
  });

  it('Then NoData висоти завжди заблокована (walkable = 0), а hazard у [0, 1]', async () => {
    const r = await region();
    const h = f32(await file(r.files.elevation));
    const z = f32(await file(r.files.hazard));
    const walk = await file(r.files.walkable);
    let noData = 0;
    // Порушення збираємо в масив і перевіряємо один раз: 65 536 × expect падало на тайм-ауті під навантаженням.
    const bad: string[] = [];
    h.forEach((v, i) => {
      if (isNoDataValue(v, r.noData)) {
        noData++;
        if (walk[i] !== 0) bad.push(`walkable[${i}] = ${walk[i]} on NoData`);
      } else if (walk[i] !== 0 && walk[i] !== 1) bad.push(`walkable[${i}] = ${walk[i]}`);
      if (!(z[i]! >= 0 && z[i]! <= 1)) bad.push(`hazard[${i}] = ${z[i]}`);
    });
    expect(bad.slice(0, 5)).toEqual([]);
    expect(noData / h.length).toBeLessThan(0.05);
  });

  it('When prepare запущено, Then SHA256SUMS збігається з файлами пакета', async () => {
    const lines = (await file('SHA256SUMS')).toString('utf-8').trim().split('\n');
    const names = lines.map((l) => l.split('  ')[1]);
    expect(names).toEqual(expect.arrayContaining(['region.json', 'elevation.f32', 'slope.f32', 'walkable.u8', 'hazard.f32', 'source.json']));
    for (const line of lines) {
      const [digest, name] = line.split('  ') as [string, string];
      expect(createHash('sha256').update(await file(name)).digest('hex'), name).toBe(digest);
    }
  });
});
