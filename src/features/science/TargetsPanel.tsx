import { useState } from 'react';
import { useMission } from '../../store/useMission';
import { Panel } from '../../ui';
import { TargetCard } from './TargetCard';

const accuracyLabel = {
  verified: 'verified',
  approximate: 'approximate',
  mock: 'MOCK',
} as const;

function AccuracyBadge({ accuracy }: { accuracy: keyof typeof accuracyLabel }) {
  const label = accuracyLabel[accuracy];
  return (
    <span aria-label={`Accuracy: ${label}`}>
      {accuracy === 'mock' ? (
        <>
          <span>M</span>
          <span>OCK</span>
        </>
      ) : (
        label
      )}
    </span>
  );
}

export function TargetsPanel() {
  const targets = useMission((s) => s.targets);
  const selected = useMission((s) => s.selectedTargetIds);
  const reach = useMission((s) => s.reach);
  const toggleTarget = useMission((s) => s.toggleTarget);
  const [openTargetId, setOpenTargetId] = useState<string | null>(null);
  const openTarget = targets.find((target) => target.id === openTargetId) ?? null;
  const reachWarning =
    openTarget && reach?.swap?.dropId === openTarget.id
      ? (reach.warnings[0] ?? 'Target is outside the current return envelope.')
      : undefined;

  return (
    <Panel title="Science targets" featureId="F6" owner="Настя" mock>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {targets.map((target) => (
          <li key={target.id}>
            <button
              type="button"
              aria-expanded={openTargetId === target.id}
              aria-controls={`science-target-${target.id}`}
              onClick={() => setOpenTargetId(target.id)}
            >
              Open {target.name}
            </button>
            <AccuracyBadge accuracy={target.locationAccuracy} />
            <button type="button" aria-pressed={selected.includes(target.id)} onClick={() => toggleTarget(target.id)}>
              {selected.includes(target.id) ? 'Remove' : 'Add'} {target.name}
            </button>
          </li>
        ))}
      </ul>
      {openTarget ? (
        <div id={`science-target-${openTarget.id}`}>
          <TargetCard
            key={openTarget.id}
            target={openTarget}
            selected={selected.includes(openTarget.id)}
            onToggle={toggleTarget}
            reachWarning={reachWarning}
          />
        </div>
      ) : null}
    </Panel>
  );
}
