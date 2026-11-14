// F7 заглушка (F0): показує лише те, що вже є в store.
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';

export function Hud() {
  const site = useMission((s) => s.site);
  const reach = useMission((s) => s.reach);
  const n = reach?.returnInS;
  return (
    <Panel title="HUD" featureId="F7" owner="Оля" mock>
      <p style={{ fontSize: '2rem', margin: 0 }}>Return in {n == null || !Number.isFinite(n) ? '—' : Math.floor(n / 60)} min</p>
      <div role="status">
        {site === null ? (
          <StatusNote level="info">Choose “Gale / Mount Sharp” in the Location panel.</StatusNote>
        ) : (
          <StatusNote level="info">Not assessed yet — F5 not implemented.</StatusNote>
        )}
      </div>
    </Panel>
  );
}
