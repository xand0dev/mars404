// F4: маршрут A* (SPEC §7.3). Пише в store лише setPlan, setWaypoints, setSelectedSegment.
import { useEffect, useMemo, useState } from 'react';
import type { Annotation, RoutePlan, Segment, Target, XY } from '../../contracts';
import { applyAnnotations } from '../../contracts/planning';
import { compareTravelModes, modelFor } from '../../core';
import { useMission } from '../../store/useMission';
import { Disclosure, Panel, StatusNote } from '../../ui';
import { ElevationProfile } from './ElevationProfile';
import { ModelCoefficientsNote } from './ModelCoefficients';
import { describeFailure, formatDistance, formatDose, formatEnergy, formatMinutes, formatO2, pointLabels } from './format';
import { createDefaultRunner, createRouteClient, type RouteClient } from './route-client';
import { segmentRisks } from './segment-risk';
import { RouteDock } from './RouteDock';
import { SegmentTable } from './SegmentTable';
import { findNearestPhoto, photoCandidates } from './surface-photo';
import { TraversePlan } from './TraversePlan';
import { RoverNote, TravelModeToggle } from './TravelMode';
import { ViewFromHere } from './ViewFromHere';
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

export function RoutePanel() {
  const grid = useMission((s) => s.grid);
  const model = useMission((s) => s.model);
  const waypoints = useMission((s) => s.waypoints);
  const base = useMission((s) => s.base);
  const position = useMission((s) => s.position);
  const plan = useMission((s) => s.plan);
  const targets = useMission((s) => s.targets);
  const photos = useMission((s) => s.photos);
  const abort = useMission((s) => s.reach?.abort ?? null);
  const annotations = useMission((s) => s.annotations);
  // Мітки екіпажу (SPEC §7.12): impassable → непрохідно, hazard → дорожче; нова мітка → автоперебудова.
  const planningGrid = useMemo(() => applyAnnotations(grid, annotations), [grid, annotations]);
  const region = useMission((s) => s.region);
  const noData = region?.noData;
  const selectedSegment = useMission((s) => s.selectedSegment);
  const setWaypoints = useMission((s) => s.setWaypoints);
  const setSelectedSegment = useMission((s) => s.setSelectedSegment);
  // Після першого «Build route» план перебудовується на кожну зміну входів (SPEC §6.1).
  const [autoRebuild, setAutoRebuild] = useState(false);
  // Пішки чи на ровері: маршрут — моделлю режиму, повернення (ореол, Abort map) — пішохідною моделлю зі store (walkback).
  const travelMode = useMission((s) => s.travelMode);
  const setTravelMode = useMission((s) => s.setTravelMode);
  const planModel = useMemo(() => modelFor(travelMode, model), [travelMode, model]);
  const limits = useMission((s) => s.limits);
  const elapsedS = useMission((s) => s.time);
  // Два варіанти поруч: пішки й на ровері — з того самого шляху, без другого пошуку.
  const travelOptions = useMemo(
    () => compareTravelModes({ plan, planMode: travelMode, model, limits, elapsedS }),
    [plan, travelMode, model, limits, elapsedS],
  );

  const requestPlan = (start: XY, end: XY) => getRouteClient().request({ grid: planningGrid, model: planModel, start, waypoints, base: end, noData });

  useEffect(() => {
    if (!autoRebuild) return;
    if (waypoints.length === 0 || !base) {
      useMission.getState().setPlan(null);
      return;
    }
    requestPlan(position ?? base, base);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestPlan замикає ті самі входи, що в списку
  }, [autoRebuild, planningGrid, planModel, waypoints, base, position, noData]);

  const names = waypointNames(waypoints, targets);
  const labels = pointLabels(names);
  const canBuild = waypoints.length > 0 && base !== null;
  const site = useMission((s) => s.site);
  const risks = plan?.status === 'ok' ? segmentRisks({ plan, grid, annotations, abort, noData }) : [];
  const candidates = photoCandidates(photos, targets);
  const photoFor = (segment: Segment) => {
    const nearest = findNearestPhoto(segment, candidates);
    return nearest && { photo: nearest.candidate.photo, distanceM: nearest.distanceM, location: nearest.candidate.location, camera: nearest.candidate.camera };
  };

  const build = () => {
    if (autoRebuild && base) requestPlan(position ?? base, base);
    setAutoRebuild(true);
  };

  return (
    <Panel title="Route" featureId="F4" owner="Влад" mock={region === null}>
      {/* Текст лічильника перевіряє src/app/App.test.tsx (F0). */}
      <p className="route-count">{waypoints.length} waypoint(s) selected</p>
      {waypoints.length > 0 && (
        <Disclosure summary={`Target order (${waypoints.length})`}>
          <WaypointOrder waypoints={waypoints} names={names} onReorder={setWaypoints} />
        </Disclosure>
      )}
      <TravelModeToggle mode={travelMode} onChange={setTravelMode} className="route-mode route-mode--panel" options={travelOptions} />
      <button type="button" className="route-build" disabled={!canBuild} aria-busy={plan?.status === 'pending'} onClick={build}>
        Build route
      </button>
      <RouteStatus plan={plan} labels={labels} hasWaypoints={waypoints.length > 0} />
      {travelMode === 'rover' && <RoverNote plan={plan} />}
      <CrewMarksNote annotations={annotations} />
      {plan?.status === 'ok' && plan.segments.length > 0 && (
        <>
          <TraversePlan plan={plan} labels={labels} abort={abort} />
          <ElevationProfile plan={plan} grid={grid} selectedSegment={selectedSegment} onSelect={setSelectedSegment} />
          <SegmentTable plan={plan} risks={risks} selectedSegment={selectedSegment} onSelect={setSelectedSegment} />
          {selectedSegment !== null && plan.segments[selectedSegment] && (
            <ViewFromHere segment={plan.segments[selectedSegment]} segmentIndex={selectedSegment} photos={photos} targets={targets} />
          )}
        </>
      )}
      <ModelCoefficientsNote model={model} />
      {site !== null && (
        <RouteDock plan={plan} selectedSegment={selectedSegment} onSelect={setSelectedSegment} onBuild={build} canBuild={canBuild} travelMode={travelMode} onTravelModeChange={setTravelMode} risks={risks} labels={labels} abort={abort} photoFor={photoFor} />
      )}
    </Panel>
  );
}

/** Які мітки враховано в маршруті — щоб «no path» після мітки було зрозумілим. */
function CrewMarksNote({ annotations }: { annotations: readonly Annotation[] }) {
  const count = (kind: Annotation['kind']) => annotations.filter((a) => a.kind === kind).length;
  const impassable = count('impassable');
  const hazard = count('hazard');
  if (impassable + hazard === 0) return null;
  return <StatusNote level="info">Crew marks applied: {impassable} impassable, {hazard} hazard (route avoids or penalises them).</StatusNote>;
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
