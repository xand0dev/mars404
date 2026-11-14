import { describe, expect, it } from 'vitest';
import { mockGrid } from '../../../mocks';
import { classifyCells } from './cells';
import { BLOCKED_RGB, HALO_RGB, NODATA_RGB, buildOverlay } from './overlay';
import { displayHeights } from './geometry';
import { RAW_NODATA, SMALL, smallGrid } from './fixtures';

const texel = (data: Uint8Array, grid: { width: number; height: number }, i: number) => {
  // Текстура перевернута по рядках (DataTexture: рядок 0 — низ, тобто південь).
  const row = Math.floor(i / grid.width);
  const col = i % grid.width;
  const t = ((grid.height - 1 - row) * grid.width + col) * 4;
  return Array.from(data.slice(t, t + 4));
};

const setup = (mask?: Uint8Array) => {
  const grid = smallGrid();
  const { classes } = classifyCells(grid, { noData: RAW_NODATA, maxSlopeDeg: 25 });
  return { grid, classes, out: buildOverlay(grid, classes, { heights: displayHeights(grid, RAW_NODATA), mask }) };
};

describe('F2-AC2 накладка 3D: blocked / NoData / ореол', () => {
  it('Given blocked і NoData; Then їхні тексели непрозорі й мають власний колір', () => {
    const { grid, out } = setup();
    for (const i of [SMALL.walkable0, SMALL.steep]) expect(texel(out.data, grid, i)).toEqual([...BLOCKED_RGB, 255]);
    for (const i of [SMALL.nan, SMALL.rawNoData, SMALL.huge]) expect(texel(out.data, grid, i)).toEqual([...NODATA_RGB, 255]);
  });

  it('Given reach.mask = 1 на всіх клітинках; Then ореол лише на прохідних', () => {
    const grid = smallGrid();
    const { out, classes } = setup(new Uint8Array(grid.width * grid.height).fill(1));
    for (let i = 0; i < classes.length; i++) {
      const [r, g, b] = texel(out.data, grid, i);
      const isHalo = r === HALO_RGB[0] && g === HALO_RGB[1] && b === HALO_RGB[2];
      expect(isHalo).toBe(classes[i] === 0);
    }
    expect(out.haloCells).toBe(7);
  });

  it('жодна прохідна клітинка не має кольору blocked/NoData', () => {
    const { grid, out, classes } = setup();
    for (let i = 0; i < classes.length; i++) {
      if (classes[i] !== 0) continue;
      const [r, g, b] = texel(out.data, grid, i);
      expect([r, g, b]).not.toEqual([...BLOCKED_RGB]);
      expect([r, g, b]).not.toEqual([...NODATA_RGB]);
    }
  });

  it('без heights (є HiRISE) прохідні клітинки прозорі', () => {
    const grid = smallGrid();
    const { classes } = classifyCells(grid, { noData: RAW_NODATA });
    const out = buildOverlay(grid, classes, {});
    expect(texel(out.data, grid, 0)[3]).toBe(0);
  });

  it('ореол читається на ґрунті: контур непрозорий, всередині напівпрозорий, але не сірий', () => {
    const grid = mockGrid;
    const { classes } = classifyCells(grid, { maxSlopeDeg: 25 });
    const mask = new Uint8Array(grid.width * grid.height);
    for (let r = 30; r <= 34; r++) for (let c = 30; c <= 34; c++) mask[r * grid.width + c] = 1;
    const out = buildOverlay(grid, classes, { mask });
    const edge = texel(out.data, grid, 30 * grid.width + 30);
    const inner = texel(out.data, grid, 32 * grid.width + 32);
    expect(edge).toEqual([...HALO_RGB, 255]);
    expect(inner.slice(0, 3)).toEqual([...HALO_RGB]);
    expect(inner[3]).toBeGreaterThanOrEqual(130);
    expect(inner[3]).toBeLessThan(255);
    // Змішування з найсвітлішим відтінком ґрунту лишається блакитним, а не сірим.
    const a = (inner[3] as number) / 255;
    const ground = [226, 178, 120];
    const mixed = HALO_RGB.map((v, k) => v * a + (ground[k] as number) * (1 - a));
    expect((mixed[2] as number) - (mixed[0] as number)).toBeGreaterThan(40);
  });

  it('маска невідповідної довжини → без ореолу і з попередженням', () => {
    const { out } = setup(new Uint8Array(3).fill(1));
    expect(out.haloCells).toBe(0);
    expect(out.warnings).toEqual([expect.stringMatching(/mask/i)]);
  });
});
