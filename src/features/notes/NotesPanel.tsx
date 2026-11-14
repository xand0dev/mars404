// Заглушка (F0) для «живої карти» (SPEC §7.12). Власник — Іван (F1): список міток, збереження, експорт / імпорт JSON.
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';

export function NotesPanel() {
  const count = useMission((s) => s.annotations.length);
  return (
    <Panel title="Crew map notes" featureId="F1" owner="Іван" mock id="notes">
      <StatusNote level="info">MOCK stub — {count} mark(s). Add, export and import come with §7.12.</StatusNote>
    </Panel>
  );
}
