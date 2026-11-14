// Клієнт планувальника: новий requestId на запит, pending одразу, застарілі відповіді відкидаються (SPEC §7.3).
import type { RoutePlan } from '../../contracts';
import { emptyPlan, planRoute, type RouteRequest } from '../../core';

export type RouteRunner = (request: RouteRequest) => Promise<RoutePlan>;
export type RouteInput = Omit<RouteRequest, 'requestId'>;

export interface RouteClient {
  /** Повертає requestId запиту. */
  request(input: RouteInput): number;
}

export function createRouteClient(run: RouteRunner, publishPlan: (plan: RoutePlan) => void): RouteClient {
  let latestRequestId = 0;

  return {
    request(input) {
      const requestId = ++latestRequestId;
      publishPlan(emptyPlan('pending', requestId));

      run({ ...input, requestId })
        .catch((error: unknown) => emptyPlan('invalid', requestId, { code: 'invalid-params' }, [`planner error: ${String(error)}`]))
        .then((plan) => {
          if (plan.requestId === latestRequestId) publishPlan(plan);
        });
      return requestId;
    },
  };
}

/** У тому ж потоці — для jsdom і браузерів без Worker. */
export const runInMainThread: RouteRunner = (request) => Promise.resolve().then(() => planRoute(request));

/** Web Worker; відповіді зіставляються за requestId. */
export function createWorkerRunner(): RouteRunner {
  const worker = new Worker(new URL('./route.worker.ts', import.meta.url), { type: 'module' });
  const waiting = new Map<number, { resolve: (plan: RoutePlan) => void; reject: (error: unknown) => void }>();

  worker.onmessage = (event: MessageEvent<RoutePlan>) => {
    waiting.get(event.data.requestId)?.resolve(event.data);
    waiting.delete(event.data.requestId);
  };
  worker.onerror = (event) => {
    for (const { reject } of waiting.values()) reject(event.message);
    waiting.clear();
  };

  return (request) => new Promise((resolve, reject) => {
    waiting.set(request.requestId, { resolve, reject });
    worker.postMessage(request);
  });
}

export function createDefaultRunner(): RouteRunner {
  return typeof Worker === 'undefined' ? runInMainThread : createWorkerRunner();
}
