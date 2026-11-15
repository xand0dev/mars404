// F1: R3F-вузли глобуса. Рендериться всередині MapView (F2) через проп globe.
// Камеру (спільну з F2) не чіпаємо — обертаємо й масштабуємо лише групу глобуса.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { PerspectiveCamera, Raycaster, SRGBColorSpace, TextureLoader, Vector2, Vector3, type Group, type Mesh, type Texture } from 'three';
import { dataUrl } from '../../contracts/planning';
import { chooseSite } from './choose';
import { latLonToSphere } from './geo';
import { useGlobe } from './globeState';
import { FLY_MS, lerpRotation, rotationToFace } from './motion';
import { dragRotation, facesCamera, fitScale, markerActive } from './sceneMath';
import { GALE_ID, SITES, siteById, type Site } from './sites';
import { parseTextureMeta, TEXTURE_META_PATH } from './texture';
import { maxZoomFor, pinchFactor, useZoom, wheelFactor } from './zoom';

const gale = siteById(GALE_ID)!;
/** Поворот глобуса, за якого точка дивиться на камеру. */
const faceOf = (id: string) => {
  const s = siteById(id) ?? gale;
  return rotationToFace(s.latDeg, s.lonEastDeg);
};
/** Старт: Gale видно, але на 45° східніше центру — щоб перехід був помітним (UI-вибір, не дані). */
const START = rotationToFace(0, gale.lonEastDeg - 45);
const MARKER_R = 1.01;
/** Радіус, який має влізти в кадр (маркери + запас) */
const FIT_R = MARKER_R + 0.05;
/** Зсув курсора, після якого клік вважаємо перетягуванням, px */
const CLICK_SLOP_PX = 5;
const tmp = new Vector3();

/** Текстура з public/data/mars за source.json; без опису чи файлу — null і status 'missing' (F1-AC4). */
function useMarsTexture(): Texture | null {
  const [map, setMap] = useState<Texture | null>(null);
  const setTexture = useGlobe((s) => s.setTexture);
  useEffect(() => {
    let alive = true;
    let tex: Texture | null = null;
    const fail = () => alive && setTexture({ status: 'missing' });
    setTexture({ status: 'loading' });
    fetch(dataUrl(TEXTURE_META_PATH))
      .then((r) => (r.ok ? r.json() : null))
      .then((json: unknown) => {
        const meta = parseTextureMeta(json);
        if (!meta || !alive) return fail();
        new TextureLoader().load(
          dataUrl(`mars/${meta.file}`),
          (t) => {
            if (!alive) return t.dispose();
            t.colorSpace = SRGBColorSpace;
            tex = t;
            setMap(t);
            setTexture({ status: 'ok', credit: meta.credit });
          },
          undefined,
          fail,
        );
      })
      .catch(fail);
    return () => {
      alive = false;
      tex?.dispose();
    };
  }, [setTexture]);
  return map;
}

function Marker({ site, active }: { site: Site; active: boolean }) {
  const pos = useMemo(() => latLonToSphere(site.latDeg, site.lonEastDeg, MARKER_R), [site]);
  const r = (site.modelled ? 0.035 : 0.025) * (active ? 1.4 : 1);
  return (
    <mesh
      position={pos}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        // Схований маркер (зворотний бік) теж трапляє під промінь за сферою — ігноруємо.
        if (!e.eventObject.visible) return;
        e.stopPropagation();
        if (e.delta <= CLICK_SLOP_PX) chooseSite(site.id);
      }}
    >
      <sphereGeometry args={[r, 16, 12]} />
      <meshBasicMaterial color={active ? '#ffd38a' : site.modelled ? '#e0673c' : '#f3ece6'} />
    </mesh>
  );
}

export function GlobeScene() {
  const group = useRef<Group>(null);
  const markers = useRef<Group>(null);
  const { invalidate, camera, size, gl } = useThree();
  const setSceneReady = useGlobe((s) => s.setSceneReady);
  const flying = useGlobe((s) => s.flying);
  const flyTo = useGlobe((s) => s.flyTo);
  const previewId = useGlobe((s) => s.previewId);
  const map = useMarsTexture();
  const fly = useRef<{ from: [number, number, number]; start: number } | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const sphere = useRef<Mesh>(null);
  /** #80: два пальці на екрані — масштаб, обертання скасовано */
  const pinching = useRef(false);
  const zoom = useZoom((s) => s.zoom);
  const resetTick = useZoom((s) => s.resetTick);

  // Сцена є (є WebGL) → SitePanel може анімувати перехід (F1-AC3).
  useEffect(() => {
    setSceneReady(true);
    return () => setSceneReady(false);
  }, [setSceneReady]);

  // Горизонтальний drag на тач-екрані обертає глобус, вертикальний — скролить сторінку. Повертаємо як було.
  useEffect(() => {
    const style = gl.domElement.style;
    const prev = style.getPropertyValue('touch-action');
    style.setProperty('touch-action', 'pan-y');
    return () => style.setProperty('touch-action', prev);
  }, [gl]);

  useEffect(() => {
    fly.current = null;
    if (flying) invalidate();
  }, [flying, invalidate]);

  useEffect(() => invalidate(), [map, previewId, invalidate]);

  const scale = useMemo(() => {
    const fovDeg = camera instanceof PerspectiveCamera ? camera.fov : 45;
    return fitScale({ fovDeg, distance: camera.position.length(), aspect: size.width / size.height, radius: FIT_R });
  }, [camera, size]);

  // #80: верхня межа масштабу — сфера лишається перед камерою F2.
  useEffect(() => {
    useZoom.getState().setMaxZoom(maxZoomFor({ scale, distance: camera.position.length(), radius: FIT_R }));
  }, [scale, camera]);

  useEffect(() => invalidate(), [zoom, invalidate]);

  // «Reset view»: стартовий поворот (масштаб скидає сам store).
  useEffect(() => {
    if (resetTick === 0 || !group.current) return;
    group.current.rotation.set(START[0], START[1], START[2], 'XYZ');
    invalidate();
  }, [resetTick, invalidate]);

  // #80: колесо / тачпад (щипок macOS = wheel + ctrlKey) лише над сферою — поза нею сторінка прокручується.
  // Два пальці — нативні pointer-події (touch-action: pan-y пропускає щипок у pointer-події).
  useEffect(() => {
    const el = gl.domElement;
    const ray = new Raycaster();
    const ndc = new Vector2();
    const overGlobe = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      if (!sphere.current || !(r.width > 0) || !(r.height > 0)) return false;
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObject(sphere.current, false).length > 0;
    };
    const onWheel = (e: WheelEvent) => {
      if (useGlobe.getState().flying || !overGlobe(e.clientX, e.clientY)) return;
      e.preventDefault();
      useZoom.getState().zoomBy(wheelFactor(e.deltaY, e.deltaMode, e.ctrlKey));
    };
    const pts = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    const dist = () => {
      const [a, b] = [...pts.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        pinchDist = dist();
        pinching.current = true;
        drag.current = null;
      }
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size !== 2 || !(pinchDist > 0) || useGlobe.getState().flying) return;
      const d = dist();
      useZoom.getState().zoomBy(pinchFactor(pinchDist, d));
      pinchDist = d;
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinchDist = 0;
      if (pts.size === 0) pinching.current = false;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [gl, camera]);

  // frameloop="demand": кадри просимо лише поки йде анімація. В store нічого не пишемо —
  // site ставить SitePanel наприкінці таймера.
  useFrame(({ clock, camera: cam }) => {
    const g = group.current;
    if (!g) return;
    if (flying) {
      const now = clock.getElapsedTime() * 1000;
      fly.current ??= { from: [g.rotation.x, g.rotation.y, g.rotation.z], start: now };
      const [x, y, z] = lerpRotation(fly.current.from, faceOf(flyTo), (now - fly.current.start) / FLY_MS);
      g.rotation.set(x, y, z, 'XYZ');
      invalidate();
    }
    // Маркери зворотного боку й біля краю диска ховаємо (рахується лише в кадрах, які й так малюються).
    for (const m of markers.current?.children ?? []) {
      m.getWorldPosition(tmp);
      m.visible = facesCamera([tmp.x, tmp.y, tmp.z], [cam.position.x, cam.position.y, cam.position.z]);
    }
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (flying || pinching.current) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    const g = group.current;
    if (!d || !g) return;
    if (pinching.current) {
      drag.current = null;
      return;
    }
    const [x, y] = dragRotation([g.rotation.x, g.rotation.y], e.clientX - d.x, e.clientY - d.y, size.height);
    g.rotation.set(x, y, 0, 'XYZ');
    drag.current = { x: e.clientX, y: e.clientY };
    invalidate();
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    drag.current = null;
  };

  return (
    <group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <group scale={scale * zoom}>
        <group ref={group} rotation={START}>
          <mesh ref={sphere} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <sphereGeometry args={[1, 64, 32]} />
            {map ? (
              <meshStandardMaterial key="tex" map={map} />
            ) : (
              <meshStandardMaterial key="mock" color="#b4532a" />
            )}
          </mesh>
          <group ref={markers}>
            {SITES.map((s) => (
              <Marker key={s.id} site={s} active={markerActive(s.id, { previewId, flying, flyTo })} />
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}
