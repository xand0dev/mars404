import { describe, expect, it } from 'vitest';
import type { ReachabilityResult, Region, RoutePlan } from '../../contracts';
import { REFERENCE_PLAN_TOTALS, REFERENCE_RETURN_MIN, mockLimits, mockTargets } from '../../mocks';
import { hudState, type HudInput } from './hudState';

// Фікстури еталону SPEC §7.4 (mock: limits 3600 с / 720 г, o2 0.2 г/с, резерв 0.2, доза невідома).
const plan = (status: RoutePlan['status'], extra: Partial<RoutePlan> = {}): RoutePlan => ({
  status,
  path: [],
  segments: [],
  legs: [],
  totals: { ...REFERENCE_PLAN_TOTALS, energy: 0, dose: null, dist: 0 },
  warnings: [],
  requestId: 1,
  ...extra,
});
const reach = (extra: Partial<ReachabilityResult> = {}): ReachabilityResult => ({
  status: 'incomplete',
  mask: new Uint8Array(0),
  returnInS: 1980,
  deficits: [],
  swap: null,
  warnings: [],
  ...extra,
});
const base: HudInput = {
  site: 'gale',
  region: null,
  targets: mockTargets,
  selectedTargetIds: ['mock-a', 'mock-b'],
  plan: plan('ok'),
  reach: reach(),
  budget: { ...mockLimits },
};
const st = (extra: Partial<HudInput>) => hudState({ ...base, ...extra });

describe('F7-AC4 · стани HUD: пояснення + наступна дія', () => {
  it('empty: місце не обрано', () => {
    const v = st({ site: null, selectedTargetIds: [], plan: null, reach: null });
    expect(v.kind).toBe('empty');
    expect(v.minutes).toBe('—');
    expect(v.next).toMatch(/Gale/);
  });

  it('empty: місце є, цілей немає, F5 ще не оцінив', () => {
    const v = st({ selectedTargetIds: [], plan: null, reach: null });
    expect(v.kind).toBe('empty');
    expect(v.next).toMatch(/Select science targets/);
  });

  it('цілі обрано, плану немає → «Build route», числа немає', () => {
    const v = st({ plan: null, reach: reach({ returnInS: null }) });
    expect(v.kind).toBe('no-plan');
    expect(v.minutes).toBe('—');
    expect(v.next).toMatch(/Build route/);
  });

  it('pending → «Calculating…», а не стара N (сценарій заміни цілі §7.4)', () => {
    const v = st({ plan: plan('pending'), reach: reach({ returnInS: 28 * 60 }) });
    expect(v.kind).toBe('pending');
    expect(v.level).toBe('pending');
    expect(v.minutes).toBe('—');
    expect(v.message).toMatch(/Calculating…/);
  });

  it('план ok, reach ще не пораховано → pending', () => {
    expect(st({ reach: null }).kind).toBe('pending');
  });

  it('invalid план або reach → danger з наступною дією', () => {
    const a = st({ plan: plan('invalid', { reason: { code: 'invalid-params' } }) });
    const b = st({ reach: reach({ status: 'invalid', returnInS: null }) });
    for (const v of [a, b]) {
      expect(v.kind).toBe('invalid');
      expect(v.level).toBe('danger');
      expect(v.minutes).toBe('—');
      expect(v.next.length).toBeGreaterThan(0);
    }
  });

  it('no-path → причина з reason і порада', () => {
    const v = st({ plan: plan('no-path', { reason: { code: 'blocked-point', pointIndex: 2 } }) });
    expect(v.kind).toBe('no-path');
    expect(v.message).toBe('No path. Target 2 is on a blocked cell.');
    expect(v.next).toMatch(/Remove or replace a target/);
  });

  it('deficit → alert, danger-іконка дефіциту, ресурси названо', () => {
    const v = st({ reach: reach({ returnInS: -120, deficits: ['o2'] }) });
    expect(v.kind).toBe('deficit');
    expect(v.level).toBe('deficit');
    expect(v.live).toBe('alert');
    expect(v.message).toMatch(/O₂/);
    expect(v.next).toBe('Remove a target or return to base now');
  });

  it('від’ємний returnInS без deficits теж дефіцит', () => {
    expect(st({ reach: reach({ returnInS: -1 }) }).kind).toBe('deficit');
  });

  it('incomplete → «Estimate incomplete: dose — no data»', () => {
    const v = st({});
    expect(v.kind).toBe('incomplete');
    expect(v.level).toBe('warn');
    expect(v.live).toBe('status');
    expect(v.message).toBe('Estimate incomplete: dose — no data');
  });

  it('estimated → найкращий статус «Within model», ніколи «safe»', () => {
    const v = st({ reach: reach({ status: 'estimated' }) });
    expect(v.kind).toBe('estimated');
    expect(v.level).toBe('ok');
    expect(v.message).toBe('Within model');
    expect(v.next).toBe('Up to 33 min at stops, then head back.');
    expect(JSON.stringify(v)).not.toMatch(/safe/i);
  });

  it('MOCK: без region або region.status = mock', () => {
    expect(st({}).mock).toBe(true);
    expect(st({ region: { status: 'mock' } as Region }).mock).toBe(true);
    expect(st({ region: { status: 'verified' } as Region }).mock).toBe(false);
  });

  it('NaN у reach / budget → «—», а не «NaN»', () => {
    const v = st({ reach: reach({ status: 'estimated', returnInS: NaN }), budget: { time: NaN, o2: NaN, energy: NaN, dose: null } });
    expect(v.minutes).toBe('—');
    expect(v.kind).toBe('invalid');
    expect(JSON.stringify(v)).not.toMatch(/NaN/);
  });
});

describe('F7-AC3 · N з еталону §7.4 — та сама, що з reach', () => {
  it.each([
    ['план 900 с', 1980, REFERENCE_RETURN_MIN.plan],
    ['план, t = 600 с', 1380, REFERENCE_RETURN_MIN.planAfter600s],
    ['O₂ −40%', 828, REFERENCE_RETURN_MIN.o2Minus40],
  ])('%s → %i хв', (_, s, n) => {
    expect(st({ reach: reach({ returnInS: s }) }).minutes).toBe(String(n));
  });

  it('без плану (цілей немає), t = 0 → 48 хв, incomplete', () => {
    const v = st({ selectedTargetIds: [], plan: null, reach: reach({ returnInS: 2880 }) });
    expect(v.minutes).toBe(String(REFERENCE_RETURN_MIN.noPlan));
    expect(v.kind).toBe('incomplete');
    expect(v.next).toMatch(/Select science targets/);
  });
});

describe('F7-AC5 · кандидат заміни', () => {
  it('swap → імена цілей для кнопки', () => {
    const v = st({ reach: reach({ deficits: ['o2'], returnInS: -10, swap: { dropId: 'mock-a', addId: 'mock-d' } }) });
    expect(v.swap).toEqual({ dropId: 'mock-a', addId: 'mock-d', dropName: 'MOCK Site A', addName: 'MOCK Site D' });
    expect(v.next).toBe('Replace MOCK Site A with MOCK Site D');
  });

  it('swap = null → кнопки немає', () => {
    expect(st({}).swap).toBeNull();
  });
});
