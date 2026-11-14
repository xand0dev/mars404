// F3 заглушка (F0).
import { Panel, StatusNote } from '../../ui';

export function LayersPanel() {
  return (
    <Panel title="Layers" featureId="F3" owner="Максим" mock>
      <StatusNote level="info">MOCK stub — terrain, optical, thermal, slope, traverse come with F3.</StatusNote>
    </Panel>
  );
}
