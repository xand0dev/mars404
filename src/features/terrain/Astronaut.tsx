// Демо-прогулянка: астронавт (модель Quaternius, CC0; рух — мокап Mixamo) іде маршрутом з модельною швидкістю F4.
// Кліп і його темп — від швидкості над ґрунтом (gaitFor): ступні не ковзають; біля цілей і на паузі — Idle.
// У режимі «Rover» тим самим маршрутом їде марсохід Curiosity (модель NASA, public domain); не завантажився — астронавт.
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Line, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { AnimationMixer, Box3, Color, Group, LoopRepeat, Vector3, type AnimationAction, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import type { RoutePlan, XY } from '../../contracts';
import { VERTICAL_EXAGGERATION } from '../../contracts';
import { toR3F } from '../../contracts/planning';
import { angleDelta, gaitFor, indexPath, pointAt, routeVertices, slicePath, smoothPath, walkAt, walkTimeline, type Gait } from './lib/walk';
import { RENDER_ORDER } from './lib/layerRaster';
import { figureFor, type FigureSpec } from './lib/figure';
import { useWalk, walkPose } from './walkStore';
import { useMission } from '../../store/useMission';
import modelUrl from './assets/astronaut.glb?url';
import roverUrl from './assets/rover.glb?url';

/** Біле перефарбування скафандра (у моделі він темний sci-fi); шви — сірі. */
const SUIT_COLORS: Record<string, string> = {
  SciFi_Main: '#ecebe7',
  SciFi_MainDark: '#a4a29d',
  SciFi_Light: '#ffffff',
  SciFi_Light_Accent: '#8d8a85',
  Grey: '#1e1b19',
};
/** Скільки метрів уперед дивиться курс: плавний поворот на зламах замість ривка. */
const LOOK_AHEAD_M = 3;

interface Rig {
  root: Group;
  mixer: AnimationMixer;
  actions: Partial<Record<Gait['clip'], AnimationAction>>;
  durations: { Walk: number; Run: number };
  /** Поворот моделі до курсу: обидві моделі дивляться в +Z (перевірено камерою Follow) */
  yawOffset: number;
  rover: boolean;
}

/** Ступні / колеса на y = 0, центр під фігурою, реальний розмір уздовж осі spec.size. */
function normalize(model: Group, spec: FigureSpec): void {
  model.scale.setScalar(1);
  model.position.set(0, 0, 0);
  // Габарити — з оновленими матрицями (у свіжої сцени кістки ще без matrixWorld).
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model, true);
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);
  const k = spec.size.meters / (size[spec.size.axis] || 1);
  model.scale.setScalar(k);
  model.position.set(-center.x * k, -box.min.y * k, -center.z * k);
}

function useRoverRig(): Rig {
  const gltf = useGLTF(roverUrl);
  return useMemo(() => {
    const model = gltf.scene as Group;
    model.traverse((o: Object3D) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.frustumCulled = false;
    });
    normalize(model, figureFor('rover'));
    return { root: model, mixer: new AnimationMixer(model), actions: {}, durations: { Walk: 1.23, Run: 0.73 }, yawOffset: 0, rover: true };
  }, [gltf]);
}

function useAstronautRig(): Rig {
  const gltf = useGLTF(modelUrl);
  const rig = useMemo(() => {
    // Астронавт на сцені один — беремо сцену моделі без клону (клон SkeletonUtils рве прив'язку 13 skin до кісток).
    const model = gltf.scene as Group;
    model.traverse((o: Object3D) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = false;
      m.frustumCulled = false;
      const src = m.material as MeshStandardMaterial;
      const c = SUIT_COLORS[src.name];
      if (c) {
        const mat = src.clone();
        mat.color = new Color(c);
        mat.roughness = 0.75;
        mat.metalness = 0;
        m.material = mat;
      }
    });
    normalize(model, figureFor('walk'));
    // Без обгортки: у StrictMode useMemo виконується двічі, і друга Group забрала б ту саму сцену з першої.
    const root = model;
    const mixer = new AnimationMixer(model);
    const actions: Rig['actions'] = {};
    const durations = { Walk: 1.23, Run: 0.73 };
    for (const clip of gltf.animations) {
      const name = clip.name.split('|').pop() as Gait['clip'];
      if (name !== 'Idle' && name !== 'Walk' && name !== 'Run') continue;
      const a = mixer.clipAction(clip);
      a.setLoop(LoopRepeat, Infinity);
      a.enabled = true;
      a.setEffectiveWeight(0);
      a.play();
      actions[name] = a;
      if (name !== 'Idle') durations[name] = clip.duration;
    }
    actions.Idle?.setEffectiveWeight(1);
    return { root, mixer, actions, durations, yawOffset: 0, rover: false };
  }, [gltf]);
  return rig;
}

export interface AstronautProps {
  plan: RoutePlan;
  /** Висота поверхні в точці (локальні метри), той самий меш, що й рельєф */
  groundAt: (xy: XY) => number | null;
  /** Біля землі (Follow / Free) — справжній розмір; згори фігуру збільшуємо, щоб її було видно */
  lifeSize: boolean;
}

type FigureProps = AstronautProps & { onProgress: (d: number) => void };

const AstronautFigure = (props: FigureProps) => <Figure {...props} rig={useAstronautRig()} />;
const RoverFigure = (props: FigureProps) => <Figure {...props} rig={useRoverRig()} />;

/** Модель ровера не завантажилась — маршрутом іде астронавт, без помилки на екрані. */
class RoverFallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Figure({ plan, groundAt, lifeSize, onProgress, rig }: FigureProps & { rig: Rig }) {
  const group = useRef<Group>(null);
  const timeline = useMemo(() => walkTimeline(plan), [plan]);
  const path = useMemo(() => indexPath(smoothPath(routeVertices(plan))), [plan]);
  const rawLength = useMemo(() => plan.segments.reduce((a, s) => a + (Number.isFinite(s.dist) ? s.dist : 0), 0), [plan]);
  const tRef = useRef(0);
  const pushed = useRef(0);
  const lastPush = useRef(0);
  const lastProgress = useRef(-1);
  const heading = useRef<number | null>(null);
  const weights = useRef<Record<Gait['clip'], number>>({ Idle: 1, Walk: 0, Run: 0 });

  // Новий план — прогулянка з початку.
  useEffect(() => {
    tRef.current = 0;
    pushed.current = 0;
    heading.current = null;
    useWalk.getState().seek(0);
  }, [plan]);

  useFrame(({ camera, invalidate }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const st = useWalk.getState();
    // Перемотування з панелі — беремо час звідти.
    if (Math.abs(st.t - pushed.current) > 1e-6) tRef.current = st.t;
    if (st.playing) {
      tRef.current = Math.min(timeline.total, tRef.current + dt * st.speed);
      if (tRef.current >= timeline.total) st.pause();
    }
    const w = walkAt(plan, tRef.current, timeline);
    const g = group.current;
    if (!w || !g) return;
    // Позиція — на згладженому шляху, пропорційно пройденій модельній відстані.
    const d = rawLength > 0 ? (w.dist / rawLength) * path.length : 0;
    const xy = pointAt(path, d);
    const ahead = pointAt(path, d + LOOK_AHEAD_M);
    const behind = pointAt(path, d - 0.5);
    const dx = ahead[0] - behind[0];
    const dy = ahead[1] - behind[1];
    const target = Math.hypot(dx, dy) > 0.05 ? Math.atan2(dy, dx) : w.heading;
    heading.current = heading.current === null ? target : heading.current + angleDelta(heading.current, target) * Math.min(1, dt * 6);
    const h = heading.current;
    const pos = toR3F(xy, groundAt(xy) ?? 0);

    // Хода: швидкість над ґрунтом у реальному часі = модельна швидкість відрізка × множник.
    const seg = plan.segments[w.segment];
    const segSpeed = seg && seg.time > 0 ? seg.dist / seg.time : 0;
    const moving = st.playing && !w.done;
    const gait = gaitFor(moving ? segSpeed * st.speed : 0, rig.durations.Walk, rig.durations.Run);
    for (const name of ['Idle', 'Walk', 'Run'] as const) {
      const a = rig.actions[name];
      if (!a) continue;
      if (!a.isRunning()) a.play();
      const goal = name === gait.clip ? 1 : 0;
      const cur = weights.current[name];
      const next = cur + (goal - cur) * Math.min(1, dt * 8);
      weights.current[name] = next;
      a.setEffectiveWeight(next);
      a.setEffectiveTimeScale(name === 'Idle' ? 1 : gait.clip === name ? gait.timeScale : 1);
    }
    rig.mixer.update(dt);

    // Згори фігуру збільшуємо (вона не входить у розрахунки); біля землі — справжній зріст.
    const dist = camera.position.distanceTo(new Vector3(pos[0], pos[1], pos[2]));
    const s = lifeSize ? 1 : Math.min(60, Math.max(1, dist / 60));
    g.position.set(pos[0], pos[1], pos[2]);
    // Курс (cos h, −sin h) у площині R3F (x, −z); yawOffset — куди «дивиться» сама модель.
    g.rotation.set(0, Math.atan2(Math.cos(h), -Math.sin(h)) + rig.yawOffset, 0);
    g.scale.setScalar(s);
    walkPose.position.set(pos[0], pos[1], pos[2]);
    walkPose.heading = h;
    walkPose.ready = true;
    walkPose.groundAt = groundAt;
    walkPose.fastForward = rig.rover ? false : gait.fastForward;
    walkPose.rover = rig.rover;

    const now = performance.now();
    if (st.playing && now - lastPush.current > 100) {
      lastPush.current = now;
      pushed.current = tRef.current;
      st.seek(tRef.current);
    }
    // Слід / маршрут попереду — перебудовуємо кожні ~0,5 м (не частіше ~20 разів на секунду на великій швидкості).
    const step = Math.max(0.5, segSpeed * st.speed * 0.05);
    if (Math.abs(d - lastProgress.current) > step || (w.done && lastProgress.current !== path.length)) {
      lastProgress.current = w.done ? path.length : d;
      onProgress(lastProgress.current);
    }
    invalidate();
  });

  return (
    <group ref={group}>
      <primitive object={rig.root} />
    </group>
  );
}

/** Астронавт на маршруті + пройдений слід і маршрут попереду, що лягають на рельєф і починаються від астронавта. */
export function Astronaut(props: AstronautProps) {
  const { plan, groundAt } = props;
  const rover = useMission((s) => s.travelMode) === 'rover';
  const [progress, setProgress] = useState(0);
  const path = useMemo(() => indexPath(smoothPath(routeVertices(plan))), [plan]);
  const done = useMemo(() => drape(slicePath(path, 0, progress), groundAt), [path, progress, groundAt]);
  // Біля землі лінія попереду починається за 3 м: з камери позаду вона інакше йде просто крізь фігуру.
  const aheadFrom = props.lifeSize ? progress + 3 : progress;
  const ahead = useMemo(() => drape(slicePath(path, aheadFrom, path.length), groundAt), [path, aheadFrom, groundAt]);

  useEffect(
    () => () => {
      walkPose.ready = false;
      walkPose.fastForward = false;
      walkPose.rover = false;
    },
    [],
  );

  return (
    <>
      {ahead.length >= 2 && <Line points={ahead} color="#ffb347" lineWidth={3} transparent opacity={0.95} depthTest depthWrite={false} renderOrder={RENDER_ORDER.lines + 1} />}
      {/* Біля землі пройдений слід тягнеться від камери до ступнів і виглядає як стовп — показуємо лише згори. */}
      {!props.lifeSize && done.length >= 2 && <Line points={done} color="#7fe3ff" lineWidth={3} transparent opacity={0.9} renderOrder={RENDER_ORDER.segment} />}
      <Suspense fallback={null}>
        {rover ? (
          <RoverFallback fallback={<AstronautFigure {...props} onProgress={setProgress} />}>
            <RoverFigure {...props} onProgress={setProgress} />
          </RoverFallback>
        ) : (
          <AstronautFigure {...props} onProgress={setProgress} />
        )}
      </Suspense>
    </>
  );
}

/** Лінія на 0,25 м над поверхнею (не тоне в рельєфі й не висить у повітрі). */
function drape(xs: XY[], groundAt: (xy: XY) => number | null): [number, number, number][] {
  return xs.map((xy) => toR3F(xy, (groundAt(xy) ?? 0) + 0.25 / VERTICAL_EXAGGERATION));
}

useGLTF.preload(modelUrl);
