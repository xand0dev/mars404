// 3D-сцена Gale (F2): рельєф, текстура/колір за висотою, шари, blocked/NoData, ореол, цілі, маршрут, камери.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Line, OrbitControls } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, DataTexture, NearestFilter, RGBAFormat, Vector3, type Texture } from 'three';
import type { Annotation, PlanningGrid, RoutePlan, Target, XY } from '../../contracts';
import { xyToCell } from '../../contracts/planning';
import { cameraPose, gridFrame, type CameraMode } from './lib/camera';
import { buildTerrainGeometry, surfacePoint } from './lib/geometry';
import { RENDER_ORDER } from './lib/layerRaster';
import { CSS } from './lib/overlay';
import { segmentMarker } from './lib/segment';
import { LABEL_HEIGHT, Label3D } from './Label3D';
import { MARK_CHAR, MARK_COLOR, markLabel, r3fToXY } from './lib/marks';
import { labelAspect, labelledTargetIds, stackLabels } from './lib/labels';
import { useOptionalTexture } from './useRegionTexture';

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
}

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
  useEffect(() => {
    const { camera, invalidate } = get();
    const controls = get().controls as unknown as { target: { set(x: number, y: number, z: number): void }; update(): void } | null;
    const pose = cameraPose(mode, frame, povKey, aspect);
    camera.position.set(...pose.position);
    camera.near = mode === 'pov' ? 0.5 : Math.max(0.5, frame.size / 2000);
    camera.far = frame.size * 20 + (frame.maxY - frame.minY) * 4;
    camera.lookAt(...pose.target);
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
    invalidate();
  }, [get, frame, mode, povKey, aspect, controlsReady]);
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

export function TerrainScene({ data, texture, layerUrls, gridLayers, traverse, noReturn, targets, selectedIds, plan, selectedSegment, base, position, mode, marks = [], onPick = null, inReach = () => true }: SceneProps) {
  const { grid, heights, noData } = data;
  const geometry = useMemo(() => {
    const g = buildTerrainGeometry(grid, heights);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(g.positions, 3));
    geo.setAttribute('uv', new BufferAttribute(g.uvs, 2));
    geo.setIndex(new BufferAttribute(g.indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [grid, heights]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const baseTex = useDataTexture(data.baseRGBA, grid.width, grid.height);
  const topTex = useDataTexture(data.topRGBA, grid.width, grid.height);

  const at = (xy: XY) => surfacePoint(grid, heights, noData, xy, LIFT_M);

  const routePts = useMemo(() => {
    if (!plan) return [];
    return plan.path.flatMap((p) => {
      const s = surfacePoint(grid, heights, noData, p, LIFT_M);
      return s ? [s.position] : [];
    });
  }, [plan, grid, heights, noData]);

  const traversePts = useMemo(
    () =>
      traverse
        .map((l) => l.flatMap((p) => {
          // Точки траверсу не в центрах клітинок: на реальному Gale до 1.5 м під поверхнею меша — підйом LIFT_M.
          const s = surfacePoint(grid, heights, noData, p, LIFT_M);
          return s ? [s.position] : [];
        }))
        .filter((l) => l.length >= 2),
    [traverse, grid, heights, noData],
  );

  // F2-AC6: червоні серії трохи вище маршруту, щоб не мерехтіли з білою лінією.
  const noReturnPts = useMemo(
    () =>
      noReturn
        .map((l) =>
          l.flatMap((p) => {
            const s = surfacePoint(grid, heights, noData, p, LIFT_M * 1.2);
            return s ? [s.position] : [];
          }),
        )
        .filter((l) => l.length >= 2),
    [noReturn, grid, heights, noData],
  );

  const segPts = useMemo(() => {
    const s = plan && selectedSegment !== null ? plan.segments[selectedSegment] : undefined;
    if (!s) return null;
    const a = surfacePoint(grid, heights, noData, s.from, LIFT_M * 1.5);
    const b = surfacePoint(grid, heights, noData, s.to, LIFT_M * 1.5);
    return a && b ? [a.position, b.position] : null;
  }, [plan, selectedSegment, grid, heights, noData]);

  // Відрізок F4 — один крок сітки (~10 м): поруч вертикальний маяк і кільце, щоб його було видно з будь-якої камери.
  const segMark = useMemo(() => {
    const m = segmentMarker(plan, selectedSegment);
    const p = m ? surfacePoint(grid, heights, noData, m.mid, LIFT_M) : null;
    return m && p ? { label: m.label, position: p.position } : null;
  }, [plan, selectedSegment, grid, heights, noData]);

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
  }, [targets, labelled, selectedIds, base, grid, heights, noData, markerR, inReach]);
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

  return (
    <group>
      <ambientLight intensity={0.55} />
      <directionalLight position={[-1, 2, -0.6]} intensity={1.6} />
      <mesh
        geometry={geometry}
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
        <meshStandardMaterial map={texture ?? baseTex} roughness={1} metalness={0} />
      </mesh>
      {layerUrls.map((l, k) => (
        <LayerOverlay key={l.id} url={l.url} geometry={geometry} order={k} />
      ))}
      {gridLayers.map((l, k) => (
        <GridLayerOverlay key={l.id} rgba={l.rgba} grid={grid} geometry={geometry} order={layerUrls.length + k} />
      ))}
      <mesh geometry={geometry} renderOrder={RENDER_ORDER.overlay}>
        <meshBasicMaterial map={topTex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-8} polygonOffsetUnits={-8} />
      </mesh>

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
      {routePts.length >= 2 && <Line points={routePts} color={CSS.route} lineWidth={3} transparent renderOrder={RENDER_ORDER.lines} />}
      {noReturnPts.map((l, k) => (
        <Line key={k} points={l} color={CSS.noReturn} lineWidth={5} transparent renderOrder={RENDER_ORDER.noReturn} />
      ))}
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
          <Label3D position={[0, markerR * 8.5, 0]} color={CSS.segment} text={segMark.label} />
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
