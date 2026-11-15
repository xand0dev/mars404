// Панель «Navigation»: як астронавт знає, де він, без GPS. Маяки на рівних висотах + інерціалка між ними,
// контрольні точки там, де похибка зростає. Плюс ґрунт: скільки маршруту по пухкому піску (повільніше).
import { Disclosure, EvidenceBadge, Panel, StatusNote } from '../../ui';
import { BEACON_RANGE_M, CHECKPOINT_ERR_M, DRIFT, MAST_M } from './lib/nav';
import { useNavLive, useNavPlan, useNavView } from './navStore';

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function NavPanel() {
  const nav = useNavPlan();
  const { show, setShow } = useNavView();
  const live = useNavLive((s) => s.now);
  const linkState = useNavLive((s) => s.links);

  return (
    <Panel title="Navigation" featureId="F2" owner="Олександр" id="navigation">
      {!nav ? (
        <StatusNote level="info">Build a route to place navigation beacons. There is no GPS on Mars.</StatusNote>
      ) : (
        <div className="nav">
          <div className="nav__fix">
            <p className="nav__big">
              <strong>{pct(nav.fixShare)}</strong> of the route with a precise position
            </p>
            <div className="nav__bar" role="img" aria-label={`Precise position on ${pct(nav.fixShare)} of the route`}>
              <span style={{ width: pct(nav.fixShare) }} />
            </div>
          </div>
          {live && (
            <p className={`nav__now ${live.fix ? 'is-fix' : 'is-imu'}`} role="status">
              <span className="nav__k">Now</span> {live.fix ? '◉ Beacon fix' : '◌ Inertial'} · ±{Math.round(live.errM)} m · {live.links} of {nav.beacons.length} beacons
              {!live.fix && live.nextCheckpointM !== null ? ` · checkpoint in ${Math.round(live.nextCheckpointM)} m` : ''}
            </p>
          )}
          <ul className="nav__facts">
            <li>
              <span className="nav__k">Beacons</span> Base + {nav.beacons.length - 1}
            </li>
            <li>
              <span className="nav__k">Max drift</span> ±{Math.round(nav.maxErrM)} m
            </li>
            <li>
              <span className="nav__k">Checkpoints</span> {nav.checkpoints.length}
            </li>
            <li>
              <span className="nav__k">Loose sand</span> {pct(nav.sandShare)} of route
            </li>
          </ul>
          <ul className="ui-list nav__beacons" aria-label="Navigation beacons">
            {nav.beacons.map((b) => (
              <li key={b.id} className="ui-row">
                <span className="nav__tri" aria-hidden="true">▲</span>
                <span className="ui-row__title">{b.isBase ? 'Base (habitat)' : b.id}</span>
                <span className="ui-row__meta nav__meta">
                  {b.isBase ? 'always on' : `flat ${Math.round(b.slopeDeg)}° · ${Math.round(b.elevationM)} m`}
                  {linkState.length > 0 && (() => {
                    const l = linkState.find((x) => x.id === b.id);
                    return l ? ` · ${l.state === 'link' ? '● signal' : l.state === 'blocked' ? '○ blocked by terrain' : '· out of range'}` : '';
                  })()}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" aria-pressed={show} onClick={() => setShow(!show)}>
            {show ? 'Hide on map' : 'Show on map'}
          </button>
          <Disclosure summary="How position works without GPS">
            <ul className="nav__how">
              <li>
                <strong>Beacons</strong> on solar masts ({MAST_M} m) on flat high ground. Where 3 beacons see you, your position is known to about a metre.
              </li>
              <li>
                <strong>Inertial</strong> (accelerometers + step count) between beacons. The error grows about {Math.round(DRIFT * 100)}% of the distance walked: the violet dashed parts of the route.
              </li>
              <li>
                <strong>Checkpoints</strong> (◇) where the error would pass {CHECKPOINT_ERR_M} m: stop at a known landmark and reset.
              </li>
              <li>
                <strong>Ground</strong>: loose sand (dark at night in THEMIS) slows walking up to 40%; the route time already includes it.
              </li>
            </ul>
            <p className="nav__src">
              Range {BEACON_RANGE_M / 1000} km, drift, mast height and sand slowdown are <EvidenceBadge status="assumption" /> model values.
            </p>
          </Disclosure>
        </div>
      )}
    </Panel>
  );
}
