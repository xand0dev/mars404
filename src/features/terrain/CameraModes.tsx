// Перемикач камер F2: Orbit / Top / POV. Стан — локальний (cameraStore), у useMission не пише.
import { regionKind } from '../../contracts/planning';
import { useMission } from "../../store/useMission";
import { useCameraMode } from "./cameraStore";
import { CAMERA_MODES, EYE_HEIGHT_M } from "./lib/camera";
import { WalkControls } from "./WalkControls";
import { useWalk } from "./walkStore";

export function CameraModes() {
  const site = useMission((s) => s.site);
  const mode = useCameraMode((s) => s.mode);
  const setMode = useCameraMode((s) => s.setMode);
  const view3D = useCameraMode((s) => s.view3D);
  const plan2D = useCameraMode((s) => s.plan2D);
  const setPlan2D = useCameraMode((s) => s.setPlan2D);
  const overview = useMission((s) => s.site !== null && s.region?.id === s.site && regionKind(s.region) === 'overview');
  // У 2D, обраному кнопкою, камери лишаються клікабельними: клік повертає 3D з цим режимом.
  const off = site === null || (!view3D && !plan2D);
  const walking = useWalk((w) => w.active);
  return (
    <>
      <div role="group" aria-label="Camera mode" className="terrain-cams">
        {CAMERA_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={!off && !plan2D && mode === m.id}
            disabled={off || (m.id === "follow" && !walking)}
            title={
              m.id === "free"
                ? "Drag to orbit, WASD / arrows to fly, Q / E down / up, Shift — faster"
                : m.id === "follow"
                  ? "Camera behind the astronaut (start the walk first)"
                  : undefined
            }
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={plan2D}
          disabled={site === null || overview}
          title="Flat 2D map: terrain classes, targets and route from above, north up"
          onClick={() => setPlan2D(!plan2D)}
        >
          2D
        </button>
        {!off && !plan2D && mode === "free" && (
          <span className="ui-stub">
            WASD / arrows fly · Q / E down / up · Shift faster
          </span>
        )}
        {!off && !plan2D && mode === "pov" && (
          <span className="ui-stub">
            Eye height {EYE_HEIGHT_M} m — assumption
          </span>
        )}
        {site !== null && !view3D && !plan2D && (
          <span className="ui-stub">Camera modes need 3D</span>
        )}
      </div>
      {site !== null && <WalkControls />}
    </>
  );
}
