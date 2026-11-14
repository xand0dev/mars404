// 3D-сцена Gale (F2): рельєф, текстура/колір за висотою, шари, blocked/NoData, ореол, цілі, маршрут, камери.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Line, OrbitControls } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Color, DataTexture, LinearFilter, NearestFilter, RGBAFormat, ShaderMaterial, Vector3, type Texture } from 'three';
import type { Annotation, PlanningGrid, RoutePlan, Target, XY } from '../../contracts';
import { toR3F, xyToCell } from '../../contracts/planning';
import { cameraPose, gridFrame, type CameraMode } from './lib/camera';
import { buildTerrainGeometry, surfacePoint } from './lib/geometry';
import { RENDER_ORDER } from './lib/layerRaster';
import { CSS } from './lib/overlay';
import { segmentMarker } from './lib/segment';
import { LABEL_HEIGHT, Label3D } from './Label3D';
import { MARK_CHAR, MARK_COLOR, markLabel, r3fToXY } from './lib/marks';
import { labelAspect, labelledTargetIds, stackLabels } from './lib/labels';
import { useOptionalTexture } from './useRegionTexture';
import { renderPoint, renderShape, sampleRender, type RenderHeights } from './lib/hd';
import { tileFramePoints, type ContextHeights } from './lib/context';
import { Atmosphere, ContextTerrain, Sun } from './Environment';
import { BLOCKED_RGB, HALO_RGB } from './lib/overlay';

/** Підйом ліній і маркерів над поверхнею, м (лише візуально, щоб не тонули в меші). */
const LIFT_M = 1.5;

export interface SceneData {
  grid: PlanningGrid;
  heights: Float32Array;
  noData: number | undefined;
  /** RGBA колір за висотою + blocked/NoData/ореол (без HiRISE) */
  baseRGBA: Uint8Array;
  /** RGBA blocked/NoData/ореол поверх усього */
  topRGBA: Uint8Array;
  /** Щільний рельєф лише для 3D (files.elevationRender); немає — меш із сітки планування */
  render?: RenderHeights | null;
  /** Маска зон для гладкого шейдера (lib/hd buildZoneMask); немає — клітинкова накладка topRGBA */
  zoneRGBA?: Uint8Array | null;
  /** Кільце рельєфу довкола району (Region.context), лише огляд */
  context?: ContextHeights | null;
}

/** Напрямок на сонце: низько із заходу-південного заходу — тіні падають до камери, рельєф об'ємний. */
const SUN_DIR: [number, number, number] = (() => {
  const v = [-1, 0.5, 0.45];
  const l = Math.hypot(v[0]!, v[1]!, v[2]!);
  return [v[0]! / l, v[1]! / l, v[2]! / l];
})();
/** Тривалість прольоту камери при відкритті району, мс */
const FLY_IN_MS = 3200;

export interface SceneProps {
  data: SceneData;
  texture: Texture | null;
  /** Увімкнені шари (region.layers[].url, уже через dataUrl) */
  layerUrls: { id: string; url: string }[];
  /** Шари, які F2 малює із сітки (slope, terrain): RGBA, рядок 0 — південь */
  gridLayers: { id: string; rgba: Uint8Array }[];
  /** Траверс марсохода, локальні метри (T12) */
  traverse: XY[][];
  /** F2-AC6: серії відрізків без повернення (локальні метри) */
  noReturn: XY[][];
  targets: Target[];
  selectedIds: string[];
  plan: RoutePlan | null;
  selectedSegment: number | null;
  base: XY | null;
  position: XY | null;
  mode: CameraMode;
  /** Мітки екіпажу (§7.12) */
  marks?: Annotation[];
  /** Режим «Add mark»: клік по рельєфу → локальні метри */
  onPick?: ((xy: XY) => void) | null;
  /** Позначка «поза ореолом» для цілей (маска reach) */
  inReach?: (xy: XY) => boolean;
  /** Точка неповернення (SPEC §7.8): де стоїть і підпис «хвилини від старту»; у 2D — той самий знак */
  ponr?: { xy: XY; label: string } | null;
  /** Навігація без GPS: маяки, відрізки на інерціалці, контрольні точки (lib/nav) */
  nav?: { beacons: { xy: XY; label: string }[]; drift: XY[][]; checkpoints: XY[] } | null;
}

function useDataTexture(rgba: Uint8Array, width: number, height: number): DataTexture {
  const tex = useMemo(() => {
    const t = new DataTexture(rgba, width, height, RGBAFormat);
    t.magFilter = NearestFilter;
    t.minFilter = NearestFilter;
    t.needsUpdate = true;
    return t;
  }, [rgba, width, height]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function CameraRig({ data, mode, pov }: { data: SceneData; mode: CameraMode; pov: Parameters<typeof cameraPose>[2] }) {
  const get = useThree((s) => s.get);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  // OrbitControls (makeDefault) реєструються пізніше за перший ефект; без цієї залежності вони
  // перенаводять камеру на (0, 0, 0) — кут району, і Orbit показує порожнечу.
  const controlsReady = useThree((s) => s.controls !== null);
  const frame = useMemo(() => gridFrame(data.grid, data.heights), [data]);
  // Поза Orbit/Top не залежить від вибору цілей — не стрибаємо камерою при кожному кліку.
  const povKey = mode === 'pov' ? pov : null;
  const wide = !!data.context;
  // Проліт при відкритті району: з висоти над усім кратером униз до звичного ракурсу (один раз на район).
  const anim = useRef<{ from: [number, number, number]; to: [number, number, number]; target: [number, number, number]; t0: number } | null>(null);
  const flownFor = useRef<PlanningGrid | null>(null);
  useEffect(() => {
    const { camera, invalidate } = get();
    const controls = get().controls as unknown as { target: { set(x: number, y: number, z: number): void }; update(): void } | null;
    const base = cameraPose(mode, frame, povKey, aspect);
    // З кільцем контексту Orbit дивиться з північного заходу на південний схід — на Mount Sharp за районом.
    const pose =
      wide && mode === 'orbit'
        ? {
            target: base.target,
            position: [
              base.target[0] - frame.size * 0.62,
              base.target[1] + (frame.maxY - frame.minY) * 0.6 + frame.size * 0.42,
              base.target[2] - frame.size * 0.78,
            ] as [number, number, number],
          }
        : base;
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fly = wide && mode === 'orbit' && controlsReady && flownFor.current !== data.grid && !reduced;
    if (fly) {
      flownFor.current = data.grid;
      const [cx, cy, cz] = frame.center;
      const from: [number, number, number] = [cx - frame.size * 7, cy + frame.size * 8, cz - frame.size * 9];
      anim.current = { from, to: pose.position, target: pose.target, t0: performance.now() };
      camera.position.set(...from);
    } else {
      anim.current = null;
      camera.position.set(...pose.position);
    }
    camera.near = mode === 'pov' ? 0.5 : Math.max(0.5, frame.size / 2000);
    camera.far = wide ? 400_000 : frame.size * 20 + (frame.maxY - frame.minY) * 4;
    camera.lookAt(...pose.target);
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
    invalidate();
  }, [get, frame, mode, povKey, aspect, controlsReady, wide, data.grid]);
  useFrame(({ camera, invalidate, controls }) => {
    const a = anim.current;
    if (!a) return;
    const t = Math.min(1, (performance.now() - a.t0) / FLY_IN_MS);
    const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    camera.position.set(a.from[0] + (a.to[0] - a.from[0]) * e, a.from[1] + (a.to[1] - a.from[1]) * e, a.from[2] + (a.to[2] - a.from[2]) * e);
    camera.lookAt(...a.target);
    const c = controls as unknown as { target?: { set(x: number, y: number, z: number): void }; update?(): void } | null;
    c?.target?.set(...a.target);
    c?.update?.();
    if (t >= 1) anim.current = null;
    invalidate();
  });
  return null;
}

/** Растр шару поверх рельєфу; помилка завантаження — шар просто не видно (підпис статусу — у TerrainInfo). */
function LayerOverlay({ url, geometry, order }: { url: string; geometry: BufferGeometry; order: number }) {
  const t = useOptionalTexture(url);
  if (t.status !== 'ready') return null;
  return (
    <mesh geometry={geometry} renderOrder={RENDER_ORDER.layers + order}>
      <meshBasicMaterial map={t.texture} transparent opacity={0.6} depthWrite={false} polygonOffset polygonOffsetFactor={-1 - order} polygonOffsetUnits={-4} />
    </mesh>
  );
}

/** Шар із сітки (slope / terrain за легендою F3). */
function GridLayerOverlay({ rgba, grid, geometry, order }: { rgba: Uint8Array; grid: PlanningGrid; geometry: BufferGeometry; order: number }) {
  const tex = useDataTexture(rgba, grid.width, grid.height);
  return (
    <mesh geometry={geometry} renderOrder={RENDER_ORDER.layers + order}>
      <meshBasicMaterial map={tex} transparent opacity={0.6} depthWrite={false} polygonOffset polygonOffsetFactor={-1 - order} polygonOffsetUnits={-4} />
    </mesh>
  );
}

const ZONE_VERT = `
varying vec2 vUv;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}`;

// Межа зони — там, де інтерпольована маска перетинає 0,5: гладкий контур замість сходинок 10 м.
// Blocked — штрихування й контур; ореол — легка заливка й яскравий контур; NoData — темна заливка.
const ZONE_FRAG = `
uniform sampler2D zones;
uniform vec2 cells;
uniform vec3 blockedColor;
uniform vec3 haloColor;
varying vec2 vUv;
#include <logdepthbuf_pars_fragment>
float cover(float v) { float w = max(fwidth(v), 1e-4) * 0.75; return smoothstep(0.5 - w, 0.5 + w, v); }
float edge(float v, float px) { float w = max(fwidth(v), 1e-4); return 1.0 - smoothstep(0.0, w * px, abs(v - 0.5)); }
void main() {
  #include <logdepthbuf_fragment>
  vec4 z = texture2D(zones, vUv);
  float b = cover(z.r);
  float n = cover(z.g);
  float h = cover(z.b);
  float stripe = step(0.62, fract((vUv.x + vUv.y) * cells.x * 1.1));
  vec4 col = vec4(0.0);
  col = mix(col, vec4(haloColor, 0.05), h);
  col = mix(col, vec4(haloColor, 1.0), edge(z.b, 2.0) * step(0.02, z.b));
  col = mix(col, vec4(blockedColor, 0.22 * stripe + 0.04), b);
  col = mix(col, vec4(blockedColor * 1.35, 0.5), edge(z.r, 1.0) * step(0.02, z.r));
  col = mix(col, vec4(0.06, 0.06, 0.08, 0.8), n);
  if (col.a < 0.01) discard;
  gl_FragColor = col;
}`;

const rgb = (c: readonly number[]) => new Color(...(c.map((v) => v / 255) as [number, number, number]));

/** Зони (blocked / NoData / ореол) гладким шейдером поверх щільного меша. */
function ZoneOverlay({ rgba, grid, geometry }: { rgba: Uint8Array; grid: PlanningGrid; geometry: BufferGeometry }) {
  const tex = useMemo(() => {
    const t = new DataTexture(rgba, grid.width, grid.height, RGBAFormat);
    t.magFilter = LinearFilter;
    t.minFilter = LinearFilter;
    t.needsUpdate = true;
    return t;
  }, [rgba, grid.width, grid.height]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          zones: { value: tex },
          cells: { value: [grid.width, grid.height] },
          blockedColor: { value: rgb(BLOCKED_RGB).multiplyScalar(1.6) },
          haloColor: { value: rgb(HALO_RGB) },
        },
        vertexShader: ZONE_VERT,
        fragmentShader: ZONE_FRAG,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -8,
        polygonOffsetUnits: -8,
      }),
    [tex, grid.width, grid.height],
  );
  useEffect(
    () => () => {
      tex.dispose();
      material.dispose();
    },
    [tex, material],
  );
  return <mesh geometry={geometry} renderOrder={RENDER_ORDER.overlay} material={material} />;
}

export function TerrainScene({ data, texture, layerUrls, gridLayers, traverse, noReturn, targets, selectedIds, plan, selectedSegment, base, position, mode, marks = [], onPick = null, inReach = () => true, ponr = null, nav = null }: SceneProps) {
  const { grid, heights, noData } = data;
  const render = data.render ?? null;
  const geometry = useMemo(() => {
    const g = render ? buildTerrainGeometry(renderShape(grid, render), render.data) : buildTerrainGeometry(grid, heights);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(g.positions, 3));
    geo.setAttribute('uv', new BufferAttribute(g.uvs, 2));
    geo.setIndex(new BufferAttribute(g.indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [grid, heights, render]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const baseTex = useDataTexture(data.baseRGBA, grid.width, grid.height);
  const topTex = useDataTexture(data.topRGBA, grid.width, grid.height);

  // Точка на поверхні: висота для підпису — з сітки планування, положення — зі щільного меша (щоб маркери не тонули).
  const sp = (xy: XY, lift: number) => {
    const s = surfacePoint(grid, heights, noData, xy, lift);
    if (!s || !render) return s;
    const pos = renderPoint(grid, render, xy, lift);
    return pos ? { ...s, position: pos } : s;
  };
  const at = (xy: XY) => sp(xy, LIFT_M);

  /* eslint-disable react-hooks/exhaustive-deps -- sp() залежить від grid / heights / noData / render, вони в залежностях */
  const routePts = useMemo(() => {
    if (!plan) return [];
    return plan.path.flatMap((p) => {
      const s = sp(p, LIFT_M);
      return s ? [s.position] : [];
    });
  }, [plan, grid, heights, noData, render]);

  const traversePts = useMemo(
    () =>
      traverse
        .map((l) => l.flatMap((p) => {
          // Точки траверсу не в центрах клітинок: на реальному Gale до 1.5 м під поверхнею меша — підйом LIFT_M.
          const s = sp(p, LIFT_M);
          return s ? [s.position] : [];
        }))
        .filter((l) => l.length >= 2),
    [traverse, grid, heights, noData, render],
  );

  // F2-AC6: червоні серії трохи вище маршруту, щоб не мерехтіли з білою лінією.
  const noReturnPts = useMemo(
    () =>
      noReturn
        .map((l) =>
          l.flatMap((p) => {
            const s = sp(p, LIFT_M * 1.2);
            return s ? [s.position] : [];
          }),
        )
        .filter((l) => l.length >= 2),
    [noReturn, grid, heights, noData, render],
  );

  const driftPts = useMemo(
    () =>
      (nav?.drift ?? [])
        .map((l) => l.flatMap((p) => {
          const s = surfacePoint(grid, heights, noData, p, LIFT_M * 1.3);
          return s ? [s.position] : [];
        }))
        .filter((l) => l.length >= 2),
    [nav, grid, heights, noData],
  );

  const segPts = useMemo(() => {
    const s = plan && selectedSegment !== null ? plan.segments[selectedSegment] : undefined;
    if (!s) return null;
    const a = sp(s.from, LIFT_M * 1.5);
    const b = sp(s.to, LIFT_M * 1.5);
    return a && b ? [a.position, b.position] : null;
  }, [plan, selectedSegment, grid, heights, noData, render]);

  // Відрізок F4 — один крок сітки (~10 м): поруч вертикальний маяк і кільце, щоб його було видно з будь-якої камери.
  const segMark = useMemo(() => {
    const m = segmentMarker(plan, selectedSegment);
    const p = m ? sp(m.mid, LIFT_M) : null;
    return m && p ? { label: m.label, position: p.position } : null;
  }, [plan, selectedSegment, grid, heights, noData, render]);

  // Точка неповернення — червоний маяк з кільцем, як у обраного відрізка, але нижчий: підписи не злипаються.
  const ponrMark = useMemo(() => {
    const p = ponr ? sp(ponr.xy, LIFT_M) : null;
    return ponr && p ? { label: ponr.label, position: p.position } : null;
  }, [ponr, grid, heights, noData, render]);

  /* eslint-enable react-hooks/exhaustive-deps */
  const pov = useMemo(() => {
    // Висота форми меша (NoData уже заповнено сусідами) — щоб очі не опинились під поверхнею.
    const ground = (xy: XY) => {
      const c = xyToCell(grid, xy);
      return c ? (heights[c.index] ?? null) : null;
    };
    const from = position ?? base;
    const fromH = from ? ground(from) : null;
    if (!from || fromH === null) return null;
    const first = targets.find((t) => t.id === selectedIds[0]);
    const lookH = first ? ground(first.coordinates) : null;
    return {
      from: { xy: from, groundM: fromH },
      lookAt: first && lookH !== null ? { xy: first.coordinates, groundM: lookH } : null,
    };
  }, [position, base, targets, selectedIds, grid, heights]);

  // Розмір маркера — від розміру району, щоб його було видно і на 128×128 по 10 м, і на більших сітках.
  const markerR = Math.max(grid.metersPerPixel, Math.max(grid.width, grid.height) * grid.metersPerPixel / 100);

  // Підписи без накладань: текст — лише обрані цілі й та, що під курсором;
  // ті, що злипаються на екрані, піднімаємо сходинками (рахуємо в пікселях після кожного кадру).
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const labelled = useMemo(() => labelledTargetIds(targets, selectedIds, hoveredId), [targets, selectedIds, hoveredId]);
  const labelText = (t: Target, sel: boolean, out: boolean, heightUnknown: boolean) =>
    `${out ? '◌! ' : sel ? '● ' : '○ '}${t.name}${out ? ' · outside reach' : ''}${heightUnknown ? ' · elev. unknown' : ''}`;
  const anchors = useMemo(() => {
    const list: { id: string; pos: Vector3; text: string }[] = [];
    const b = base ? at(base) : null;
    // Підпис обраного відрізка — першим: він лишається біля маяка, а цілі й база піднімаються над ним.
    if (segMark) list.push({ id: '__seg', pos: new Vector3(segMark.position[0], segMark.position[1] + markerR * 8.5, segMark.position[2]), text: segMark.label });
    if (ponrMark) list.push({ id: '__ponr', pos: new Vector3(ponrMark.position[0], ponrMark.position[1] + markerR * 6, ponrMark.position[2]), text: `◆ ${ponrMark.label}` });
    if (b) list.push({ id: '__base', pos: new Vector3(b.position[0], b.position[1] + markerR * 3, b.position[2]), text: '■ Base' });
    for (const t of targets) {
      if (!labelled.has(t.id)) continue;
      const p = at(t.coordinates);
      if (!p) continue;
      const text = labelText(t, selectedIds.includes(t.id), !inReach(t.coordinates), p.heightM === null);
      list.push({ id: t.id, pos: new Vector3(p.position[0], p.position[1] + markerR * 3, p.position[2]), text });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- at() залежить від grid / heights / noData
  }, [targets, labelled, selectedIds, base, grid, heights, noData, render, markerR, inReach, segMark, ponrMark]);
  const [levels, setLevels] = useState<Record<string, number>>({});
  const levelsKey = useRef('');
  const proj = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    const hPx = (LABEL_HEIGHT * camera.projectionMatrix.elements[5]! * size.height) / 2;
    const boxes = anchors.map((a) => {
      proj.copy(a.pos).project(camera);
      return { x: ((proj.x + 1) / 2) * size.width, y: ((1 - proj.y) / 2) * size.height, w: hPx * labelAspect(a.text), h: hPx };
    });
    const lv = stackLabels(boxes);
    const key = anchors.map((a, i) => `${a.id}:${lv[i]}`).join('|');
    if (key !== levelsKey.current) {
      levelsKey.current = key;
      setLevels(Object.fromEntries(anchors.map((a, i) => [a.id, lv[i]!])));
    }
  });

  const tileSize = Math.max(grid.width, grid.height) * grid.metersPerPixel;
  const frameCenter = useMemo<[number, number, number]>(() => {
    const [ox, oy] = grid.originM;
    const w = grid.width * grid.metersPerPixel;
    const h = grid.height * grid.metersPerPixel;
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of heights) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    return toR3F([ox + w / 2, oy - h / 2], Number.isFinite(lo) ? (lo + hi) / 2 : 0);
  }, [grid, heights]);
  const tileFrame = useMemo(() => {
    if (!data.context) return null;
    const [ox, oy] = grid.originM;
    const hAt = (x: number, y: number) => {
      const v = render ? sampleRender(grid, render, [x, y]) : null;
      if (v !== null) return v;
      const c = xyToCell(grid, [Math.min(Math.max(x, ox + 1), ox + tileSize - 1), Math.min(Math.max(y, oy - tileSize + 1), oy - 1)]);
      return c ? (heights[c.index] ?? 0) : 0;
    };
    return tileFramePoints(grid, hAt, 2);
  }, [data.context, grid, render, heights, tileSize]);

  return (
    <group>
      {/* Низьке сонце з північного заходу: рельєф читається тінями; HiRISE сірий — тонуємо в марсіанський (лише відображення). */}
      <hemisphereLight args={['#f4dcc0', '#3a2418', 0.55]} />
      {render ? (
        <Sun center={frameCenter} size={tileSize} dir={SUN_DIR} intensity={2.3} />
      ) : (
        <directionalLight position={[-1, 2, -0.6]} intensity={1.6} />
      )}
      {data.context && (
        <>
          <Atmosphere center={frameCenter} size={tileSize} sunDir={SUN_DIR} />
          <ContextTerrain grid={grid} ctx={data.context} />
          {tileFrame && <Line points={tileFrame} color="#f3ece6" lineWidth={1.5} transparent opacity={0.55} renderOrder={RENDER_ORDER.lines} />}
        </>
      )}
      <mesh
        geometry={geometry}
        castShadow={!!render}
        receiveShadow={!!render}
        onClick={
          onPick
            ? (e: ThreeEvent<MouseEvent>) => {
                // Перетягування камерою — не клік.
                if (e.delta > 4) return;
                e.stopPropagation();
                onPick(r3fToXY(e.point));
              }
            : undefined
        }
      >
        <meshStandardMaterial map={texture ?? baseTex} color={texture && render ? '#f0c9a2' : '#ffffff'} roughness={1} metalness={0} />
      </mesh>
      {layerUrls.map((l, k) => (
        <LayerOverlay key={l.id} url={l.url} geometry={geometry} order={k} />
      ))}
      {gridLayers.map((l, k) => (
        <GridLayerOverlay key={l.id} rgba={l.rgba} grid={grid} geometry={geometry} order={layerUrls.length + k} />
      ))}
      {data.zoneRGBA ? (
        <ZoneOverlay rgba={data.zoneRGBA} grid={grid} geometry={geometry} />
      ) : (
        <mesh geometry={geometry} renderOrder={RENDER_ORDER.overlay}>
          <meshBasicMaterial map={topTex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-8} polygonOffsetUnits={-8} />
        </mesh>
      )}

      {traversePts.map((l, k) => (
        <Line
          key={k}
          points={l}
          color={CSS.traverse}
          lineWidth={2.5}
          dashed
          dashSize={grid.metersPerPixel * 1.5}
          gapSize={grid.metersPerPixel}
          transparent
          renderOrder={RENDER_ORDER.lines}
        />
      ))}
      {routePts.length >= 2 && (
        <>
          {/* Темне обведення під лінією — маршрут видно і на світлому ґрунті, і на ореолі (#94). */}
          <Line points={routePts} color="#140c08" lineWidth={7} transparent opacity={0.7} depthWrite={false} renderOrder={RENDER_ORDER.lines} />
          <Line points={routePts} color={CSS.routeHd} lineWidth={3.5} depthTest={false} transparent renderOrder={RENDER_ORDER.lines + 1} />
        </>
      )}
      {noReturnPts.map((l, k) => (
        <Line key={k} points={l} color={CSS.noReturn} lineWidth={5} transparent renderOrder={RENDER_ORDER.noReturn} />
      ))}
      {driftPts.map((l, k) => (
        <Line key={`drift-${k}`} points={l} color={CSS.drift} lineWidth={5} dashed dashSize={grid.metersPerPixel} gapSize={grid.metersPerPixel * 0.7} transparent renderOrder={RENDER_ORDER.noReturn} />
      ))}
      {nav?.beacons.map((b) => {
        const p = at(b.xy);
        if (!p) return null;
        return (
          <group key={`beacon-${b.label}`} position={p.position}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={RENDER_ORDER.ring}>
              <ringGeometry args={[markerR * 1.8, markerR * 2.3, 40]} />
              <meshBasicMaterial color={CSS.beacon} depthTest={false} transparent opacity={0.85} />
            </mesh>
            <mesh position={[0, markerR * 2.5, 0]} renderOrder={RENDER_ORDER.markers}>
              <coneGeometry args={[markerR * 0.8, markerR * 5, 4]} />
              <meshBasicMaterial color={CSS.beacon} />
            </mesh>
            <Label3D position={[0, markerR * 6, 0]} color={CSS.beacon} text={`▲ ${b.label}`} />
          </group>
        );
      })}
      {nav?.checkpoints.map((c, k) => {
        const p = at(c);
        if (!p) return null;
        return (
          <mesh key={`cp-${k}`} position={p.position} rotation={[-Math.PI / 2, 0, Math.PI / 4]} renderOrder={RENDER_ORDER.ring}>
            <ringGeometry args={[markerR * 1.1, markerR * 1.6, 4]} />
            <meshBasicMaterial color={CSS.checkpoint} depthTest={false} transparent />
          </mesh>
        );
      })}
      {segPts && <Line points={segPts} color={CSS.segment} lineWidth={8} depthTest={false} transparent renderOrder={RENDER_ORDER.segment} />}

      {segMark && (
        <group position={segMark.position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={RENDER_ORDER.ring}>
            <ringGeometry args={[markerR * 1.6, markerR * 2.2, 40]} />
            <meshBasicMaterial color={CSS.segment} depthTest={false} transparent />
          </mesh>
          {/* Маяк вищий за маркери цілей (їхні підписи на 3 R), щоб підписи не накладались. */}
          <mesh position={[0, markerR * 4, 0]} renderOrder={RENDER_ORDER.ring}>
            <cylinderGeometry args={[markerR * 0.25, markerR * 0.25, markerR * 8, 8]} />
            <meshBasicMaterial color={CSS.segment} transparent />
          </mesh>
          <Label3D position={[0, markerR * 8.5, 0]} level={levels.__seg ?? 0} color={CSS.segment} text={segMark.label} />
        </group>
      )}

      {ponrMark && (
        <group position={ponrMark.position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={RENDER_ORDER.ring}>
            <ringGeometry args={[markerR * 1.4, markerR * 2, 4]} />
            <meshBasicMaterial color={CSS.noReturn} depthTest={false} transparent />
          </mesh>
          <mesh position={[0, markerR * 3, 0]} renderOrder={RENDER_ORDER.ring}>
            <cylinderGeometry args={[markerR * 0.25, markerR * 0.25, markerR * 6, 8]} />
            <meshBasicMaterial color={CSS.noReturn} transparent />
          </mesh>
          <Label3D position={[0, markerR * 6, 0]} level={levels.__ponr ?? 0} color={CSS.noReturn} text={`◆ ${ponrMark.label}`} />
        </group>
      )}

      {targets.map((t) => {
        const p = at(t.coordinates);
        if (!p) return null;
        const sel = selectedIds.includes(t.id);
        const out = !inReach(t.coordinates);
        return (
          <group key={t.id} position={p.position}>
            <mesh
              position={[0, markerR, 0]}
              renderOrder={RENDER_ORDER.markers}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredId(t.id);
              }}
              onPointerOut={() => setHoveredId((h) => (h === t.id ? null : h))}
            >
              <coneGeometry args={[markerR * (sel ? 1.3 : 0.9), markerR * 2.5, 12]} />
              <meshBasicMaterial color={sel ? '#e0673c' : '#f3ece6'} transparent />
            </mesh>
            {labelled.has(t.id) && (
              <Label3D
                position={[0, markerR * 3, 0]}
                level={levels[t.id] ?? 0}
                color={out ? '#e8b84a' : sel ? '#ffd38a' : '#f3ece6'}
                text={labelText(t, sel, out, p.heightM === null)}
              />
            )}
          </group>
        );
      })}

      {base && at(base) && (
        <group position={at(base)?.position}>
          <mesh position={[0, markerR, 0]} renderOrder={RENDER_ORDER.markers}>
            <boxGeometry args={[markerR * 1.6, markerR * 2, markerR * 1.6]} />
            <meshBasicMaterial color="#6cc28a" transparent />
          </mesh>
          <Label3D position={[0, markerR * 3, 0]} level={levels.__base ?? 0} text="■ Base" />
        </group>
      )}
      {position && base && (position[0] !== base[0] || position[1] !== base[1]) && at(position) && (
        <mesh position={at(position)?.position} renderOrder={RENDER_ORDER.markers}>
          <sphereGeometry args={[markerR, 16, 12]} />
          <meshBasicMaterial color="#7fb4e6" transparent />
        </mesh>
      )}

      {marks.map((m) => {
        const p = at(m.coordinates);
        if (!p) return null;
        const c = MARK_COLOR[m.kind];
        const r = Math.max(m.radiusM, grid.metersPerPixel);
        return (
          <group key={m.id} position={p.position} name={markLabel(m)}>
            {(m.kind === 'impassable' || m.kind === 'hazard') && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={RENDER_ORDER.ring}>
                <ringGeometry args={[r * 0.9, r, 48]} />
                <meshBasicMaterial color={c} depthTest={false} transparent opacity={0.9} />
              </mesh>
            )}
            {m.kind === 'impassable' || m.kind === 'hazard' ? (
              <mesh position={[0, markerR, 0]} renderOrder={RENDER_ORDER.markers}>
                <coneGeometry args={[markerR * 1.1, markerR * 2.2, 3]} />
                <meshBasicMaterial color={c} wireframe={m.kind === 'hazard'} transparent />
              </mesh>
            ) : (
              <>
                <mesh position={[0, markerR * 1.5, 0]} renderOrder={RENDER_ORDER.markers}>
                  <cylinderGeometry args={[markerR * 0.12, markerR * 0.12, markerR * 3, 6]} />
                  <meshBasicMaterial color={c} transparent />
                </mesh>
                <mesh position={[markerR * 0.6, markerR * 2.6, 0]} renderOrder={RENDER_ORDER.markers}>
                  <boxGeometry args={[markerR * 1.2, markerR * 0.7, markerR * 0.1]} />
                  <meshBasicMaterial color={c} wireframe={m.kind === 'note'} transparent />
                </mesh>
              </>
            )}
            <Label3D position={[0, markerR * 3.4, 0]} color={c} text={`${MARK_CHAR[m.kind]} ${m.text || m.kind}${m.origin === 'imported' ? ' · prev EVA' : ''}`} />
          </group>
        );
      })}

      <OrbitControls makeDefault enableDamping={false} />
      <CameraRig data={data} mode={mode} pov={pov} />
    </group>
  );
}
