// F2: єдиний R3F Canvas (frameloop="demand"): глобус F1 при site = null, рельєф Gale — інакше.
// Без WebGL, після втрати контексту або з невалідною сіткою — 2D-план Б з причиною.
// У store пише лише addAnnotation — мітку екіпажу в режимі «Add mark» (F2-AC8, SPEC §7.12).
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { regionKind, validateGrid } from '../../contracts/planning';
import { mockModel } from '../../mocks';
import { useMission } from '../../store/useMission';
import { EvaLegend, Panel, StatusNote } from '../../ui';
import { useCameraMode } from './cameraStore';
import { createMark, keyboardMarkPoint, visibleMarks } from './lib/marks';
import { MarkGlyphIcon } from './MarkGlyph';
import { MarkTools } from './MarkTools';
import { useMarkTool } from './markStore';
import { xyToCell } from '../../contracts/planning';
import { SITE_LABEL, type AnnotationKind, type XY } from '../../contracts';
import { FpsProbe, type FpsReport } from './FpsProbe';
import { fpsEnabled } from './lib/fps';
import { applyGlobeCamera } from './lib/camera';
import { classifyCells } from './lib/cells';
import { displayHeights } from './lib/geometry';
import { buildOverlay } from './lib/overlay';
import { regionFileUrl } from './lib/paths';
import { force2DRequested, planReason, type PlanReason } from './lib/plan2d';
import { noReturnRuns, pointOfNoReturnMarker, readAbort } from './lib/abort';
import { gridLayerKind, gridLayerRGBA } from './lib/layerRaster';
import { traverseToXY, traverseVisible } from './lib/traverse';
import { Plan2D } from './Plan2D';
import { TerrainInfo } from './TerrainInfo';
import { TerrainScene } from './TerrainScene';
import { useOptionalTexture } from './useRegionTexture';
import { useTraverse } from './useTraverse';
import { useContextHeights, useRenderHeights } from './useRenderHeights';
import { buildZoneMask } from './lib/hd';
import { navOverlay, useNavPlan, useNavView } from './navStore';
import { NavChip } from './NavChip';
import './terrain.css';

export interface MapViewProps {
  /** 3D-вузли глобуса (F1), показуються при site = null */
  globe: ReactNode;
}

function hasWebGL(): boolean {
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return false;
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * У режимі demand заміна вмісту сцени не перемальовує кадр сама, а новий шейдер
 * може компілюватися асинхронно — тому кілька кадрів поспіль після зміни.
 */
function Redraw({ dep, frames = 30 }: { dep: unknown; frames?: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let left = frames;
    let id = 0;
    const tick = () => {
      invalidate();
      if (--left > 0) id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [dep, frames, invalidate]);
  return null;
}

/**
 * Слухач справжньої втрати контексту. Живе всередині Canvas і знімається при розмонтуванні:
 * коли F2 сам прибирає Canvas (?2d, невалідна сітка), R3F звільняє рендерер і браузер теж шле
 * webglcontextlost — це не втрата, і 3D має повернутись, щойно причина зникне.
 */
function ContextLossWatcher({ onLost }: { onLost: () => void }) {
  const get = useThree((s) => s.get);
  const latest = useRef(onLost);
  useEffect(() => {
    latest.current = onLost;
  });
  useEffect(() => {
    const el = get().gl.domElement;
    const handler = () => latest.current();
    el.addEventListener('webglcontextlost', handler);
    return () => el.removeEventListener('webglcontextlost', handler);
  }, [get]);
  return null;
}

/**
 * Глобус F1 монтується лише після того, як камеру повернуто з пози рельєфу на позу глобуса:
 * F1 рахує масштаб глобуса з camera.position під час рендеру. Інакше після «Back to globe»
 * масштаб брався з камери рельєфу (на 400 px глобус ставав на ~35 % більшим).
 */
function GlobeStage({ children }: { children: ReactNode }) {
  const get = useThree((s) => s.get);
  // Ініціалізатор стану виконується один раз під час першого рендеру GlobeStage — раніше за рендер дітей.
  // Скидання камери ідемпотентне, тож подвійний виклик у StrictMode безпечний.
  useState(() => applyGlobeCamera(get().camera));
  useEffect(() => get().invalidate(), [get]);
  return <>{children}</>;
}

function textureLabel(textureFile: string | null, status: ReturnType<typeof useOptionalTexture>['status']): string {
  if (textureFile === null) return 'height colours';
  // Columbia Hills: ортомозаїки Gusev у Trek немає — hillshade з DEM (region.layers optical, assumption).
  const name = /hirise/i.test(textureFile) ? 'HiRISE' : /hillshade/i.test(textureFile) ? 'Hillshade from DEM' : 'Surface';
  if (status === 'ready') return `${name} texture (greyscale, tinted for display)`;
  if (status === 'loading') return `${name} loading…`;
  if (status === 'error') return 'height colours (texture failed to load)';
  return 'height colours';
}

export function MapView({ globe }: MapViewProps) {
  // Навігація без GPS: маяки, інерціалка, контрольні точки (NavPanel) — на карті, якщо не вимкнено.
  const navPlan = useNavPlan();
  const navShown = useNavView((v) => v.show);
  const navMap = useMemo(() => (navShown ? navOverlay(navPlan) : null), [navShown, navPlan]);
  const site = useMission((s) => s.site);
  const grid = useMission((s) => s.grid);
  const region = useMission((s) => s.region);
  const layerFlags = useMission((s) => s.layers);
  const targets = useMission((s) => s.targets);
  const selectedIds = useMission((s) => s.selectedTargetIds);
  const plan = useMission((s) => s.plan);
  const selectedSegment = useMission((s) => s.selectedSegment);
  const reach = useMission((s) => s.reach);
  // Overview (Olympus Mons, Valles Marineris): лише рельєф — без бази, ореолу досяжності й міток.
  const overview = useMission((s) => regionKind(s.region) === 'overview');
  const missionBase = useMission((s) => s.base);
  const base = overview ? null : missionBase;
  const position = useMission((s) => s.position);
  const mode = useCameraMode((s) => s.mode);
  const annotations = useMission((s) => s.annotations);
  const addAnnotation = useMission((s) => s.addAnnotation);
  const adding = useMarkTool((s) => s.adding);

  const [webgl] = useState(hasWebGL);
  const [lost, setLost] = useState(false);
  const [fps] = useState(fpsEnabled);
  const [forced2D] = useState(force2DRequested);
  const [fpsReport, setFpsReport] = useState<FpsReport | null>(null);

  const noData = region?.noData;
  const maxSlopeDeg = (region?.model ?? mockModel).maxSlopeDeg;
  const gridErrors = useMemo(() => validateGrid(grid), [grid]);
  const valid = gridErrors.length === 0;
  const cells = useMemo(() => (valid ? classifyCells(grid, { noData, maxSlopeDeg }) : null), [valid, grid, noData, maxSlopeDeg]);
  const heights = useMemo(() => (valid ? displayHeights(grid, noData) : null), [valid, grid, noData]);
  const mask = overview ? undefined : reach?.mask;
  // F2-AC6 (SPEC §7.8): червоні відрізки без повернення; рахує F5 у reach.abort.
  const abort = useMemo(() => readAbort(reach), [reach]);
  const noReturn = useMemo(() => noReturnRuns(plan, abort), [plan, abort]);
  const noReturnLines = useMemo(() => noReturn.runs.map((r) => r.points), [noReturn]);
  // Без перевіреного джерела для emergencyO2G на екрані «assumption» (§7.8).
  const emergencyAssumption = (region?.model ?? mockModel).evidence.emergencyO2G?.status !== 'verified';

  const marks = useMemo(() => (valid ? visibleMarks(grid, annotations) : []), [valid, grid, annotations]);
  // Точка неповернення (§7.8): початок першого відрізка без повернення.
  const ponrMarker = useMemo(() => pointOfNoReturnMarker(plan, abort), [plan, abort]);
  const ponr = ponrMarker?.xy ?? null;
  const inReach = useMemo(
    () => (xy: XY) => {
      if (!mask || mask.length !== grid.width * grid.height) return true;
      const c = xyToCell(grid, xy);
      return c !== null && mask[c.index] === 1;
    },
    [mask, grid],
  );
  const place = (xy: XY) => {
    const { kind, text, setMessage } = useMarkTool.getState();
    const m = createMark(grid, xy, kind as AnnotationKind, text);
    if (!m) {
      setMessage('Outside the grid — mark not placed');
      return;
    }
    addAnnotation(m);
    setMessage(`${kind[0]!.toUpperCase()}${kind.slice(1)} mark added`);
  };
  const segmentPoint = keyboardMarkPoint(plan, selectedSegment);
  const onPick = adding && valid ? place : null;

  const reason: PlanReason | null = site === null ? null : planReason({ webgl, lost, gridErrors, forced: forced2D });
  const show3D = webgl && !lost && (site === null || reason === null);
  const setView3D = useCameraMode((s) => s.setView3D);
  useEffect(() => setView3D(show3D), [show3D, setView3D]);

  const textureUrl = region ? regionFileUrl(region.id, region.files.texture) : null;
  const hirise = useOptionalTexture(textureUrl, site !== null && show3D);
  const texture = hirise.status === 'ready' ? hirise.texture : null;
  const render = useRenderHeights(region, site !== null && show3D);
  const contextHeights = useContextHeights(region, site !== null && show3D);

  const sceneData = useMemo(() => {
    if (!cells || !heights) return null;
    const top = buildOverlay(grid, cells.classes, { mask });
    return {
      grid,
      heights,
      noData,
      // Ореол — лише в напівпрозорій верхній накладці, щоб під ним лишався колір висоти.
      baseRGBA: buildOverlay(grid, cells.classes, { heights }).data,
      topRGBA: top.data,
      render,
      zoneRGBA: buildZoneMask(grid.width, grid.height, cells.classes, mask),
      context: contextHeights,
      haloCells: top.haloCells,
      warnings: top.warnings,
    };
  }, [cells, heights, grid, noData, mask, render, contextHeights]);

  const raster2D = useMemo(
    () => (reason && cells && heights ? buildOverlay(grid, cells.classes, { heights, northUp: true }).data : null),
    [reason, cells, heights, grid],
  );

  const enabledLayers = useMemo(
    () => (region ? region.layers.filter((l) => layerFlags[l.id] && l.url) : []),
    [region, layerFlags],
  );
  // Шари, крім traverse (він малюється лінією нижче): растри вантажимо текстурою, slope/terrain малюємо із сітки.
  const mapLayers = useMemo(() => enabledLayers.filter((l) => l.id !== 'traverse').map((l) => ({ layer: l, kind: gridLayerKind(l) })), [enabledLayers]);
  const layerUrls = useMemo(
    () => (region ? mapLayers.filter((m) => m.kind === 'raster').map((m) => ({ id: m.layer.id, url: regionFileUrl(region.id, m.layer.url) })) : []),
    [region, mapLayers],
  );
  const gridLayers = (northUp: boolean) =>
    valid
      ? mapLayers.flatMap((m) =>
          m.kind === 'slope' || m.kind === 'terrain' ? [{ id: m.layer.id, rgba: gridLayerRGBA(grid, m.kind, m.layer.legend, { northUp }) }] : [],
        )
      : [];
  // eslint-disable-next-line react-hooks/exhaustive-deps -- залежить від тих самих mapLayers / grid / valid
  const gridLayers3D = useMemo(() => (show3D && site !== null ? gridLayers(false) : []), [show3D, site, mapLayers, grid, valid]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- див. вище
  const gridLayers2D = useMemo(() => (reason ? gridLayers(true) : []), [reason, mapLayers, grid, valid]);

  const traverseFile = site !== null && traverseVisible(region, layerFlags) ? region?.files.traverse : undefined;
  const traverse = useTraverse(region && traverseFile ? regionFileUrl(region.id, traverseFile) : null);
  const traverseXY = useMemo(
    () => (traverse.status === 'ready' && region && valid ? traverseToXY(region, grid, traverse.lines) : null),
    [traverse, region, grid, valid],
  );
  const traverseLines = traverseXY?.lines ?? [];
  const traverseStatus = region?.layers.find((l) => l.id === 'traverse')?.status ?? region?.status ?? 'mock';
  const traverseWarnings = [
    ...(traverse.status === 'error' ? [`Traverse failed to load (${traverse.message})`] : []),
    ...(traverse.status === 'ready' ? traverse.warnings : []),
    ...(traverseXY && traverseXY.outside > 0 ? [`Traverse: ${traverseXY.outside} point(s) outside the grid skipped`] : []),
  ];

  const status = region?.status ?? 'mock';
  const redrawKey = useMemo(
    () => ({}),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- новий ключ на будь-яку зміну сцени
    [site, sceneData, texture, layerUrls, gridLayers3D, traverseXY, targets, selectedIds, plan, selectedSegment, base, position, mode, marks, mask, ponrMarker],
  );

  const plan2D = (r: PlanReason) =>
    cells ? (
      <Plan2D
        reason={r}
        grid={grid}
        classes={cells.classes}
        counts={cells.counts}
        rasterRGBA={raster2D ?? (heights ? buildOverlay(grid, cells.classes, { heights, northUp: true }).data : null)}
        mask={mask ?? null}
        layerUrls={layerUrls}
        gridLayers={gridLayers2D}
        traverse={traverseLines}
        noReturn={noReturnLines}
        targets={targets}
        selectedIds={selectedIds}
        plan={plan}
        selectedSegment={selectedSegment}
        base={base}
        position={position}
        ponr={ponr}
        nav={navMap}
        marks={marks}
        onPick={onPick}
      />
    ) : (
      <StatusNote level="danger" live="alert">
        3D and 2D unavailable: {r.text}
      </StatusNote>
    );

  const globeFallback = (
    <div role="img" aria-label="2D plan B">
      <StatusNote level="warn" live="status">
        3D globe unavailable ({lost ? 'WebGL context lost' : 'WebGL unavailable'}). Use the site list to open a site.
      </StatusNote>
    </div>
  );

  return (
    <Panel title={site === null ? 'Mars globe' : `${SITE_LABEL[site]} terrain`} featureId="F2" owner="Олександр" mock={status === 'mock'}>
      {site !== null && valid && cells && (
        <TerrainInfo
          width={grid.width}
          height={grid.height}
          metersPerPixel={grid.metersPerPixel}
          status={status}
          texture={reason ? '2D plan' : textureLabel(region?.files.texture ?? null, hirise.status)}
          counts={cells.counts}
          haloShown={(sceneData?.haloCells ?? 0) > 0}
          routeShown={(plan?.path.length ?? 0) >= 2}
          segmentShown={plan !== null && selectedSegment !== null && plan.segments[selectedSegment] !== undefined}
          layers={mapLayers.map((m) => ({ name: m.layer.name, status: m.layer.status, drawn: m.kind !== null }))}
          traverse={traverseLines.length > 0 ? { status: traverseStatus } : null}
          noReturn={noReturn.count > 0 && abort ? { emergencyO2G: abort.emergencyO2G, assumption: emergencyAssumption } : null}
          warnings={[...(sceneData?.warnings ?? []), ...traverseWarnings, ...(noReturn.warning ? [noReturn.warning] : [])]}
        />
      )}
      {site !== null && valid && !overview && <MarkTools onMarkSegment={segmentPoint ? () => place(segmentPoint) : null} />}
      <div className={`terrain-stage${onPick ? ' is-adding' : ''}`}>
        {site !== null && <NavChip />}
        {show3D ? (
          <SceneBoundary fallback={site === null ? globeFallback : plan2D({ code: 'render-error', text: '3D render failed' })}>
            <Canvas
              frameloop={fps && site !== null ? 'always' : 'demand'}
              shadows
              camera={{ position: [0, 0, 3], fov: 45, near: 0.1, far: 100 }}
            >
              <ContextLossWatcher onLost={() => setLost(true)} />
              <Redraw dep={redrawKey} />
              {site === null ? (
                <GlobeStage>{globe}</GlobeStage>
              ) : (
                sceneData && (
                  <>
                    <TerrainScene
                      data={sceneData}
                      texture={texture}
                      layerUrls={layerUrls}
                      gridLayers={gridLayers3D}
                      traverse={traverseLines}
                      noReturn={noReturnLines}
                      targets={targets}
                      selectedIds={selectedIds}
                      plan={plan}
                      selectedSegment={selectedSegment}
                      base={base}
                      position={position}
                      mode={mode}
                      marks={marks}
                      onPick={onPick}
                      inReach={inReach}
                      ponr={ponrMarker}
                      nav={navMap}
                    />
                    {fps && <FpsProbe onReport={setFpsReport} />}
                  </>
                )
              )}
            </Canvas>
          </SceneBoundary>
        ) : site === null ? (
          globeFallback
        ) : (
          plan2D(reason ?? { code: 'no-webgl', text: 'WebGL unavailable' })
        )}
        {fps && site !== null && show3D && (
          <p className="terrain-fps" role="status">
            FPS {fpsReport ? `${fpsReport.phase} · last ${fpsReport.lastFps} · ${fpsReport.samples}/60 s · median ${fpsReport.median?.toFixed(1) ?? '—'}` : 'starting…'}
            {' · '}
            {typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x` : ''}
          </p>
        )}
      </div>
      {site !== null && valid && !overview && (
        <div className="terrain-legend-eva">
          <EvaLegend kinds={['base', 'target', 'astronaut', 'ponr']} size={16} />
          <ul className="terrain-legend-marks" aria-label="Crew mark legend">
            {(['impassable', 'hazard', 'note', 'plan'] as const).map((k) => (
              <li key={k}>
                <MarkGlyphIcon kind={k} size={16} label="" />
                <span>{k === 'impassable' ? 'Blocked (route never goes)' : k === 'hazard' ? 'Hazard (route goes around)' : k === 'note' ? 'Note' : 'Plan'}</span>
              </li>
            ))}
          </ul>
          {marks.length > 0 && <p className="terrain-counter" style={{ margin: 0, fontWeight: 400 }}>{marks.length} crew mark{marks.length === 1 ? '' : 's'} on map</p>}
        </div>
      )}
    </Panel>
  );
}
