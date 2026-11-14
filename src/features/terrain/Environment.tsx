// Оточення 3D-сцени Gale: кільце рельєфу (MOLA/HRSC), небо й серпанок Марса, сонце з тінями.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { BackSide, BufferAttribute, BufferGeometry, Color, Fog, ShaderMaterial, type DirectionalLight } from 'three';
import type { PlanningGrid } from '../../contracts';
import { buildTerrainGeometry } from './lib/geometry';
import { contextColors, contextShape, lowerUnderTile, type ContextHeights } from './lib/context';

/** Колір обрію: пиловий «butterscotch» марсіанського неба вдень, приглушений під темний інтерфейс. */
const HORIZON = '#b98a64';
const ZENITH = '#1a1310';

/** Кільце рельєфу довкола району; під районом опущене, щоб щільний меш лежав зверху. */
export function ContextTerrain({ grid, ctx }: { grid: PlanningGrid; ctx: ContextHeights }) {
  const geometry = useMemo(() => {
    const heights = lowerUnderTile(grid, ctx, 12);
    const g = buildTerrainGeometry(contextShape(grid, ctx), heights);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(g.positions, 3));
    geo.setAttribute('color', new BufferAttribute(contextColors(ctx.data), 3));
    geo.setIndex(new BufferAttribute(g.indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [grid, ctx]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
}

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const SKY_FRAG = `
uniform vec3 horizon;
uniform vec3 zenith;
uniform vec3 sunDir;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, -0.2, 1.0);
  vec3 col = mix(horizon, zenith, smoothstep(-0.02, 0.55, h));
  float sun = pow(max(dot(normalize(vDir), normalize(sunDir)), 0.0), 64.0);
  col += vec3(0.55, 0.62, 0.75) * sun * 0.35;
  gl_FragColor = vec4(col, 1.0);
}`;

/** Небо (сфера з градієнтом і блакитним ореолом сонця, як на знімках роверів) і серпанок, що ховає далечінь. */
export function Atmosphere({ center, size, sunDir }: { center: [number, number, number]; size: number; sunDir: [number, number, number] }) {
  const get = useThree((s) => s.get);
  const radius = Math.max(size * 60, 120_000);
  useLayoutEffect(() => {
    const { scene } = get();
    const prevFog = scene.fog;
    scene.fog = new Fog(HORIZON, size * 22, Math.max(size * 130, 320_000));
    return () => {
      get().scene.fog = prevFog;
    };
  }, [get, size]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { horizon: { value: new Color(HORIZON) }, zenith: { value: new Color(ZENITH) }, sunDir: { value: sunDir } },
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    [sunDir],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh position={center} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[radius, 48, 24]} />
    </mesh>
  );
}

/** Низьке сонце з тінями над районом: тіні рахуються лише в межах EVA-зони (щільна карта тіней). */
export function Sun({ center, size, dir, intensity }: { center: [number, number, number]; size: number; dir: [number, number, number]; intensity: number }) {
  const ref = useRef<DirectionalLight>(null);
  const dist = size * 6;
  const pos: [number, number, number] = [center[0] + dir[0] * dist, center[1] + dir[1] * dist, center[2] + dir[2] * dist];
  useLayoutEffect(() => {
    const l = ref.current;
    if (!l) return;
    l.target.position.set(...center);
    l.target.updateMatrixWorld();
    const cam = l.shadow.camera;
    const half = size * 0.75;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = 1;
    cam.far = dist * 2.5;
    cam.updateProjectionMatrix();
    l.shadow.needsUpdate = true;
  }, [center, size, dist]);
  return (
    <directionalLight
      ref={ref}
      position={pos}
      intensity={intensity}
      castShadow
      shadow-mapSize-width={4096}
      shadow-mapSize-height={4096}
      shadow-bias={-0.0004}
      shadow-normalBias={size / 600}
    />
  );
}
