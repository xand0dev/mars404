// F2: єдиний R3F Canvas (frameloop="demand"): глобус F1 при site = null, рельєф Gale — інакше.
// Без WebGL, після втрати контексту або з невалідною сіткою — 2D-план Б з причиною. У store нічого не пише.
import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { validateGrid } from '../../contracts/planning';
import { mockModel } from '../../mocks';
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';
import { useCameraMode } from './cameraStore';
import { FpsProbe, type FpsReport } from './FpsProbe';
import { fpsEnabled } from './lib/fps';
import { classifyCells } from './lib/cells';
import { displayHeights } from './lib/geometry';
import { buildOverlay } from './lib/overlay';
import { regionFileUrl } from './lib/paths';
import { planReason, type PlanReason } from './lib/plan2d';
import { isRasterUrl, traverseToXY, traverseVisible } from './lib/traverse';
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

/** Камера глобуса (як у F0): повертаємо її після рельєфу. */
function GlobeCamera() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { camera, invalidate } = get();
    camera.position.set(0, 0, 3);
    camera.near = 0.1;
    camera.far = 100;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [get]);
  return null;
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
  const [fpsReport, setFpsReport] = useState<FpsReport | null>(null);

  const noData = region?.noData;
  const maxSlopeDeg = (region?.model ?? mockModel).maxSlopeDeg;
  const gridErrors = useMemo(() => validateGrid(grid), [grid]);
  const valid = gridErrors.length === 0;
  const cells = useMemo(() => (valid ? classifyCells(grid, { noData, maxSlopeDeg }) : null), [valid, grid, noData, maxSlopeDeg]);
  const heights = useMemo(() => (valid ? displayHeights(grid, noData) : null), [valid, grid, noData]);
  const mask = reach?.mask;

  const reason: PlanReason | null = site === null ? null : planReason({ webgl, lost, gridErrors });
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
  // Текстурами вантажимо лише растри; traverse (geojson) малюється лінією нижче.
  const layerUrls = useMemo(
    () => (region ? enabledLayers.filter((l) => l.id !== 'traverse' && isRasterUrl(l.url)).map((l) => ({ id: l.id, url: regionFileUrl(region.id, l.url) })) : []),
    [region, enabledLayers],
  );

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
    [site, sceneData, texture, layerUrls, traverseXY, targets, selectedIds, plan, selectedSegment, base, position, mode],
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
        traverse={traverseLines}
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
          layers={enabledLayers.filter((l) => l.id !== 'traverse').map((l) => ({ name: l.name, status: l.status }))}
          traverse={traverseLines.length > 0 ? { status: traverseStatus } : null}
          warnings={[...(sceneData?.warnings ?? []), ...traverseWarnings]}
        />
      )}
      <div className="terrain-stage">
        {show3D ? (
          <SceneBoundary fallback={site === null ? globeFallback : plan2D({ code: 'render-error', text: '3D render failed' })}>
            <Canvas
              frameloop={fps && site !== null ? 'always' : 'demand'}
              camera={{ position: [0, 0, 3], fov: 45, near: 0.1, far: 100 }}
              onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', () => setLost(true))}
            >
              <Redraw dep={redrawKey} />
              {site === null ? (
                <>
                  <GlobeCamera />
                  {globe}
                </>
              ) : (
                sceneData && (
                  <>
                    <TerrainScene
                      data={sceneData}
                      texture={texture}
                      layerUrls={layerUrls}
                      traverse={traverseLines}
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
