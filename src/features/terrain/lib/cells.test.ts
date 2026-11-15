import { describe, expect, it } from 'vitest';
import { cellIndex } from '../../../contracts/planning';
import { MOCK_CELLS, mockGrid } from '../../../mocks';
import { CELL, classifyCells } from './cells';
import { RAW_NODATA, SMALL, smallGrid } from './fixtures';

describe('F2-AC2 classifyCells', () => {
  it('Given walkable = 0, NaN, сирий noData, |h| ≥ 3e38 і крутий схил; Then жодна не прохідна', () => {
    const { classes } = classifyCells(smallGrid(), { noData: RAW_NODATA, maxSlopeDeg: 25 });
    expect(classes[SMALL.walkable0]).toBe(CELL.blocked);
    expect(classes[SMALL.nan]).toBe(CELL.noData);
    expect(classes[SMALL.rawNoData]).toBe(CELL.noData);
    expect(classes[SMALL.huge]).toBe(CELL.noData);
    expect(classes[SMALL.steep]).toBe(CELL.blocked);
    expect(classes[0]).toBe(CELL.walkable);
  });

  it('рахує лічильники blocked / NoData', () => {
    const r = classifyCells(smallGrid(), { noData: RAW_NODATA, maxSlopeDeg: 25 });
    expect(r.counts).toEqual({ walkable: 7, blocked: 2, noData: 3 });
  });

  it('без region.noData сирий sentinel лишається заблокованим лише за іншими правилами', () => {
    const { classes } = classifyCells(smallGrid(), {});
    expect(classes[SMALL.rawNoData]).toBe(CELL.walkable);
    expect(classes[SMALL.steep]).toBe(CELL.walkable);
  });

  it('mockGrid: стіна, NoData (3,3) і «підступна» NaN (4,4) не прохідні', () => {
    const { classes, counts } = classifyCells(mockGrid, { maxSlopeDeg: 25 });
    const [nr, nc] = MOCK_CELLS.noData;
    const [tr, tc] = MOCK_CELLS.trickyNaN;
    expect(classes[cellIndex(mockGrid, nr, nc)]).toBe(CELL.noData);
    expect(classes[cellIndex(mockGrid, tr, tc)]).toBe(CELL.noData);
    expect(classes[cellIndex(mockGrid, 50, MOCK_CELLS.wallCol)]).toBe(CELL.blocked);
    expect(counts.blocked + counts.noData).toBeGreaterThanOrEqual(101 + 2);
  });
});
