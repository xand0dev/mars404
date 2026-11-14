// F4: маршрут A* (SPEC §7.3). Пише в store лише setPlan, setWaypoints, setSelectedSegment.
import { useEffect, useState } from 'react';
import type { ModelParams, RoutePlan, Target, XY } from '../../contracts';
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';
import { ElevationProfile } from './ElevationProfile';
import { describeFailure, formatDistance, formatDose, formatEnergy, formatMinutes, formatO2, pointLabels } from './format';
import { createDefaultRunner, createRouteClient, type RouteClient } from './route-client';
import { SegmentTable } from './SegmentTable';
import { WaypointOrder } from './WaypointOrder';
import './route.css';

let sharedClient: RouteClient | null = null;

/** Один клієнт (і Worker) на застосунок: requestId наскрізний для всіх запитів. */
function getRouteClient(): RouteClient {
  sharedClient ??= createRouteClient(createDefaultRunner(), (plan) => useMission.getState().setPlan(plan));
  return sharedClient;
}

const sameXY = (a: XY, b: XY) => a[0] === b[0] && a[1] === b[1];

function waypointNames(waypoints: XY[], targets: Target[]): string[] {
  return waypoints.map((p, k) => targets.find((t) => sameXY(t.coordinates, p))?.name ?? `Point ${k + 1}`);
}

/** Коефіцієнти без перевіреного джерела — показуємо чесно (SPEC §7.6). */
function unverifiedCoefficients(model: ModelParams): string[] {
  return Object.entries(model.evidence)
    .filter(([, source]) => source.status !== 'verified')
    .map(([key, source]) => `${key} (${source.status === 'mock' ? 'MOCK' : source.status})`);
}

export function RoutePanel() {
  const grid = useMission((s) => s.grid);
  const model = useMission((s) => s.model);
  const waypoints = useMission((s) => s.waypoints);
  const base = useMission((s) => s.base);
  const position = useMission((s) => s.position);
  const plan = useMission((s) => s.plan);
  const targets = useMission((s) => s.targets);
  const region = useMission((s) => s.region);
  const noData = region?.noData;
  const selectedSegment = useMission((s) => s.selectedSegment);
  const setWaypoints = useMission((s) => s.setWaypoints);
  const setSelectedSegment = useMission((s) => s.setSelectedSegment);
  // Після першого «Build route» план перебудовується на кожну зміну входів (SPEC §6.1).
  const [autoRebuild, setAutoRebuild] = useState(false);

  useEffect(() => {
    if (!autoRebuild) return;
    if (waypoints.length === 0 || !base) {
      useMission.getState().setPlan(null);
      return;
    }
    getRouteClient().request({ grid, model, start: position ?? base, waypoints, base, noData });
  }, [autoRebuild, grid, model, waypoints, base, position, noData]);

  const names = waypointNames(waypoints, targets);
  const labels = pointLabels(names);
  const unverified = unverifiedCoefficients(model);
  const canBuild = waypoints.length > 0 && base !== null;

  const build = () => {
    if (autoRebuild && base) getRouteClient().request({ grid, model, start: position ?? base, waypoints, base, noData });
    setAutoRebuild(true);
  };

  return (
    <Panel title="Route" featureId="F4" owner="Влад" mock={region === null}>
      {/* Текст лічильника перевіряє src/app/App.test.tsx (F0). */}
      <p className="route-count">{waypoints.length} waypoint(s) selected</p>
      {waypoints.length > 0 && <WaypointOrder waypoints={waypoints} names={names} onReorder={setWaypoints} />}
      <button type="button" className="route-build" disabled={!canBuild} aria-busy={plan?.status === 'pending'} onClick={build}>
        Build route
      </button>
      <RouteStatus plan={plan} labels={labels} hasWaypoints={waypoints.length > 0} />
      {plan?.status === 'ok' && plan.segments.length > 0 && (
        <>
          <ElevationProfile plan={plan} grid={grid} selectedSegment={selectedSegment} onSelect={setSelectedSegment} />
          <SegmentTable plan={plan} selectedSegment={selectedSegment} onSelect={setSelectedSegment} />
        </>
      )}
      {unverified.length > 0 && (
        <StatusNote level="warn">Model coefficients without verified source: {unverified.join(', ')}. Model, not certified navigation.</StatusNote>
      )}
    </Panel>
  );
}

function RouteStatus({ plan, labels, hasWaypoints }: { plan: RoutePlan | null; labels: string[]; hasWaypoints: boolean }) {
  if (!hasWaypoints) return <StatusNote level="info">Select at least one target to build a route.</StatusNote>;
  if (!plan) return <StatusNote level="info" live="status">Route not built for the current targets — press «Build route».</StatusNote>;
  if (plan.status === 'pending') return <StatusNote level="info" live="status">Calculating route…</StatusNote>;
  if (plan.status === 'ok') {
    const t = plan.totals;
    return (
      <StatusNote level="ok" live="status">
        Route found (model estimate): {formatDistance(t.dist)} · {formatMinutes(t.time)} · {formatO2(t.o2)} · {formatEnergy(t.energy)} · dose {formatDose(t.dose)}
      </StatusNote>
    );
  }
  const reason = plan.reason ? describeFailure(plan.reason, labels) : `${plan.status} · no route`;
  return (
    <StatusNote level="danger" live="alert">
      No valid route: {reason}
      {plan.warnings.length > 0 && ` (${plan.warnings.join('; ')})`}
    </StatusNote>
  );
}
