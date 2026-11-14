// F2 заглушка (F0): єдиний R3F Canvas у режимі demand + текстовий план Б без WebGL.
import { Component, useEffect, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';

export interface MapViewProps {
  /** 3D-вузли глобуса (F1), показуються при site = null */
  globe: ReactNode;
}

function hasWebGL(): boolean {
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) return false;
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * У режимі demand заміна вмісту сцени не перемальовує кадр сама, а новий шейдер
 * може компілюватися асинхронно — тому кілька кадрів поспіль після зміни.
 */
function Redraw({ dep, frames = 30 }: { dep: unknown; frames?: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let left = frames;
    let id = 0;
    const tick = () => {
      invalidate();
      if (--left > 0) id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [dep, frames, invalidate]);
  return null;
}

export function MapView({ globe }: MapViewProps) {
  const site = useMission((s) => s.site);
  const [webgl] = useState(hasWebGL);
  const [lost, setLost] = useState(false);
  const fallback = (
    <div role="img" aria-label="2D plan B">
      <StatusNote level="warn">3D unavailable ({lost ? 'WebGL context lost' : 'no WebGL'}). 2D plan B — MOCK stub.</StatusNote>
    </div>
  );
  return (
    <Panel title={site === null ? 'Mars globe' : 'Gale terrain'} featureId="F2" owner="Олександр" mock>
      <div style={{ height: 'min(60vh, 520px)', minHeight: 240 }}>
        {webgl && !lost ? (
          <SceneBoundary fallback={fallback}>
            <Canvas
              frameloop="demand"
              camera={{ position: [0, 0, 3], fov: 45 }}
              onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', () => setLost(true))}
            >
              <Redraw dep={site} />
              {site === null ? (
                globe
              ) : (
                <>
                  <mesh rotation={[-Math.PI / 2.5, 0, 0]}>
                    <planeGeometry args={[2.5, 2.5, 16, 16]} />
                    <meshBasicMaterial color="#c0703f" wireframe />
                  </mesh>
                </>
              )}
            </Canvas>
          </SceneBoundary>
        ) : (
          fallback
        )}
      </div>
    </Panel>
  );
}
