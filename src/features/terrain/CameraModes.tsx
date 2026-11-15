// Перемикач камер F2: Orbit / Top / POV. Стан — локальний (cameraStore), у useMission не пише.
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
  const off = site === null || !view3D;
  const walking = useWalk((w) => w.active);
  return (
    <>
      <div role="group" aria-label="Camera mode" className="terrain-cams">
        {CAMERA_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={!off && mode === m.id}
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
        {!off && mode === "free" && (
          <span className="ui-stub">
            WASD / arrows fly · Q / E down / up · Shift faster
          </span>
        )}
        {!off && mode === "pov" && (
          <span className="ui-stub">
            Eye height {EYE_HEIGHT_M} m — assumption
          </span>
        )}
        {site !== null && !view3D && (
          <span className="ui-stub">Camera modes need 3D</span>
        )}
      </div>
      {site !== null && <WalkControls />}
    </>
  );
}
