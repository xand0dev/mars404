import { describe, expect, it } from 'vitest';
import type { AbortPlan, ModelParams } from '../../contracts';
import { mockModel } from '../../mocks';
import { abortLine } from './abortLine';

// F7-AC6 (SPEC §7.8): рядок точки неповернення в HUD. HUD лише показує reach.abort від F5.
const abort = (extra: Partial<AbortPlan> = {}): AbortPlan => ({
  segments: [{ returnS: 500, ok: true }],
  pointOfNoReturnS: 1380,
  emergencyO2G: 360,
  ...extra,
});
const verified: ModelParams = {
  ...mockModel,
  evidence: { ...mockModel.evidence, emergencyO2G: { ...mockModel.evidence.emergencyO2G, status: 'verified' } },
};

describe('F7-AC6 · abortLine', () => {
  it('abort = null → рядка немає', () => {
    expect(abortLine(null, mockModel)).toBeNull();
  });

  it('точка неповернення є → «Point of no return in N min», N = floor(s / 60)', () => {
    const v = abortLine(abort(), mockModel)!;
    expect(v.kind).toBe('ponr');
    expect(v.text).toBe('Point of no return in 23 min');
  });

  it('pointOfNoReturnS = null → «Return possible along the whole route»', () => {
    const v = abortLine(abort({ pointOfNoReturnS: null }), mockModel)!;
    expect(v.kind).toBe('clear');
    expect(v.text).toBe('Return possible along the whole route');
  });

  it('NaN → «—», а не «NaN min»', () => {
    const v = abortLine(abort({ pointOfNoReturnS: NaN }), mockModel)!;
    expect(v.text).toBe('Point of no return in — min');
  });

  it('аварійний запас з reach.abort; «assumption», якщо в model.evidence немає перевіреного джерела', () => {
    const v = abortLine(abort({ emergencyO2G: 56.4 }), mockModel)!;
    expect(v.emergency).toBe('Emergency O₂ reserve 56 g');
    expect(v.assumption).toBe(true);
  });

  it('з перевіреним джерелом «assumption» немає', () => {
    expect(abortLine(abort(), verified)!.assumption).toBe(false);
  });

  it('ніде немає «safe»', () => {
    for (const p of [abort(), abort({ pointOfNoReturnS: null })]) expect(JSON.stringify(abortLine(p, mockModel))).not.toMatch(/safe/i);
  });
});
