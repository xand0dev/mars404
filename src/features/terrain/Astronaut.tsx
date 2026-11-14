// Демо-прогулянка: модель скафандра NASA Mark III іде маршрутом з модельною швидкістю F4.
// Модель статична (без скелета): хода — покачування, нахил на схилі й поворот за курсом.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Line, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, Group, Vector3, type Object3D } from 'three';
import type { RoutePlan, XY } from '../../contracts';
import { toR3F } from '../../contracts/planning';
import { angleDelta, walkAt, walkTimeline } from './lib/walk';
import { RENDER_ORDER } from './lib/layerRaster';
import { useWalk, walkPose } from './walkStore';
import modelUrl from './assets/mark3.glb?url';

/** Довжина кроку в скафандрі, м (assumption: ~0,7 м на крок, повний цикл — два кроки). */
const STRIDE_M = 1.4;

function SuitModel() {
  const gltf = useGLTF(modelUrl);
  // Нормалізуємо: ступні на y = 0, центр під ногами, висота ≈ 1,9 м.
  const scene = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((o: Object3D) => {
      const m = o as Object3D & { castShadow?: boolean; receiveShadow?: boolean };
      m.castShadow = true;
      m.receiveShadow = false;
    });
    const box = new Box3().setFromObject(root);
    const size = new Vector3();
    const center = new Vector3();
    box.getSize(size);
    box.getCenter(center);
    const k = 1.9 / (size.y || 1);
    const g = new Group();
    root.position.set(-center.x * k, -box.min.y * k, -center.z * k);
    root.scale.setScalar(k);
    g.add(root);
    return g;
  }, [gltf]);
  return <primitive object={scene} />;
}

export interface AstronautProps {
  plan: RoutePlan;
  /** Висота поверхні в точці (локальні метри), той самий меш, що й рельєф */
  groundAt: (xy: XY) => number | null;
}

/** Астронавт на маршруті + пройдений слід. Час іде лише в режимі Play. */
export function Astronaut({ plan, groundAt }: AstronautProps) {
  const group = useRef<Group>(null);
  const timeline = useMemo(() => walkTimeline(plan), [plan]);
  const tRef = useRef(0);
  const pushed = useRef(0);
  const lastPush = useRef(0);
  const heading = useRef<number | null>(null);
  const [trailUntil, setTrailUntil] = useState(0);
  const trailKey = useRef(-1);

  // Новий план — прогулянка з початку.
  useEffect(() => {
    tRef.current = 0;
    pushed.current = 0;
    heading.current = null;
    useWalk.getState().seek(0);
  }, [plan]);

  useFrame(({ camera, invalidate }, dt) => {
    const st = useWalk.getState();
    // Перемотування з панелі — беремо час звідти.
    if (Math.abs(st.t - pushed.current) > 1e-6) tRef.current = st.t;
    if (st.playing) {
      tRef.current = Math.min(timeline.total, tRef.current + Math.min(dt, 0.1) * st.speed);
      if (tRef.current >= timeline.total) st.pause();
    }
    const w = walkAt(plan, tRef.current, timeline);
    const g = group.current;
    if (!w || !g) return;
    const ground = groundAt(w.xy);
    const pos = toR3F(w.xy, ground ?? 0);
    // Плавний поворот за курсом (до 4 рад/с), без ривків на зламах маршруту.
    const target = w.heading;
    heading.current = heading.current === null ? target : heading.current + angleDelta(heading.current, target) * Math.min(1, dt * 4);
    const h = heading.current;
    // Хода: покачування вгору-вниз і з боку в бік, нахил уперед на підйомі.
    const phase = (w.dist / STRIDE_M) * Math.PI * 2;
    const moving = st.playing && !w.done;
    const bob = moving ? Math.abs(Math.sin(phase)) * 0.06 : 0;
    const roll = moving ? Math.sin(phase) * 0.06 : 0;
    const pitch = Math.max(-0.25, Math.min(0.25, (w.slope * Math.PI) / 180 * 0.6));
    // Далеко від камери фігуру збільшуємо, щоб її було видно (вона не входить у розрахунки).
    const d = camera.position.distanceTo(new Vector3(pos[0], pos[1], pos[2]));
    const s = Math.min(60, Math.max(1, d / 60));
    g.position.set(pos[0], pos[1] + bob * s, pos[2]);
    g.rotation.set(0, 0, 0);
    // Обличчя моделі Mark III — у −Z; курс (cos h, −sin h) у площині R3F (x, −z).
    g.rotation.y = Math.atan2(Math.cos(h), -Math.sin(h)) + Math.PI;
    g.rotateX(pitch);
    g.rotateZ(roll);
    g.scale.setScalar(s);
    walkPose.position.set(pos[0], pos[1], pos[2]);
    walkPose.heading = h;
    walkPose.ready = true;
    // Час у панель — ~10 разів на секунду; слід — коли змінився відрізок.
    const now = performance.now();
    if (st.playing && now - lastPush.current > 100) {
      lastPush.current = now;
      pushed.current = tRef.current;
      st.seek(tRef.current);
    }
    if (w.segment !== trailKey.current) {
      trailKey.current = w.segment;
      setTrailUntil(w.segment);
    }
    if (st.playing) invalidate();
  });

  // Маршрут попереду (від поточного відрізка до бази): біля землі повний маршрут перетинає ближню площину камери.
  const ahead = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = trailUntil; i < plan.segments.length; i++) {
      const xy = plan.segments[i]!.to;
      const g = groundAt(xy);
      pts.push(toR3F(xy, (g ?? 0) + 0.6));
    }
    return pts;
  }, [trailUntil, plan, groundAt]);

  const trail = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= trailUntil && i < plan.segments.length; i++) {
      const xy = plan.segments[i]!.from;
      const g = groundAt(xy);
      pts.push(toR3F(xy, (g ?? 0) + 0.6));
    }
    return pts;
  }, [trailUntil, plan, groundAt]);

  useEffect(
    () => () => {
      walkPose.ready = false;
    },
    [],
  );

  return (
    <>
      {ahead.length >= 2 && <Line points={ahead} color="#ffb347" lineWidth={3} transparent opacity={0.95} renderOrder={RENDER_ORDER.lines + 1} />}
      {trail.length >= 2 && <Line points={trail} color="#7fe3ff" lineWidth={3} transparent opacity={0.9} renderOrder={RENDER_ORDER.segment} />}
      <group ref={group}>
        <Suspense fallback={null}>
          <SuitModel />
        </Suspense>
      </group>
    </>
  );
}

useGLTF.preload(modelUrl);
