import { describe, expect, it } from 'vitest';
import type { RoutePlan } from '../../contracts';
import { emptyPlan, type RouteRequest } from '../../core';
import { mockBase, mockGrid, mockModel } from '../../mocks';
import { createRouteClient } from './route-client';

const input = { grid: mockGrid, model: mockModel, start: mockBase, waypoints: [], base: mockBase };

/** Ранер, якому тест сам каже, коли відповісти. */
function manualRunner() {
  const pending = new Map<number, (plan: RoutePlan) => void>();
  const run = (request: RouteRequest) => new Promise<RoutePlan>((resolve) => pending.set(request.requestId, resolve));
  const answer = (requestId: number) => pending.get(requestId)!(emptyPlan('ok', requestId));
  return { run, answer };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('route-client · F4-AC5', () => {
  it('одразу публікує pending з новим requestId', () => {
    const plans: RoutePlan[] = [];
    const client = createRouteClient(manualRunner().run, (p) => plans.push(p));

    const first = client.request(input);
    const second = client.request(input);

    expect(second).toBeGreaterThan(first);
    expect(plans.map((p) => [p.status, p.requestId])).toEqual([['pending', first], ['pending', second]]);
  });

  it('застаріла відповідь відкидається, свіжа — публікується', async () => {
    const plans: RoutePlan[] = [];
    const runner = manualRunner();
    const client = createRouteClient(runner.run, (p) => plans.push(p));
    const first = client.request(input);
    const second = client.request(input);

    runner.answer(second);
    runner.answer(first);
    await flush();

    const done = plans.filter((p) => p.status !== 'pending');
    expect(done.map((p) => p.requestId)).toEqual([second]);
  });

  it('помилка ранера → план не ok з текстом, а не тиша', async () => {
    const plans: RoutePlan[] = [];
    const client = createRouteClient(() => Promise.reject(new Error('worker crashed')), (p) => plans.push(p));
    client.request(input);
    await flush();

    expect(plans.at(-1)!.status).toBe('invalid');
    expect(plans.at(-1)!.warnings.join(' ')).toMatch(/worker crashed/);
  });
});
