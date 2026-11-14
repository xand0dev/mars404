// F7: HUD — «Return in N min», статус, «Elapsed, s», заміна цілі. Числа лише показує (джерело — reach від F5).
import { useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMission } from '../../store/useMission';
import { Panel, StatusNote, formatAmount } from '../../ui';
import { hudState } from './hudState';

export function Hud() {
  const input = useMission(
    useShallow((s) => ({
      site: s.site,
      region: s.region,
      targets: s.targets,
      selectedTargetIds: s.selectedTargetIds,
      plan: s.plan,
      reach: s.reach,
      budget: s.budget,
    })),
  );
  const time = useMission((s) => s.time);
  const setTime = useMission((s) => s.setTime);
  const replaceTarget = useMission((s) => s.replaceTarget);
  const elapsedRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);

  const v = hudState(input);

  const onElapsed = (raw: string) => {
    setDraft(raw);
    const n = Number(raw);
    if (raw.trim() !== '' && Number.isFinite(n) && n >= 0) setTime(n);
  };

  const onReplace = () => {
    if (!v.swap) return;
    replaceTarget(v.swap.dropId, v.swap.addId);
    elapsedRef.current?.focus();
  };

  return (
    <Panel title="HUD" featureId="F7" owner="Оля" mock={v.mock}>
      <div className="hud">
        <p className="hud__return">
          Return in <strong>{v.minutes}</strong> min
        </p>
        <div className="hud__status">
          <StatusNote level={v.level} live={v.live}>
            <strong>{v.message}</strong> <span className="hud__next-label">Next:</span> <span className="hud__next">{v.next}</span>
          </StatusNote>
        </div>
        <div className="hud__controls">
          <label className="hud__elapsed">
            <span>Elapsed, s</span>
            <input
              ref={elapsedRef}
              type="number"
              min={0}
              step={60}
              inputMode="numeric"
              value={draft ?? String(time)}
              onChange={(e) => onElapsed(e.target.value)}
              onBlur={() => setDraft(null)}
            />
          </label>
          {v.swap && (
            <button type="button" className="hud__swap" onClick={onReplace}>
              Replace {v.swap.dropName} with {v.swap.addName}
            </button>
          )}
        </div>
        <p className="hud__left">
          Time left {formatAmount(input.budget.time, 's')} · O₂ left {formatAmount(input.budget.o2, 'g')}
        </p>
      </div>
    </Panel>
  );
}
