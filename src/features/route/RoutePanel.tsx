// F4 заглушка (F0).
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';

export function RoutePanel() {
  const waypoints = useMission((s) => s.waypoints);
  return (
    <Panel title="Route" featureId="F4" owner="Влад" mock>
      <button type="button" disabled>Build route</button>
      <StatusNote level="info">MOCK stub — {waypoints.length} waypoint(s) selected; A* comes with F4.</StatusNote>
    </Panel>
  );
}
// контроль: чужа папка
