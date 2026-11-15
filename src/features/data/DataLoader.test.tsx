// F3-AC2, F3-AC4: DataLoader кладе реальну сітку в store лише для site = 'gale'; бита сітка → mock.
import { act, render, waitFor } from '@testing-library/react';
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockGrid } from '../../mocks';
import { resetMission, useMission } from '../../store/useMission';
import { DataLoader } from './DataLoader';
import { resetDataStatus, useDataStatus } from './dataStatus';
import { FileMissingError, type GetFile } from './loadRegion';
import type { SiteId } from '../../contracts';

const disk: GetFile = async (path) => {
  try {
    const b = await readFile('public/data/gale/' + path);
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  } catch {
    throw new FileMissingError(path);
  }
};

beforeEach(() => {
  resetMission();
  resetDataStatus();
});
afterEach(() => {
  resetMission();
  resetDataStatus();
});

describe('DataLoader', () => {
  it('Given site = null, Then нічого не вантажить і grid лишається mock', async () => {
    render(<DataLoader get={disk} />);
    await act(async () => {});
    expect(useMission.getState().grid).toBe(mockGrid);
    expect(useDataStatus.getState().phase).toBe('idle');
  });

  it('F3-AC2: Given відкрито Gale, Then grid у store реальна, region verified', async () => {
    render(<DataLoader get={disk} />);
    act(() => useMission.getState().setSite('gale'));
    await waitFor(() => expect(useDataStatus.getState().phase).toBe('real'));
    const s = useMission.getState();
    expect(s.grid).not.toBe(mockGrid);
    expect(s.grid.width).toBe(256);
    expect(s.region?.status).toBe('verified');
    expect(s.base).toEqual(s.region?.base);
    expect(s.model.emergencyO2G).toBe(s.region?.model.emergencyO2G);
  });

  it('F3-AC5: Given photos.geojson, Then photos у store з coordinates', async () => {
    const reg = JSON.parse(new TextDecoder().decode(await disk('region.json')));
    const fc = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', id: 'p1', geometry: { type: 'Point', coordinates: [137.40674, -4.73802] },
          properties: { id: 'p1', url: 'photos/p1.jpg', alt: 'Navcam', sourceUrl: 'https://mars.nasa.gov/raw', credit: 'NASA/JPL-Caltech', sol: 3100, camera: 'NAV_LEFT_B', locationAccuracy: 'rover-stop', status: 'verified' } },
      ],
    };
    const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).buffer as ArrayBuffer;
    const withPhotos: GetFile = (p) => (p === reg.files.photos ? Promise.resolve(enc(fc)) : disk(p));
    render(<DataLoader get={withPhotos} />);
    act(() => useMission.getState().setSite('gale'));
    await waitFor(() => expect(useDataStatus.getState().phase).toBe('real'));
    expect(useMission.getState().photos.map((p) => p.id)).toEqual(['p1']);
    expect(useMission.getState().photos[0]!.coordinates.every(Number.isFinite)).toBe(true);
  });

  it('Given site змінився до кінця завантаження, Then setRegionData не викликано', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const slow: GetFile = async (p) => {
      await gate;
      return disk(p);
    };
    render(<DataLoader get={slow} />);
    act(() => useMission.getState().setSite('gale'));
    act(() => useMission.getState().setSite(null));
    release();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(useMission.getState().region).toBeNull();
    expect(useMission.getState().grid).toBe(mockGrid);
  });

  it('F3-AC4: Given бита висота, Then у store лишається mock, статус mock з причиною', async () => {
    const broken: GetFile = (p) => (p === 'elevation.f32' ? Promise.resolve(new ArrayBuffer(4)) : disk(p));
    render(<DataLoader get={broken} />);
    act(() => useMission.getState().setSite('gale'));
    await waitFor(() => expect(useDataStatus.getState().phase).toBe('mock'));
    expect(useMission.getState().grid).toBe(mockGrid);
    expect(useMission.getState().region).toBeNull();
    expect(useDataStatus.getState().reason).toMatch(/elevation/);
    expect(useDataStatus.getState().issues.map((i) => i.id)).toEqual(['terrain']);
  });

  it('#101: Given відкрито Columbia Hills, Then вантажить public/data/columbia-hills, grid реальна, цілей поки немає', async () => {
    const asked: string[] = [];
    const getFor = (site: SiteId): GetFile => async (path) => {
      asked.push(site);
      try {
        const b = await readFile(`public/data/${site}/${path}`);
        return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
      } catch {
        throw new FileMissingError(path);
      }
    };
    render(<DataLoader getFor={getFor} />);
    act(() => useMission.getState().setSite('columbia-hills'));
    await waitFor(() => expect(useDataStatus.getState().phase).toBe('real'));
    const s = useMission.getState();
    expect(new Set(asked)).toEqual(new Set(['columbia-hills']));
    expect(s.region?.id).toBe('columbia-hills');
    expect(s.grid.width).toBe(256);
    expect(s.base).toEqual(s.region?.base);
    expect(s.grid.walkable[Math.floor(s.base![1] / 10) * 256 + Math.floor(s.base![0] / 10)]).toBe(1);
  });

  it('#101: Given region.json іншого району, Then mock з причиною (не змішуємо пакети)', async () => {
    render(<DataLoader get={disk} />);
    act(() => useMission.getState().setSite('columbia-hills'));
    await waitFor(() => expect(useDataStatus.getState().phase).toBe('mock'));
    expect(useMission.getState().region).toBeNull();
    expect(useDataStatus.getState().reason).toMatch(/gale/);
  });
});
