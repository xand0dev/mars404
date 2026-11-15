// Шари карти — іконками над картою (як у картографічних застосунках): одним дотиком увімкнути, і одразу видно,
// що показує шар (легенда під смугою). Ті самі прапорці, що й у панелі Layers (useMission.layers) — store не змінюється.
import type { Layer } from '../../contracts';
import { useMission } from '../../store/useMission';
import { useNavPlan, useNavView } from './navStore';

/** Іконки шарів (контур 24×24, від Олі, #151): форма, не лише колір (§7.7). Денний ІЧ — сонце, нічний — місяць. */
const ICON: Record<string, string> = {
  optical: 'M4 7h3l1.5-2h7L17 7h3v12H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  thermal: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  'thermal-day': 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',
  slope: 'M3 19h18M3 19 19 7M12 19a7 7 0 0 0-2-4.5',
  traverse: 'M4 18c4 0 4-6 8-6s4-6 8-6M4 18h.01M12 12h.01M20 6h.01',
  beacons: 'M12 3 6 21h12zM12 3v18M8.5 13h7',
};

function Icon({ id }: { id: string }) {
  return (
    <svg className="map-layers__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d={ICON[id] ?? 'M4 4h16v16H4z'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
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
      <div className="map-layers__bar" role="toolbar" aria-label="Map layers">
        {layers.map((l) => (
          <button key={l.id} type="button" className="map-layers__btn" aria-pressed={flags[l.id] === true} onClick={() => toggle(l.id)} title={`${l.name} — ${l.units}`}>
            <Icon id={l.id} />
            {SHORT[l.id] ?? l.name}
          </button>
        ))}
        {nav && (
          <button type="button" className="map-layers__btn" aria-pressed={show} onClick={() => setShow(!show)} title="Navigation beacons and inertial drift">
            <Icon id="beacons" />
            Beacons
          </button>
        )}
      </div>
      {active && <Legend layer={active} />}
    </div>
  );
}
