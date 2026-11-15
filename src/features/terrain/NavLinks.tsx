// Живий зв'язок «маяк → скафандр» під час прогулянки: лінії сигналу від щогл до антени астронавта.
// Зв'язок є — бірюзова лінія з «бігом» сигналу; закрито рельєфом — тьмяна червона пунктирна; задалеко — нічого.
// Над астронавтом — табличка FIX / IMU з похибкою. Store не змінюється; панелі віддаємо стан через useNavLive.
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Group, Mesh, MeshBasicMaterial } from 'three';
import { Line } from '@react-three/drei';
import type { PlanningGrid, RoutePlan, XY } from '../../contracts';
import { Label3D } from './Label3D';
import { beaconLinks, navNow, type BeaconLink, type NavPlan } from './lib/nav';
import { CSS } from './lib/overlay';
import { RENDER_ORDER } from './lib/layerRaster';
import { walkAt, walkTimeline } from './lib/walk';
import { useNavLive, useNavPlan } from './navStore';
import { useWalk, walkPose } from './walkStore';

type V3 = [number, number, number];

type LineRef = ComponentRef<typeof Line>;

interface Props {
  grid: PlanningGrid;
  plan: RoutePlan;
  /** Вершина щогли маяка в координатах сцени */
  mastTop: (xy: XY) => V3 | null;
  /** Розмір маркерів (як у сцені): лінії й табличка масштабуються з ним */
  markerR: number;
}

const LINK = new Color(CSS.beacon);
const BLOCKED = new Color(CSS.noReturn);
const UPDATE_MS = 200;

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function NavLinks(props: Props) {
  const nav = useNavPlan();
  return nav ? <Links {...props} nav={nav} /> : null;
}

function Links({ grid, plan, nav, mastTop, markerR }: Props & { nav: NavPlan }) {
  const tops = useMemo(() => nav.beacons.map((b) => mastTop(b.xy)), [nav, mastTop]);
  const lines = useRef<(LineRef | null)[]>([]);
  const lights = useRef<(Mesh | null)[]>([]);
  const tag = useRef<Group>(null);
  const timeline = useMemo(() => walkTimeline(plan), [plan]);
  const last = useRef(0);
  const linksRef = useRef<BeaconLink[]>([]);
  const [label, setLabel] = useState<{ text: string; color: string } | null>(null);
  const setLive = useNavLive((s) => s.set);
  const still = useMemo(() => reducedMotion(), []);

  useEffect(() => () => setLive(null, []), [setLive]);

  useFrame(({ clock, invalidate }, dt) => {
    if (!walkPose.ready) return;
    const p = walkPose.position;
    // Антена на плечі: трохи вище ніг; далеко від камери фігура збільшена — тягнемо лінію до верхівки.
    const head: V3 = [p.x, p.y + Math.max(1.6, markerR * 2), p.z];
    const now = performance.now();
    if (now - last.current > UPDATE_MS) {
      last.current = now;
      const xy: XY = [p.x, -p.z];
      const links = beaconLinks(grid, nav.beacons, xy);
      linksRef.current = links;
      const w = walkAt(plan, useWalk.getState().t, timeline);
      const st = navNow(nav, links, w?.dist ?? 0);
      setLive(st, links);
      const text = st.fix ? `◉ FIX · ${st.links} beacons · ±${Math.round(st.errM)} m` : `◌ IMU · ${st.links} beacon${st.links === 1 ? '' : 's'} · ±${Math.round(st.errM)} m`;
      const color = st.fix ? CSS.beacon : CSS.drift;
      setLabel((cur) => (cur && cur.text === text ? cur : { text, color }));
    }
    const pulse = still ? 1 : 0.65 + 0.35 * Math.sin(clock.getElapsedTime() * 6);
    linksRef.current.forEach((l, i) => {
      const line = lines.current[i];
      const top = tops[i];
      const light = lights.current[i];
      const on = l.state === 'link';
      if (light) {
        light.visible = !!top;
        (light.material as MeshBasicMaterial).opacity = on ? pulse : 0.25;
      }
      if (!line || !top) return;
      line.visible = l.state !== 'far';
      if (!line.visible) return;
      const l2 = line as unknown as { geometry: { setPositions(a: number[]): void }; computeLineDistances(): void; material: { color: Color; opacity: number; dashed: boolean; dashSize: number; gapSize: number; dashOffset: number } };
      l2.geometry.setPositions([...top, ...head]);
      l2.computeLineDistances();
      const m = l2.material;
      m.color.copy(on ? LINK : BLOCKED);
      m.opacity = on ? 0.95 : 0.45;
      m.dashed = true;
      m.dashSize = on ? markerR * 1.2 : markerR * 0.5;
      m.gapSize = on ? markerR * 0.8 : markerR * 0.9;
      // «Біг» сигналу від маяка до скафандра.
      if (!still && on) m.dashOffset -= dt * markerR * 6;
    });
    if (tag.current) tag.current.position.set(head[0], head[1] + markerR * 3, head[2]);
    invalidate();
  });

  return (
    <group>
      {nav.beacons.map((b, i) => {
        const top = tops[i];
        if (!top) return null;
        return (
          <group key={b.id}>
            <Line
              ref={(el) => {
                // visible не передаємо пропом: drei Line ставить його й на матеріал — лінія зникла б назавжди.
                if (el && lines.current[i] !== el) el.visible = false;
                lines.current[i] = el;
              }}
              points={[top, top]}
              color={CSS.beacon}
              lineWidth={3}
              dashed
              transparent
              depthTest={false}
              renderOrder={RENDER_ORDER.segment}
            />
            <mesh
              ref={(el) => {
                lights.current[i] = el;
              }}
              position={top}
              renderOrder={RENDER_ORDER.markers}
            >
              <sphereGeometry args={[markerR * 0.7, 16, 12]} />
              <meshBasicMaterial color={CSS.beacon} transparent depthTest={false} opacity={0.25} />
            </mesh>
          </group>
        );
      })}
      {label && (
        <group ref={tag}>
          <Label3D position={[0, 0, 0]} color={label.color} text={label.text} />
        </group>
      )}
    </group>
  );
}
