// F6 заглушка (F0): мінімальний список цілей, щоб F4/F5 мали waypoints.
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';

export function TargetsPanel() {
  const targets = useMission((s) => s.targets);
  const selected = useMission((s) => s.selectedTargetIds);
  const toggleTarget = useMission((s) => s.toggleTarget);
  return (
    <Panel title="Science targets" featureId="F6" owner="Настя" mock>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {targets.map((t) => (
          <li key={t.id}>
            <button type="button" aria-pressed={selected.includes(t.id)} onClick={() => toggleTarget(t.id)}>
              {selected.includes(t.id) ? 'Remove' : 'Add'} {t.name}
            </button>
          </li>
        ))}
      </ul>
      <StatusNote level="info">MOCK stub — real targets and photos come with F6.</StatusNote>
    </Panel>
  );
}
