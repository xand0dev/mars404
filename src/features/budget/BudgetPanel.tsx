// F5 заглушка (F0).
import { useMission } from '../../store/useMission';
import { Gauge, Panel, StatusNote } from '../../ui';

export function BudgetPanel() {
  const budget = useMission((s) => s.budget);
  const limits = useMission((s) => s.limits);
  return (
    <Panel title="Resources" featureId="F5" owner="Влад" mock>
      <Gauge label="Time" value={budget.time} max={limits.time} unit="s" />
      <Gauge label="O₂" value={budget.o2} max={limits.o2} unit="g" />
      <Gauge label="Energy" value={budget.energy} max={limits.energy} unit="Wh" />
      <Gauge label="Dose" value={budget.dose} max={limits.dose ?? 1} unit="µSv" />
      <StatusNote level="info">MOCK stub — reachability comes with F5.</StatusNote>
    </Panel>
  );
}
