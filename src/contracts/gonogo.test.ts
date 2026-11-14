import { describe, expect, it } from 'vitest';
import { evaluateGoNoGo, RETURN_CAUTION_S, STATION_ORDER, type GoNoGoInput } from './gonogo';
import type { ReachabilityResult, Region, RoutePlan } from './index';
import { mockGrid, mockLimits, mockModel, mockTargets } from '../mocks';
import { xyToCell } from './planning';

const plan: RoutePlan = { status: 'ok', path: [], segments: [], legs: [], totals: { time: 900, o2: 180, energy: 0, dose: null, dist: 0 }, warnings: [], requestId: 1 };
const fullMask = () => new Uint8Array(mockGrid.width * mockGrid.height).fill(1);
const reach = (extra: Partial<ReachabilityResult> = {}): ReachabilityResult => ({
  status: 'estimated', mask: fullMask(), returnInS: 1980, deficits: [], swap: null, abort: { segments: [], pointOfNoReturnS: null, emergencyO2G: 360 }, warnings: [], ...extra,
});
const verified = { status: 'verified' } as unknown as Region;
const clean: GoNoGoInput = {
  site: 'gale', targets: mockTargets, selectedTargetIds: ['mock-a', 'mock-b'], grid: mockGrid, region: verified,
  model: { ...mockModel, doseUSvPerS: 0.01 }, limits: { ...mockLimits, dose: 1000 }, plan, reach: reach(), time: 0,
};
const call = (r: ReturnType<typeof evaluateGoNoGo>, id: string) => r.stations.find((s) => s.id === id)!;

describe('evaluateGoNoGo (SPEC §7.10)', () => {
  it('усі станції в порядку опитування', () => {
    expect(evaluateGoNoGo(clean).stations.map((s) => s.id)).toEqual(STATION_ORDER);
  });

  it('усі дані відомі й у межах → GO', () => {
    const r = evaluateGoNoGo(clean);
    expect(r.verdict).toBe('go');
    expect(r.during).toBe(false);
  });

  it('штатний mock: доза невідома, рельєф MOCK, модель incomplete → CAUTION', () => {
    const r = evaluateGoNoGo({ ...clean, region: null, model: mockModel, limits: mockLimits, reach: reach({ status: 'incomplete' }) });
    expect(r.verdict).toBe('caution');
    expect(['RAD', 'DAT', 'MDL'].map((id) => call(r, id).call)).toEqual(['caution', 'caution', 'caution']);
  });

  it('без сайту, без цілей, без плану, план рахується → HOLD з наступною дією', () => {
    expect(evaluateGoNoGo({ ...clean, site: null }).verdict).toBe('hold');
    expect(call(evaluateGoNoGo({ ...clean, selectedTargetIds: [] }), 'RTE').fix).toEqual({ kind: 'select-targets' });
    const noPlan = evaluateGoNoGo({ ...clean, plan: null, reach: null });
    expect(noPlan.verdict).toBe('hold');
    expect(call(noPlan, 'RTE').fix).toEqual({ kind: 'build-route' });
    expect(evaluateGoNoGo({ ...clean, plan: { ...plan, status: 'pending' } }).verdict).toBe('hold');
  });

  it('маршруту немає → NO-GO з кодом причини', () => {
    const r = evaluateGoNoGo({ ...clean, plan: { ...plan, status: 'no-path', reason: { code: 'no-path-leg', legIndex: 1 } } });
    expect(call(r, 'RTE')).toMatchObject({ call: 'nogo', reason: 'No route: no-path-leg' });
  });

  it('дефіцит ресурсу → LSS NO-GO із заміною цілі з reach.swap', () => {
    const r = evaluateGoNoGo({ ...clean, reach: reach({ deficits: ['o2'], swap: { dropId: 'mock-b', addId: 'mock-d' } }) });
    expect(r.verdict).toBe('nogo');
    expect(call(r, 'LSS')).toMatchObject({ call: 'nogo', reason: 'Deficit: O₂', fix: { kind: 'replace-target', dropId: 'mock-b', addId: 'mock-d' } });
  });

  it('Return in: < 15 хв → CAUTION, < 0 → NO-GO «повертайся»; рівно 15 хв → GO', () => {
    expect(call(evaluateGoNoGo({ ...clean, reach: reach({ returnInS: RETURN_CAUTION_S - 1 }) }), 'RTN').call).toBe('caution');
    expect(call(evaluateGoNoGo({ ...clean, reach: reach({ returnInS: RETURN_CAUTION_S }) }), 'RTN').call).toBe('go');
    expect(call(evaluateGoNoGo({ ...clean, reach: reach({ returnInS: -1 }) }), 'RTN')).toMatchObject({ call: 'nogo', fix: { kind: 'return-now' } });
  });

  it('ціль поза ореолом → SCI NO-GO; заміна, якщо swap прибирає саме її', () => {
    const mask = fullMask();
    const b = mockTargets.find((t) => t.id === 'mock-b')!;
    mask[xyToCell(mockGrid, b.coordinates)!.index] = 0;
    const r = evaluateGoNoGo({ ...clean, reach: reach({ mask, swap: { dropId: 'mock-b', addId: 'mock-d' } }) });
    expect(call(r, 'SCI')).toMatchObject({ call: 'nogo', fix: { kind: 'replace-target', dropId: 'mock-b', addId: 'mock-d' } });
    const r2 = evaluateGoNoGo({ ...clean, reach: reach({ mask, swap: null }) });
    expect(call(r2, 'SCI').fix).toEqual({ kind: 'remove-target', targetId: 'mock-b' });
  });

  it('Abort map: точка неповернення → CAUTION з хвилинами, з першого відрізка → NO-GO, немає оцінки → CAUTION', () => {
    expect(call(evaluateGoNoGo({ ...clean, reach: reach({ abort: { segments: [], pointOfNoReturnS: 1080, emergencyO2G: 360 } }) }), 'ABT'))
      .toMatchObject({ call: 'caution', reason: 'Point of no return in 18 min' });
    expect(call(evaluateGoNoGo({ ...clean, reach: reach({ abort: { segments: [], pointOfNoReturnS: 0, emergencyO2G: 360 } }) }), 'ABT').call).toBe('nogo');
    expect(call(evaluateGoNoGo({ ...clean, reach: reach({ abort: null }) }), 'ABT').call).toBe('caution');
  });

  it('модель invalid → NO-GO; невалідна сітка → DAT NO-GO', () => {
    expect(call(evaluateGoNoGo({ ...clean, reach: reach({ status: 'invalid' }) }), 'MDL').call).toBe('nogo');
    expect(call(evaluateGoNoGo({ ...clean, grid: { ...mockGrid, walkable: new Uint8Array(3) } }), 'DAT').call).toBe('nogo');
  });

  it('під час виходу (time > 0) during = true; невідоме ніколи не дає GO', () => {
    const r = evaluateGoNoGo({ ...clean, time: 600, reach: reach({ returnInS: -5 }) });
    expect(r.during).toBe(true);
    expect(r.verdict).toBe('nogo');
    const unknown = evaluateGoNoGo({ ...clean, reach: reach({ returnInS: null }) });
    expect(unknown.verdict).not.toBe('go');
  });
});
