// 3D-сцена Gale (F2): рельєф, текстура/колір за висотою, шари, blocked/NoData, ореол, цілі, маршрут, камери.
import { useEffect, useMemo } from 'react';
import { Line, OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, DataTexture, NearestFilter, RGBAFormat, type Texture } from 'three';
import type { PlanningGrid, RoutePlan, Target, XY } from '../../contracts';
import { xyToCell } from '../../contracts/planning';
import { cameraPose, gridFrame, type CameraMode } from './lib/camera';
import { buildTerrainGeometry, surfacePoint } from './lib/geometry';
import { CSS } from './lib/overlay';
import { segmentMarker } from './lib/segment';
import { Label3D } from './Label3D';
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
  /** Траверс марсохода, локальні метри (T12) */
  traverse: XY[][];
  targets: Target[];
  selectedIds: string[];
  plan: RoutePlan | null;
  selectedSegment: number | null;
  base: XY | null;
  position: XY | null;
  mode: CameraMode;
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
    <mesh geometry={geometry} renderOrder={1 + order}>
      <meshBasicMaterial map={t.texture} transparent opacity={0.6} depthWrite={false} polygonOffset polygonOffsetFactor={-1 - order} polygonOffsetUnits={-4} />
    </mesh>
  );
}

export function TerrainScene({ data, texture, layerUrls, traverse, targets, selectedIds, plan, selectedSegment, base, position, mode }: SceneProps) {
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
          const s = surfacePoint(grid, heights, noData, p, LIFT_M * 0.6);
          return s ? [s.position] : [];
        }))
        .filter((l) => l.length >= 2),
    [traverse, grid, heights, noData],
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

  return (
    <group>
      <ambientLight intensity={0.55} />
      <directionalLight position={[-1, 2, -0.6]} intensity={1.6} />
      <mesh geometry={geometry}>
        <meshStandardMaterial map={texture ?? baseTex} roughness={1} metalness={0} />
      </mesh>
      {layerUrls.map((l, k) => (
        <LayerOverlay key={l.id} url={l.url} geometry={geometry} order={k} />
      ))}
      <mesh geometry={geometry} renderOrder={10}>
        <meshBasicMaterial map={topTex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-8} polygonOffsetUnits={-8} />
      </mesh>

      {traversePts.map((l, k) => (
        <Line key={k} points={l} color={CSS.traverse} lineWidth={2.5} dashed dashSize={grid.metersPerPixel * 1.5} gapSize={grid.metersPerPixel} />
      ))}
      {routePts.length >= 2 && <Line points={routePts} color={CSS.route} lineWidth={3} />}
      {segPts && <Line points={segPts} color={CSS.segment} lineWidth={8} depthTest={false} renderOrder={15} />}

      {segMark && (
        <group position={segMark.position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={16}>
            <ringGeometry args={[markerR * 1.6, markerR * 2.2, 40]} />
            <meshBasicMaterial color={CSS.segment} depthTest={false} transparent />
          </mesh>
          {/* Маяк вищий за маркери цілей (їхні підписи на 3 R), щоб підписи не накладались. */}
          <mesh position={[0, markerR * 4, 0]} renderOrder={16}>
            <cylinderGeometry args={[markerR * 0.25, markerR * 0.25, markerR * 8, 8]} />
            <meshBasicMaterial color={CSS.segment} />
          </mesh>
          <Label3D position={[0, markerR * 8.5, 0]} color={CSS.segment} text={segMark.label} />
        </group>
      )}

      {targets.map((t) => {
        const p = at(t.coordinates);
        if (!p) return null;
        const sel = selectedIds.includes(t.id);
        return (
          <group key={t.id} position={p.position}>
            <mesh position={[0, markerR, 0]}>
              <coneGeometry args={[markerR * (sel ? 1.3 : 0.9), markerR * 2.5, 12]} />
              <meshBasicMaterial color={sel ? '#e0673c' : '#f3ece6'} />
            </mesh>
            <Label3D
              position={[0, markerR * 3, 0]}
              color={sel ? '#ffd38a' : '#f3ece6'}
              text={`${sel ? '● ' : ''}${t.name}${p.heightM === null ? ' · elev. unknown' : ''}`}
            />
          </group>
        );
      })}

      {base && at(base) && (
        <group position={at(base)?.position}>
          <mesh position={[0, markerR, 0]}>
            <boxGeometry args={[markerR * 1.6, markerR * 2, markerR * 1.6]} />
            <meshBasicMaterial color="#6cc28a" />
          </mesh>
          <Label3D position={[0, markerR * 3, 0]} text="■ Base" />
        </group>
      )}
      {position && base && (position[0] !== base[0] || position[1] !== base[1]) && at(position) && (
        <mesh position={at(position)?.position}>
          <sphereGeometry args={[markerR, 16, 12]} />
          <meshBasicMaterial color="#7fb4e6" />
        </mesh>
      )}

      <OrbitControls makeDefault enableDamping={false} />
      <CameraRig data={data} mode={mode} pov={pov} />
    </group>
  );
}
