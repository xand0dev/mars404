// F1: R3F-вузли глобуса. Рендериться всередині MapView (F2) через проп globe.
// Камеру (спільну з F2) не чіпаємо — обертаємо й масштабуємо лише групу глобуса.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { PerspectiveCamera, SRGBColorSpace, TextureLoader, Vector3, type Group, type Texture } from 'three';
import { dataUrl } from '../../contracts/planning';
import { chooseSite } from './choose';
import { latLonToSphere } from './geo';
import { useGlobe } from './globeState';
import { FLY_MS, lerpRotation, rotationToFace } from './motion';
import { dragRotation, facesCamera, fitScale, markerActive } from './sceneMath';
import { GALE_ID, SITES, siteById, type Site } from './sites';
import { parseTextureMeta, TEXTURE_META_PATH } from './texture';

const gale = siteById(GALE_ID)!;
const GALE_FACE = rotationToFace(gale.latDeg, gale.lonEastDeg);
/** Старт: Gale видно, але на 45° східніше центру — щоб перехід був помітним (UI-вибір, не дані). */
const START = rotationToFace(0, gale.lonEastDeg - 45);
const MARKER_R = 1.01;
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
  const previewId = useGlobe((s) => s.previewId);
  const map = useMarsTexture();
  const fly = useRef<{ from: [number, number, number]; start: number } | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

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
    return fitScale({ fovDeg, distance: camera.position.length(), aspect: size.width / size.height, radius: MARKER_R + 0.05 });
  }, [camera, size]);

  // frameloop="demand": кадри просимо лише поки йде анімація. В store нічого не пишемо —
  // site ставить SitePanel наприкінці таймера.
  useFrame(({ clock, camera: cam }) => {
    const g = group.current;
    if (!g) return;
    if (flying) {
      const now = clock.getElapsedTime() * 1000;
      fly.current ??= { from: [g.rotation.x, g.rotation.y, g.rotation.z], start: now };
      const [x, y, z] = lerpRotation(fly.current.from, GALE_FACE, (now - fly.current.start) / FLY_MS);
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
    if (flying) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    const g = group.current;
    if (!d || !g) return;
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
      <group scale={scale}>
        <group ref={group} rotation={START}>
          <mesh onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <sphereGeometry args={[1, 64, 32]} />
            {map ? (
              <meshStandardMaterial key="tex" map={map} />
            ) : (
              <meshStandardMaterial key="mock" color="#b4532a" />
            )}
          </mesh>
          <group ref={markers}>
            {SITES.map((s) => (
              <Marker key={s.id} site={s} active={markerActive(s.id, { previewId, flying })} />
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}
