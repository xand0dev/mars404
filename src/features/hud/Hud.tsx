// F7: HUD — «Return in N min», статус, «Elapsed, s», заміна цілі. Числа лише показує (джерело — reach від F5).
import { useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMission } from '../../store/useMission';
import { EvaSign, Panel, STATUS_ICON, StatusNote, formatAmount } from '../../ui';
import { abortLine } from './abortLine';
import { GoNoGoPanel } from './GoNoGo';
import { useGoNoGo } from './useGoNoGo';
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
  const model = useMission((s) => s.model);
  const time = useMission((s) => s.time);
  const setTime = useMission((s) => s.setTime);
  const replaceTarget = useMission((s) => s.replaceTarget);
  const elapsedRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);

  const v = hudState(input);
  const abort = abortLine(input.reach?.abort ?? null, model);
  const gng = useGoNoGo();
  // Під час виходу NO-GO озвучує «Return to base now» (alert у GO / NO-GO); статус HUD тоді — status, щоб alert був один.
  const live = gng.during && gng.verdict === 'nogo' ? 'status' : v.live;

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
        <div className="hud__main">
        <p className="hud__return">
          Return in <strong>{v.minutes}</strong> min
        </p>
        <div className="hud__status">
          <StatusNote level={v.level} live={live}>
            <strong>{v.message}</strong> <span className="hud__next-label">Next:</span> <span className="hud__next">{v.next}</span>
          </StatusNote>
        </div>
        {abort && (
          <p className={`hud__abort hud__abort--${abort.kind}`}>
            {abort.kind === 'ponr' ? <EvaSign kind="ponr" size={22} /> : <span className="hud__abort-icon" aria-hidden="true">{STATUS_ICON.ok}</span>}
            <strong>{abort.text}</strong>
            <span className="hud__abort-reserve">
              {abort.emergency}
              {abort.assumption && <> · <span className="hud__assumption">assumption</span></>}
            </span>
          </p>
        )}
        {v.warnings.length > 0 && (
          <ul className="hud__warnings" aria-label="Model warnings">
            {v.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        </div>
        <div className="hud__side">
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
          {input.plan?.status === 'ok' && (
            <span className="hud__plan">
              {' '}· Plan {formatAmount(input.plan.totals.time, 's')} · {formatAmount(input.plan.totals.o2, 'g')} O₂
            </span>
          )}
        </p>
        </div>
        <GoNoGoPanel onStart={() => elapsedRef.current?.focus()} />
      </div>
    </Panel>
  );
}
