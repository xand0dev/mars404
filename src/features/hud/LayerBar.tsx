// F7: шари карти зверху, над картою — іконка + назва для кожного шару району.
// Той самий стан, що й у панелі Layers (F3): store `layers` / `toggleLayer`. Легенди й походження — у панелі Layers.
import type { LayerKind } from '../../contracts';
import { useMission } from '../../store/useMission';

/** Прості іконки за типом шару (24×24, контур). */
const ICON: Record<LayerKind, string> = {
  // гора з вершиною — рельєф
  terrain: 'M3 19 9.5 8l3.5 6 2.5-3.5L21 19z',
  // знімок з орбіти — об'єктив
  optical: 'M4 7h3l1.5-2h7L17 7h3v12H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  // термометр — тепловий ІЧ
  thermal: 'M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0zM12 9v8',
  // кут схилу
  slope: 'M3 19h18M3 19 19 7M12 19a7 7 0 0 0-2-4.5',
  // шлях ровера — точки маршруту
  mission: 'M4 18c4 0 4-6 8-6s4-6 8-6M4 18h.01M12 12h.01M20 6h.01',
};

export function LayerBar() {
  const region = useMission((s) => (s.site !== null && s.region?.id === s.site ? s.region : null));
  const flags = useMission((s) => s.layers);
  const toggleLayer = useMission((s) => s.toggleLayer);
  if (!region || region.layers.length === 0) return null;

  return (
    <div className="layerbar" role="toolbar" aria-label="Map layers">
      <span className="layerbar__label" aria-hidden="true">
        Layers
      </span>
      {region.layers.map((l) => {
        const on = flags[l.id] === true;
        return (
          <button key={l.id} type="button" className="layerbar__btn" aria-pressed={on} onClick={() => toggleLayer(l.id)}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path d={ICON[l.kind]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {l.name}
          </button>
        );
      })}
    </div>
  );
}
