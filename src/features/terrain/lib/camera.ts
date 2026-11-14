// Пози камер (локально в terrain, у store не пишемо).
import type { Camera } from 'three';
import type { PlanningGrid, XY } from '../../../contracts';
import { VERTICAL_EXAGGERATION } from '../../../contracts';
import { toR3F } from '../../../contracts/planning';

/** follow — камера за астронавтом під час демо-прогулянки; free — вільний політ (миша + WASD / стрілки, Q / E). */
export type CameraMode = 'orbit' | 'top' | 'pov' | 'follow' | 'free';

/** Поза камери глобуса (як у F0): F1 обертає групу, камеру не чіпає. */
export const GLOBE_CAMERA = { position: [0, 0, 3] as const, near: 0.1, far: 100 };

/** Повертає камеру на позу глобуса. F1 рахує масштаб глобуса з camera.position під час рендеру,
 * тож це треба зробити ДО монтування глобуса, а не після. */
export function applyGlobeCamera(camera: Camera & { near?: number; far?: number; updateProjectionMatrix?: () => void }): void {
  camera.position.set(...GLOBE_CAMERA.position);
  if ('near' in camera) camera.near = GLOBE_CAMERA.near;
  if ('far' in camera) camera.far = GLOBE_CAMERA.far;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix?.();
}
export const CAMERA_MODES: { id: CameraMode; label: string }[] = [
  { id: 'orbit', label: 'Orbit' },
  { id: 'top', label: 'Top' },
  { id: 'pov', label: 'POV' },
  { id: 'follow', label: 'Follow' },
  { id: 'free', label: 'Free' },
];

/** Висота очей для POV, м. Assumption: типовий зріст людини, без джерела. */
export const EYE_HEIGHT_M = 1.7;

type V3 = [number, number, number];

export interface Frame {
  center: V3;
  size: number;
  minY: number;
  maxY: number;
}

/** Межі рельєфу в координатах R3F. */
export function gridFrame(grid: PlanningGrid, heights: Float32Array): Frame {
  let lo = Infinity;
  let hi = -Infinity;
  for (const h of heights) {
    if (h < lo) lo = h;
    if (h > hi) hi = h;
  }
  if (!Number.isFinite(lo)) lo = hi = 0;
  const minY = lo * VERTICAL_EXAGGERATION;
  const maxY = hi * VERTICAL_EXAGGERATION;
  const [ox, oy] = grid.originM;
  const w = grid.width * grid.metersPerPixel;
  const h = grid.height * grid.metersPerPixel;
  return { center: [ox + w / 2, (minY + maxY) / 2, -(oy - h / 2)], size: Math.max(w, h), minY, maxY };
}

export interface PovInput {
  from: { xy: XY; groundM: number };
  lookAt: { xy: XY; groundM: number } | null;
}

export interface Pose {
  position: V3;
  target: V3;
}

/** Наскільки близько Orbit до району: 1 — увесь район з запасом; менше — ближче. */
export const ORBIT_ZOOM = 0.68;

/** aspect — ширина/висота полотна: на вузькому (телефон) Orbit і Top відходять далі, щоб район влазив. */
export function cameraPose(mode: CameraMode, f: Frame, pov: PovInput | null, aspect = 1.5): Pose {
  const [cx, cy, cz] = f.center;
  const k = Math.max(1, 1.05 / (aspect > 0 ? aspect : 1));
  if (mode === 'top') {
    return { position: [cx, cy + (f.maxY - cy + f.size * 1.2) * k, cz + f.size * 0.001], target: [cx, cy, cz] };
  }
  if (mode === 'pov' && pov) {
    const eye = toR3F(pov.from.xy, pov.from.groundM + EYE_HEIGHT_M);
    const look = pov.lookAt ? toR3F(pov.lookAt.xy, pov.lookAt.groundM + EYE_HEIGHT_M) : ([eye[0], eye[1], eye[2] - 100] as V3);
    const d = [look[0] - eye[0], look[1] - eye[1], look[2] - eye[2]];
    const len = Math.hypot(d[0] as number, d[1] as number, d[2] as number) || 1;
    // Ціль OrbitControls — за 1 м попереду: обертання «на місці».
    return { position: eye, target: [eye[0] + (d[0] as number) / len, eye[1] + (d[1] as number) / len, eye[2] + (d[2] as number) / len] };
  }
  const relief = f.maxY - f.minY;
  // ORBIT_ZOOM: рельєф заповнює кадр (рев'ю UI: раніше займав ~половину полотна).
  const z = ORBIT_ZOOM;
  const off: V3 = [f.size * 0.55 * z, f.maxY - cy + (f.size * 0.5 + relief * 0.5) * z, f.size * 0.75 * z];
  return { position: [cx + off[0] * k, cy + off[1] * k, cz + off[2] * k], target: [cx, cy, cz] };
}
