// F2: єдиний R3F Canvas (frameloop="demand"): глобус F1 при site = null, рельєф Gale — інакше.
// Без WebGL, після втрати контексту або з невалідною сіткою — 2D-план Б з причиною. У store нічого не пише.
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { validateGrid } from '../../contracts/planning';
import { mockModel } from '../../mocks';
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';
import { useCameraMode } from './cameraStore';
import { FpsProbe, type FpsReport } from './FpsProbe';
import { fpsEnabled } from './lib/fps';
import { applyGlobeCamera } from './lib/camera';
import { classifyCells } from './lib/cells';
import { displayHeights } from './lib/geometry';
import { buildOverlay } from './lib/overlay';
import { regionFileUrl } from './lib/paths';
import { force2DRequested, planReason, type PlanReason } from './lib/plan2d';
import { noReturnRuns, readAbort } from './lib/abort';
import { gridLayerKind, gridLayerRGBA } from './lib/layerRaster';
import { traverseToXY, traverseVisible } from './lib/traverse';
import { Plan2D } from './Plan2D';
import { TerrainInfo } from './TerrainInfo';
import { TerrainScene } from './TerrainScene';
import { useOptionalTexture } from './useRegionTexture';
import { useTraverse } from './useTraverse';
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

function textureLabel(hasRegion: boolean, status: ReturnType<typeof useOptionalTexture>['status']): string {
  if (!hasRegion) return 'height colours';
  if (status === 'ready') return 'HiRISE texture';
  if (status === 'loading') return 'HiRISE loading…';
  if (status === 'error') return 'height colours (texture failed to load)';
  return 'height colours';
}

export function MapView({ globe }: MapViewProps) {
  const site = useMission((s) => s.site);
  const grid = useMission((s) => s.grid);
  const region = useMission((s) => s.region);
  const layerFlags = useMission((s) => s.layers);
  const targets = useMission((s) => s.targets);
  const selectedIds = useMission((s) => s.selectedTargetIds);
  const plan = useMission((s) => s.plan);
  const selectedSegment = useMission((s) => s.selectedSegment);
  const reach = useMission((s) => s.reach);
  const base = useMission((s) => s.base);
  const position = useMission((s) => s.position);
  const mode = useCameraMode((s) => s.mode);

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
  const mask = reach?.mask;
  // F2-AC6 (SPEC §7.8): червоні відрізки без повернення; рахує F5 у reach.abort.
  const abort = useMemo(() => readAbort(reach), [reach]);
  const noReturn = useMemo(() => noReturnRuns(plan, abort), [plan, abort]);
  const noReturnLines = useMemo(() => noReturn.runs.map((r) => r.points), [noReturn]);
  // Без перевіреного джерела для emergencyO2G на екрані «assumption» (§7.8).
  const emergencyAssumption = (region?.model ?? mockModel).evidence.emergencyO2G?.status !== 'verified';

  const reason: PlanReason | null = site === null ? null : planReason({ webgl, lost, gridErrors, forced: forced2D });
  const show3D = webgl && !lost && (site === null || reason === null);
  const setView3D = useCameraMode((s) => s.setView3D);
  useEffect(() => setView3D(show3D), [show3D, setView3D]);

  const textureUrl = region ? regionFileUrl(region.id, region.files.texture) : null;
  const hirise = useOptionalTexture(textureUrl, site !== null && show3D);
  const texture = hirise.status === 'ready' ? hirise.texture : null;

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
      haloCells: top.haloCells,
      warnings: top.warnings,
    };
  }, [cells, heights, grid, noData, mask]);

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
    [site, sceneData, texture, layerUrls, gridLayers3D, traverseXY, targets, selectedIds, plan, selectedSegment, base, position, mode],
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
      />
    ) : (
      <StatusNote level="danger" live="alert">
        3D and 2D unavailable: {r.text}
      </StatusNote>
    );

  const globeFallback = (
    <div role="img" aria-label="2D plan B">
      <StatusNote level="warn" live="status">
        3D globe unavailable ({lost ? 'WebGL context lost' : 'WebGL unavailable'}). Use the site list to open Gale.
      </StatusNote>
    </div>
  );

  return (
    <Panel title={site === null ? 'Mars globe' : 'Gale terrain'} featureId="F2" owner="Олександр" mock={status === 'mock'}>
      {site !== null && valid && cells && (
        <TerrainInfo
          width={grid.width}
          height={grid.height}
          metersPerPixel={grid.metersPerPixel}
          status={status}
          texture={reason ? '2D plan' : textureLabel(region !== null, hirise.status)}
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
      <div className="terrain-stage">
        {show3D ? (
          <SceneBoundary fallback={site === null ? globeFallback : plan2D({ code: 'render-error', text: '3D render failed' })}>
            <Canvas
              frameloop={fps && site !== null ? 'always' : 'demand'}
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
    </Panel>
  );
}
