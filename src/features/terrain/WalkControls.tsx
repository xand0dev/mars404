// Панель демо-прогулянки: Play / Pause / Restart / Stop, швидкість, перемотування, показники в реальному часі.
import { useMemo } from 'react';
import { useMission } from '../../store/useMission';
import { useCameraMode } from './cameraStore';
import { clock, walkAt, walkTimeline, WALK_SPEEDS } from './lib/walk';
import { useWalk } from './walkStore';

export function WalkControls() {
  const plan = useMission((s) => s.plan);
  const { playing, t, speed, active, play, pause, restart, stop, seek, setSpeed } = useWalk();
  const mode = useCameraMode((s) => s.mode);
  const setMode = useCameraMode((s) => s.setMode);
  const view3D = useCameraMode((s) => s.view3D);
  const ok = !!plan && plan.status === 'ok' && plan.segments.length > 0 && view3D;
  const timeline = useMemo(() => (plan ? walkTimeline(plan) : { starts: [], total: 0 }), [plan]);
  const w = ok && plan ? walkAt(plan, t, timeline) : null;
  if (!ok || !plan) return null;

  const onPlay = () => {
    if (w?.done) restart();
    else play();
    if (mode !== 'follow' && mode !== 'free') setMode('follow');
  };
  const slope = w ? `${w.slope >= 0 ? '+' : '−'}${Math.abs(w.slope).toFixed(0)}°` : '—';

  return (
    <section className="walk-panel" aria-label="EVA walk demo">
      <div className="walk-panel__row">
        {playing ? (
          <button type="button" onClick={pause} className="walk-panel__main">
            ❚❚ Pause
          </button>
        ) : (
          <button type="button" onClick={onPlay} className="walk-panel__main">
            ▶ {w?.done ? 'Walk again' : active ? 'Resume walk' : 'Walk the route'}
          </button>
        )}
        <button type="button" onClick={restart} disabled={!active}>
          ↺ Restart
        </button>
        <button type="button" onClick={stop} disabled={!active}>
          ■ Stop
        </button>
        <div role="group" aria-label="Playback speed" className="walk-panel__speeds">
          {WALK_SPEEDS.map((v) => (
            <button key={v} type="button" aria-pressed={speed === v} onClick={() => setSpeed(v)}>
              ×{v}
            </button>
          ))}
        </div>
      </div>
      <label className="walk-panel__scrub">
        <span>EVA time</span>
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.round(timeline.total))}
          step={1}
          value={Math.round(w?.t ?? 0)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-valuetext={`${clock(w?.t ?? 0)} of ${clock(timeline.total)}`}
        />
        <output>
          {clock(w?.t ?? 0)} / {clock(timeline.total)}
        </output>
      </label>
      <p className="walk-panel__stats" aria-live="off">
        <span>Walked {Math.round(w?.dist ?? 0)} m</span>
        <span>O₂ used {(w?.o2 ?? 0).toFixed(1)} g</span>
        <span>Energy {(w?.energy ?? 0).toFixed(1)} Wh</span>
        <span>Slope {slope}</span>
        <span className="walk-panel__note">Model estimate · speed ×{speed} · figure enlarged when far</span>
      </p>
    </section>
  );
}
