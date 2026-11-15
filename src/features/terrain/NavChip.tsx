// Чип «звідки я знаю, де я» поверх карти під час прогулянки: FIX від маяків або IMU з похибкою, і стан кожного маяка.
// Видно в будь-якій камері (Follow, Orbit, Top); дані — живий стан зі сцени (useNavLive).
import { useNavLive, useNavView } from './navStore';
import { useWalk } from './walkStore';

const STATE_TEXT = { link: 'signal', blocked: 'blocked by terrain', far: 'out of range' } as const;

export function NavChip() {
  const active = useWalk((w) => w.active);
  const show = useNavView((v) => v.show);
  const now = useNavLive((s) => s.now);
  const links = useNavLive((s) => s.links);
  if (!active || !show || !now) return null;
  const err = `±${Math.round(now.errM)} m`;
  return (
    <div className={`nav-chip ${now.fix ? 'is-fix' : 'is-imu'}`} role="status" aria-live="off">
      <p className="nav-chip__head">
        <span className="nav-chip__mode">{now.fix ? '◉ Beacon fix' : '◌ Inertial'}</span>
        <strong className="nav-chip__err">{err}</strong>
      </p>
      <ul className="nav-chip__beacons" aria-label="Beacon signal">
        {links.map((l) => (
          <li key={l.id} className={`nav-chip__b is-${l.state}`} title={`${l.id}: ${STATE_TEXT[l.state]}, ${Math.round(l.distM)} m`}>
            <span aria-hidden="true">{l.state === 'link' ? '●' : l.state === 'blocked' ? '○' : '·'}</span>
            {l.isBase ? 'Base' : l.id}
            <span className="nav-chip__sr"> — {STATE_TEXT[l.state]}</span>
          </li>
        ))}
      </ul>
      {!now.fix && now.nextCheckpointM !== null && <p className="nav-chip__next">Checkpoint in {Math.round(now.nextCheckpointM)} m</p>}
    </div>
  );
}
