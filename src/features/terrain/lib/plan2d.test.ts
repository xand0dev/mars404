import { afterEach, describe, expect, it } from 'vitest';
import { cellCenter } from '../../../contracts/planning';
import { CELL, classifyCells } from './cells';
import { RAW_NODATA, planThrough, smallGrid } from './fixtures';
import { cellsPath, force2DRequested, planPoint, planReason, polyline, selectedSegmentLine } from './plan2d';

describe('F2-AC4 planReason', () => {
  const ok = { webgl: true, lost: false, gridErrors: [] as string[] };
  it('усе гаразд → null (3D)', () => expect(planReason(ok)).toBeNull());
  it('без WebGL', () => expect(planReason({ ...ok, webgl: false })?.code).toBe('no-webgl'));
  it('втрачено контекст', () => expect(planReason({ ...ok, lost: true })?.code).toBe('context-lost'));
  it('невалідна сітка має пріоритет і показує помилки', () => {
    const r = planReason({ webgl: false, lost: true, gridErrors: ['invalid size'] });
    expect(r?.code).toBe('invalid-grid');
    expect(r?.text).toMatch(/invalid size/);
  });
});

describe('План Б: примусовий 2D через ?2d (SPEC §12, низький FPS)', () => {
  const ok = { webgl: true, lost: false, gridErrors: [] as string[] };
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('WebGL є, але ?2d → 2D з причиною forced', () => {
    const r = planReason({ ...ok, forced: true });
    expect(r?.code).toBe('forced');
    expect(r?.text).toBe('2D map');
  });
  it('справжня причина (немає WebGL, втрата контексту, невалідна сітка) важливіша за ?2d', () => {
    expect(planReason({ ...ok, webgl: false, forced: true })?.code).toBe('no-webgl');
    expect(planReason({ ...ok, lost: true, forced: true })?.code).toBe('context-lost');
    expect(planReason({ ...ok, gridErrors: ['x'], forced: true })?.code).toBe('invalid-grid');
  });
  it('force2DRequested читає ?2d з адреси', () => {
    expect(force2DRequested()).toBe(false);
    window.history.replaceState(null, '', '/?2d');
    expect(force2DRequested()).toBe(true);
    window.history.replaceState(null, '', '/?fps&2d=1');
    expect(force2DRequested()).toBe(true);
  });
});

describe('F2-AC2 2D: blocked / NoData path', () => {
  it('кожна заблокована клітинка потрапляє в path, прохідні — ні', () => {
    const grid = smallGrid();
    const { classes } = classifyCells(grid, { noData: RAW_NODATA, maxSlopeDeg: 25 });
    expect(cellsPath(grid.width, classes, (c) => c === CELL.blocked)).toBe('M1 0h1v1h-1z M3 2h1v1h-1z');
    expect(cellsPath(grid.width, classes, (c) => c === CELL.noData)).toBe('M1 1h2v1h-2z M0 2h1v1h-1z');
  });

  it('сусідні клітинки рядка зливаються в один прямокутник', () => {
    expect(cellsPath(3, new Uint8Array([1, 1, 1, 0, 1, 0]), (c) => c === 1)).toBe('M0 0h3v1h-3z M1 1h1v1h-1z');
  });
});

describe('F2-AC3/AC4 2D: цілі, маршрут, підсвітка', () => {
  it('planPoint: центр клітинки (r, c) → (c + 0.5, r + 0.5)', () => {
    const grid = smallGrid();
    expect(planPoint(grid, cellCenter(grid, 2, 1))).toEqual([1.5, 2.5]);
  });

  it('polyline маршруту', () => {
    const grid = smallGrid();
    const plan = planThrough(grid, [[0, 0], [1, 0], [2, 1]]);
    expect(polyline(grid, plan.path)).toBe('0.5,0.5 0.5,1.5 1.5,2.5');
  });

  it('selectedSegment = i → відрізок i; null або поза межами → немає', () => {
    const grid = smallGrid();
    const plan = planThrough(grid, [[0, 0], [1, 0], [2, 1]]);
    expect(selectedSegmentLine(grid, plan, 1)).toEqual([[0.5, 1.5], [1.5, 2.5]]);
    expect(selectedSegmentLine(grid, plan, null)).toBeNull();
    expect(selectedSegmentLine(grid, plan, 5)).toBeNull();
    expect(selectedSegmentLine(grid, null, 0)).toBeNull();
  });
});
