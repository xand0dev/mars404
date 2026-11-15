// Шари карти — іконками над картою (як у картографічних застосунках): одним дотиком увімкнути, і одразу видно,
// що показує шар (легенда під смугою). Ті самі прапорці, що й у панелі Layers (useMission.layers) — store не змінюється.
import type { Layer } from '../../contracts';
import { useMission } from '../../store/useMission';
import { useNavPlan, useNavView } from './navStore';

/** Іконка — форма, не лише колір (§7.7). */
const ICON: Record<string, string> = { optical: '◐', thermal: '☾', 'thermal-day': '☀', slope: '◢', traverse: '⤳' };
const SHORT: Record<string, string> = { optical: 'Photo', thermal: 'Night IR', 'thermal-day': 'Day IR', slope: 'Slope', traverse: 'Rover path' };

/** Підпис зупинки легенди коротко: до першої « · » або дужки (повний текст — у title). */
const short = (label: string | undefined) => (label ?? '').split(/ · | \(/)[0];

function Legend({ layer }: { layer: Layer }) {
  const stops = layer.legend;
  if (stops.length === 0) return null;
  const gradient = stops.length > 1 ? `linear-gradient(90deg, ${stops.map((s) => s.color).join(', ')})` : stops[0]?.color;
  const res = layer.nativeResolutionM ? ` · ${layer.nativeResolutionM < 1 ? `${layer.nativeResolutionM * 100} cm` : `${layer.nativeResolutionM} m`} native` : '';
  return (
    <p className="map-layers__legend">
      <span className="map-layers__legend-name">{layer.name}</span>
      <span className="map-layers__ramp" style={{ background: gradient }} aria-hidden="true" />
      <span className="map-layers__legend-ends" title={stops.map((s) => s.label).join(' · ')}>
        {short(stops[0]?.label)}
        {stops.length > 1 ? ` → ${short(stops[stops.length - 1]?.label)}` : ''}
        {res}
      </span>
    </p>
  );
}

export function MapLayerBar() {
  const region = useMission((s) => s.region);
  const flags = useMission((s) => s.layers);
  const toggle = useMission((s) => s.toggleLayer);
  const nav = useNavPlan();
  const { show, setShow } = useNavView();
  if (!region) return null;
  const layers = region.layers.filter((l) => l.id !== 'terrain');
  const active = [...layers].reverse().find((l) => flags[l.id] === true) ?? null;
  return (
    <div className="map-layers">
      <div className="map-layers__bar" role="group" aria-label="Map layers">
        {layers.map((l) => (
          <button key={l.id} type="button" className="map-layers__btn" aria-pressed={flags[l.id] === true} onClick={() => toggle(l.id)} title={`${l.name} — ${l.units}`}>
            <span className="map-layers__icon" aria-hidden="true">
              {ICON[l.id] ?? '▦'}
            </span>
            {SHORT[l.id] ?? l.name}
          </button>
        ))}
        {nav && (
          <button type="button" className="map-layers__btn" aria-pressed={show} onClick={() => setShow(!show)} title="Navigation beacons and inertial drift">
            <span className="map-layers__icon" aria-hidden="true">
              ▲
            </span>
            Beacons
          </button>
        )}
      </div>
      {active && <Legend layer={active} />}
    </div>
  );
}
