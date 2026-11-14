// Перемикач камер F2: Orbit / Top / POV. Стан — локальний (cameraStore), у useMission не пише.
import { useMission } from '../../store/useMission';
import { useCameraMode } from './cameraStore';
import { CAMERA_MODES, EYE_HEIGHT_M } from './lib/camera';

export function CameraModes() {
  const site = useMission((s) => s.site);
  const mode = useCameraMode((s) => s.mode);
  const setMode = useCameraMode((s) => s.setMode);
  const view3D = useCameraMode((s) => s.view3D);
  const off = site === null || !view3D;
  return (
    <div role="group" aria-label="Camera mode" className="terrain-cams">
      {CAMERA_MODES.map((m) => (
        <button key={m.id} type="button" aria-pressed={!off && mode === m.id} disabled={off} onClick={() => setMode(m.id)}>
          {m.label}
        </button>
      ))}
      {!off && mode === 'pov' && <span className="ui-stub">Eye height {EYE_HEIGHT_M} m — assumption</span>}
      {site !== null && !view3D && <span className="ui-stub">Camera modes need 3D</span>}
    </div>
  );
}
