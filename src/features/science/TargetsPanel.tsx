import { useState } from 'react';
import type { PlanningGrid, ReachabilityResult, Target } from '../../contracts';
import { xyToCell } from '../../contracts/planning';
import { useMission } from '../../store/useMission';
import { EvaSign, ItemRow, Panel, type EvaTargetState } from '../../ui';
import { TargetCard } from './TargetCard';

const accuracyLabel = {
  verified: 'verified',
  approximate: 'approximate',
  mock: 'MOCK',
} as const;

function AccuracyBadge({ accuracy }: { accuracy: keyof typeof accuracyLabel }) {
  const label = accuracyLabel[accuracy];
  return (
    <span
      className={`ui-badge ui-badge--${accuracy === 'approximate' ? 'assumption' : accuracy}`}
      aria-label={`Accuracy: ${label}`}
    >
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

type TargetReachState = 'inside' | 'outside' | 'not-assessed';

function targetReachState(target: Target, grid: PlanningGrid, reach: ReachabilityResult | null): TargetReachState {
  if (!reach || reach.status === 'invalid' || reach.mask.length !== grid.width * grid.height) return 'not-assessed';
  const cell = xyToCell(grid, target.coordinates);
  if (!cell) return 'outside';
  return reach.mask[cell.index] === 1 ? 'inside' : 'outside';
}

function targetSignState(selected: boolean, reachState: TargetReachState): EvaTargetState {
  if (reachState === 'outside') return 'outside';
  return selected ? 'selected' : 'unselected';
}

export function TargetsPanel() {
  const targets = useMission((s) => s.targets);
  const selected = useMission((s) => s.selectedTargetIds);
  const reach = useMission((s) => s.reach);
  const grid = useMission((s) => s.grid);
  const toggleTarget = useMission((s) => s.toggleTarget);
  const [openTargetId, setOpenTargetId] = useState<string | null>(null);
  const openTarget = targets.find((target) => target.id === openTargetId) ?? null;
  const openReachState = openTarget ? targetReachState(openTarget, grid, reach) : null;

  return (
    <Panel title="Science targets" featureId="F6" owner="Настя" mock={targets.some((target) => target.status === 'mock')}>
      <ul className="ui-list">
        {targets.map((target) => {
          const isSelected = selected.includes(target.id);
          const reachState = targetReachState(target, grid, reach);
          return (
            <ItemRow
              key={target.id}
              sign={<EvaSign kind="target" state={targetSignState(isSelected, reachState)} label="" />}
              title={
                <button
                  type="button"
                  className="ui-btn--ghost"
                  aria-label={`Open ${target.name}`}
                  aria-expanded={openTargetId === target.id}
                  aria-controls={`science-target-${target.id}`}
                  onClick={() => setOpenTargetId(target.id)}
                >
                  {target.name}
                </button>
              }
              meta={<AccuracyBadge accuracy={target.locationAccuracy} />}
              actions={
                <button
                  type="button"
                  className={isSelected ? undefined : 'ui-btn--primary'}
                  aria-pressed={isSelected}
                  onClick={() => toggleTarget(target.id)}
                >
                  {isSelected ? 'Remove' : 'Add'} {target.name}
                </button>
              }
            />
          );
        })}
      </ul>
      {openTarget ? (
        <div id={`science-target-${openTarget.id}`}>
          <TargetCard
            key={openTarget.id}
            target={openTarget}
            selected={selected.includes(openTarget.id)}
            onToggle={toggleTarget}
            reachWarning={openReachState === 'outside' ? 'Target is outside the current return envelope.' : undefined}
            reachNote={openReachState === 'not-assessed' ? 'Reachability not assessed.' : undefined}
          />
        </div>
      ) : null}
    </Panel>
  );
}
