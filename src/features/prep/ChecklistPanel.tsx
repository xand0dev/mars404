// Заглушка (F0) для чекліста перед виходом (SPEC §7.13). Власник — Настя (F6): правила з плану, setChecklist.
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';

export function ChecklistPanel() {
  const items = useMission((s) => s.checklist);
  return (
    <Panel title="Pre-EVA checklist" featureId="F6" owner="Настя" mock id="checklist">
      <StatusNote level="info">MOCK stub — {items.length} item(s). Built from the route with §7.13.</StatusNote>
    </Panel>
  );
}
