/// <reference lib="webworker" />
import { planRoute, type RouteRequest } from '../../core';

self.onmessage = (event: MessageEvent<RouteRequest>) => {
  self.postMessage(planRoute(event.data));
};
