import { describe, expect, it } from 'vitest';
import { cellCenter, toR3F } from '../../../contracts/planning';
import { PerspectiveCamera } from 'three';
import { EYE_HEIGHT_M, GLOBE_CAMERA, applyGlobeCamera, cameraPose, gridFrame } from './camera';
import { displayHeights } from './geometry';
import { smallGrid } from './fixtures';

describe('камери Orbit / Top / POV', () => {
  const grid = smallGrid();
  const heights = displayHeights(grid);
  const frame = gridFrame(grid, heights);

  it('кадр охоплює зовнішні межі сітки', () => {
    expect(frame.center[0]).toBe(120);
    expect(frame.center[2]).toBe(-15);
    expect(frame.size).toBe(40);
  });

  it('Top дивиться згори, північ (−Z) угорі екрана', () => {
    const p = cameraPose('top', frame, null);
    expect(p.position[0]).toBe(frame.center[0]);
    expect(p.position[1]).toBeGreaterThan(frame.maxY);
    expect(p.position[2]).toBeGreaterThan(p.target[2]);
    expect(p.position[2] - p.target[2]).toBeLessThan(frame.size * 0.01);
  });

  it('Orbit — похилий вид з півдня-сходу на центр', () => {
    const p = cameraPose('orbit', frame, null);
    expect(p.target).toEqual(frame.center);
    expect(p.position[0]).toBeGreaterThan(frame.center[0]);
    expect(p.position[2]).toBeGreaterThan(frame.center[2]);
  });

  it('POV — з точки на висоті очей (×3), дивиться на ціль', () => {
    const at = cellCenter(grid, 2, 1);
    const look = cellCenter(grid, 0, 1);
    const p = cameraPose('pov', frame, { from: { xy: at, groundM: 21 }, lookAt: { xy: look, groundM: 1 } });
    expect(p.position).toEqual(toR3F(at, 21 + EYE_HEIGHT_M));
    expect(p.target[2]).toBeLessThan(p.position[2]);
  });

  it('вузьке полотно (400 px) → Orbit і Top відходять далі, широке — без змін', () => {
    const wide = cameraPose('orbit', frame, null, 1.6);
    const narrow = cameraPose('orbit', frame, null, 0.6);
    const dist = (p: typeof wide) => Math.hypot(...p.position.map((v, i) => v - (p.target[i] as number)));
    expect(dist(narrow)).toBeGreaterThan(dist(wide) * 1.4);
    expect(cameraPose('top', frame, null, 0.7).position[1]).toBeGreaterThan(cameraPose('top', frame, null, 1.6).position[1]);
  });

  it('POV без точки → Orbit', () => {
    expect(cameraPose('pov', frame, null)).toEqual(cameraPose('orbit', frame, null));
  });
});

describe('applyGlobeCamera — сумісність з F1', () => {
  it('камера з пози рельєфу повертається на позу глобуса (F1 рахує з неї масштаб)', () => {
    const cam = new PerspectiveCamera(45, 1, 0.5, 30000);
    cam.position.set(1344, 762, 320);
    applyGlobeCamera(cam);
    expect(cam.position.toArray()).toEqual([...GLOBE_CAMERA.position]);
    expect(cam.position.length()).toBe(3);
    expect([cam.near, cam.far]).toEqual([GLOBE_CAMERA.near, GLOBE_CAMERA.far]);
  });
});
