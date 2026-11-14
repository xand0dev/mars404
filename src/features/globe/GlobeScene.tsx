// F1: R3F-вузли глобуса. Рендериться всередині MapView (F2) через проп globe.
// Камеру (спільну з F2) не чіпаємо — обертаємо лише групу глобуса.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import { useGlobe } from './globeState';
import { FLY_MS, lerpRotation, rotationToFace } from './motion';
import { GALE_ID, siteById } from './sites';

const gale = siteById(GALE_ID)!;
const GALE_FACE = rotationToFace(gale.latDeg, gale.lonEastDeg);

export function GlobeScene() {
  const group = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const setSceneReady = useGlobe((s) => s.setSceneReady);
  const flying = useGlobe((s) => s.flying);
  const fly = useRef<{ from: [number, number, number]; start: number } | null>(null);

  // Сцена є (є WebGL) → SitePanel може анімувати перехід (F1-AC3).
  useEffect(() => {
    setSceneReady(true);
    return () => setSceneReady(false);
  }, [setSceneReady]);

  useEffect(() => {
    fly.current = null;
    if (flying) invalidate();
  }, [flying, invalidate]);

  // frameloop="demand": кадри просимо лише поки йде анімація. В store нічого не пишемо —
  // site ставить SitePanel наприкінці таймера.
  useFrame(({ clock }) => {
    const g = group.current;
    if (!flying || !g) return;
    const now = clock.getElapsedTime() * 1000;
    fly.current ??= { from: [g.rotation.x, g.rotation.y, g.rotation.z], start: now };
    const [x, y, z] = lerpRotation(fly.current.from, GALE_FACE, (now - fly.current.start) / FLY_MS);
    g.rotation.set(x, y, z, 'XYZ');
    invalidate();
  });

  return (
    <group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <group ref={group}>
        <mesh>
          <sphereGeometry args={[1, 48, 32]} />
          <meshStandardMaterial color="#b4532a" />
        </mesh>
      </group>
    </group>
  );
}
