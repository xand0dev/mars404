import type { RouteFailure } from '../../contracts';

/** Підписи точок плану: 0 = Start, 1…n = цілі, n+1 = Base (як pointIndex у RouteFailure). */
export function pointLabels(waypointNames: string[]): string[] {
  return ['Start', ...waypointNames, 'Base'];
}

/** Код причини + номер точки або ноги англійською (SPEC §7.7). */
export function describeFailure(reason: RouteFailure, labels: string[]): string {
  const point = (i: number) => `point ${i} (${labels[i] ?? '?'})`;
  switch (reason.code) {
    case 'out-of-grid':
      return `out-of-grid · ${point(reason.pointIndex)} is outside the map grid`;
    case 'blocked-point':
      return `blocked-point · ${point(reason.pointIndex)} is on a blocked or NoData cell`;
    case 'disconnected':
      return `disconnected · ${point(reason.pointIndex)} is in an isolated area`;
    case 'no-path-leg':
      return `no-path-leg · no path on leg ${reason.legIndex} (${labels[reason.legIndex] ?? '?'} → ${labels[reason.legIndex + 1] ?? '?'})`;
    case 'invalid-params':
      return 'invalid-params · model parameters are invalid';
  }
}

export const formatDistance = (m: number) => `${m.toFixed(1)} m`;
export const formatSlope = (deg: number) => `${deg >= 0 ? '+' : '−'}${Math.abs(deg).toFixed(1)}°`;
export const formatSeconds = (s: number) => `${s.toFixed(1)} s`;
export const formatMinutes = (s: number) => `${(s / 60).toFixed(1)} min`;
export const formatO2 = (g: number) => `${g.toFixed(2)} g O₂`;
export const formatEnergy = (wh: number) => `${wh.toFixed(2)} Wh`;
export const formatDose = (uSv: number | null) => (uSv === null ? 'no data' : `${uSv.toFixed(2)} µSv`);
