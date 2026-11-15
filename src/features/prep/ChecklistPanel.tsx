import { useEffect } from 'react';
import { useMission } from '../../store/useMission';
import { Panel, StatusNote } from '../../ui';
import { buildChecklist } from './checklist';
import './prep.css';

export function ChecklistPanel() {
  const plan = useMission((s) => s.plan);
  const targets = useMission((s) => s.targets);
  const selectedTargetIds = useMission((s) => s.selectedTargetIds);
  const photos = useMission((s) => s.photos);
  const items = useMission((s) => s.checklist);
  const setChecklist = useMission((s) => s.setChecklist);
  const toggleChecklistItem = useMission((s) => s.toggleChecklistItem);

  useEffect(() => {
    if (plan?.status !== 'ok') return;
    setChecklist(buildChecklist({ plan, targets, selectedTargetIds, photos, previous: useMission.getState().checklist }));
  }, [photos, plan, selectedTargetIds, setChecklist, targets]);

  const left = items.filter((item) => !item.done).length;

  return (
    <Panel title="Pre-EVA checklist" featureId="F6" owner="Настя" id="checklist">
      {plan?.status !== 'ok' ? <StatusNote level="pending" live="status">Build a valid route to prepare the checklist.</StatusNote> : null}
      {plan?.status === 'ok' ? (
        <>
          <StatusNote level="warn">20 min and 20° thresholds are assumption.</StatusNote>
          <StatusNote level={left === 0 ? 'ok' : 'warn'} live="status">
            {left === 0 ? `All ${items.length} checklist items checked.` : `${left} checklist item${left === 1 ? '' : 's'} not checked.`}
          </StatusNote>
          <ul className="prep-list">
            {items.map((item) => (
              <li key={item.id} className={`prep-item${item.done ? ' is-done' : ''}`}>
                <label className="prep-item__label">
                  <input type="checkbox" checked={item.done} onChange={() => toggleChecklistItem(item.id)} />
                  <span>{item.label}</span>
                </label>
                <p className="prep-item__reason">{item.reason}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Panel>
  );
}
