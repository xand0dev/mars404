// F1 заглушка (F0): мінімальний вибір місця, щоб інші фічі могли працювати з Gale.
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';

export function SitePanel() {
  const site = useMission((s) => s.site);
  const setSite = useMission((s) => s.setSite);
  return (
    <Panel title="Location" featureId="F1" owner="Іван" mock>
      <button type="button" aria-pressed={site === 'gale'} onClick={() => setSite('gale')}>
        Gale / Mount Sharp
      </button>{' '}
      {site !== null && (
        <button type="button" onClick={() => setSite(null)}>
          Back to globe
        </button>
      )}
      <StatusNote level="info">MOCK stub — F1 not implemented yet.</StatusNote>
    </Panel>
  );
}
