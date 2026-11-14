// F7-AC7: GO / NO-GO у HUD (SPEC §7.10). Лише показує evaluateGoNoGo; нічого не рахує.
import { useEffect, useRef, useState } from 'react';
import type { Call, Fix, StationCall } from '../../contracts/gonogo';
import { useMission } from '../../store/useMission';
import { STATUS_ICON, type StatusLevel } from '../../ui';
import { useGlove } from './glove';
import { useGoNoGo } from './useGoNoGo';

/** Утримування для підтвердження CAUTION (SPEC §7.10). */
export const HOLD_MS = 1500;

const CALL_WORD: Record<Call, string> = { go: 'GO', caution: 'CAUTION', nogo: 'NO-GO', hold: 'HOLD' };
const CALL_LEVEL: Record<Call, StatusLevel> = { go: 'ok', caution: 'warn', nogo: 'danger', hold: 'pending' };
const VERDICT_TEXT: Record<Call, string> = { go: 'GO · within model', caution: 'GO · CAUTION', nogo: 'NO-GO', hold: 'HOLD' };

interface Confirmation {
  at: string;
  verdict: Call;
  cautions: string[];
}

export interface GoNoGoPanelProps {
  /** Викликається після «Start EVA» або підтвердженого утримування (HUD переводить фокус на «Elapsed»). */
  onStart?: () => void;
  /** Викликається після «Replace» / «Remove» у станції: кнопка зникає, HUD переводить фокус на «Elapsed» (F7-AC5). */
  onFix?: () => void;
}

export function GoNoGoPanel({ onStart, onFix }: GoNoGoPanelProps) {
  const g = useGoNoGo();
  const glove = useGlove();
  const targets = useMission((s) => s.targets);
  const [record, setRecord] = useState<Confirmation | null>(null);
  const name = (id: string) => targets.find((t) => t.id === id)?.name ?? id;

  const confirm = () => {
    setRecord({
      at: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      verdict: g.verdict,
      cautions: g.stations.filter((s) => s.call === 'caution').map((s) => s.id),
    });
    onStart?.();
  };

  const before = !g.during;
  const stations = (
    <ul className="gonogo__stations" aria-label="Station calls">
      {g.stations.map((s) => (
        <Station key={s.id} s={s} name={name} onFix={onFix} />
      ))}
    </ul>
  );
  const firstHold = g.stations.find((s) => s.call === 'hold');

  return (
    <>
    <section className="gonogo" aria-labelledby="gonogo-title">
      <div className="gonogo__head">
        <h3 id="gonogo-title" className="gonogo__title">GO / NO-GO</h3>
        <p className={`gonogo__verdict gonogo__verdict--${g.verdict}`} data-testid="gonogo-verdict" role="status">
          <span aria-hidden="true">{STATUS_ICON[CALL_LEVEL[g.verdict]]}</span> {VERDICT_TEXT[g.verdict]}
        </p>
      </div>

      {g.during && g.verdict === 'nogo' && (
        <p className="ui-note ui-note--deficit gonogo__return" role="alert">
          <span aria-hidden="true">{STATUS_ICON.deficit}</span>
          <span>
            <strong>Return to base now</strong> — a station is NO-GO during the EVA.
          </span>
        </p>
      )}

      {before && !record && (
        <div className="gonogo__start">
          {g.verdict === 'go' && (
            <button type="button" className="gonogo__btn" onClick={confirm}>
              Start EVA
            </button>
          )}
          {g.verdict === 'caution' && <HoldButton onConfirm={confirm} />}
          {g.verdict === 'nogo' && <p className="gonogo__hint">EVA start blocked — fix the NO-GO stations below.</p>}
          {g.verdict === 'hold' && firstHold && (
            <p className="gonogo__hint">Next: {fixText(firstHold.fix) ?? firstHold.reason}</p>
          )}
        </div>
      )}

      {record && (
        <p className="gonogo__record">
          Confirmed {record.at} · {VERDICT_TEXT[record.verdict]}
          {record.cautions.length > 0 && <> · CAUTION accepted: {record.cautions.join(', ')}</>} · <span className="gonogo__muted">not saved</span>
        </p>
      )}

    </section>
    {/* Станції — окремою зоною під смугою HUD (T27): чипи «код · іконка · слово», деталі по кліку. */}
    <div className="gonogo-stations">
      {glove ? (
        <details className="gonogo__more">
          <summary>Stations ({g.stations.length})</summary>
          {stations}
        </details>
      ) : (
        stations
      )}
    </div>
    </>
  );
}

function fixText(fix: Fix | undefined): string | null {
  switch (fix?.kind) {
    case 'choose-site':
      return 'Choose “Gale / Mount Sharp”';
    case 'select-targets':
      return 'Select science targets';
    case 'build-route':
      return 'Press “Build route”';
    case 'return-now':
      return 'Return to base now';
    case 'open-checklist':
      return 'Open the pre-EVA checklist';
    default:
      return null;
  }
}

function Station({ s, name, onFix }: { s: StationCall; name: (id: string) => string; onFix?: () => void }) {
  const replaceTarget = useMission((m) => m.replaceTarget);
  const toggleTarget = useMission((m) => m.toggleTarget);
  const text = fixText(s.fix);
  const word = CALL_WORD[s.call];
  const actionable = s.call === 'nogo' || s.fix?.kind === 'replace-target' || s.fix?.kind === 'remove-target';
  // Ручний вибір живе, доки не зміниться виклик станції (тоді знову за замовчуванням).
  const [manual, setManual] = useState<{ key: string; open: boolean } | null>(null);
  const key = `${s.call}|${s.fix?.kind ?? ''}`;
  const open = manual?.key === key ? manual.open : actionable;
  const detailId = `gonogo-detail-${s.id}`;
  return (
    <li
      className={`gonogo__station gonogo__station--${s.call}${open ? ' is-open' : ''}`}
      data-station={s.id}
      aria-label={`${s.id}: ${word} — ${s.reason}`}
    >
      <button type="button" className="gonogo__chip" aria-expanded={open} aria-controls={detailId} onClick={() => setManual({ key, open: !open })}>
        <span className="gonogo__id">{s.id}</span>{' '}
        <span className="gonogo__call">
          <span aria-hidden="true">{STATUS_ICON[CALL_LEVEL[s.call]]}</span> {word}
        </span>
      </button>
      <span className="gonogo__detail" id={detailId}>
      <span className="gonogo__reason">{s.reason}</span>
      {text && <span className="gonogo__fix">{text}</span>}
      {s.fix?.kind === 'replace-target' && (
        <button
          type="button"
          className="gonogo__fixbtn"
          aria-label={`${s.id} fix: Replace ${name(s.fix.dropId)} with ${name(s.fix.addId)}`}
          onClick={() => {
            if (s.fix?.kind !== 'replace-target') return;
            replaceTarget(s.fix.dropId, s.fix.addId);
            onFix?.();
          }}
        >
          Replace {name(s.fix.dropId)} with {name(s.fix.addId)}
        </button>
      )}
      {s.fix?.kind === 'remove-target' && (
        <button
          type="button"
          className="gonogo__fixbtn"
          aria-label={`${s.id} fix: Remove ${name(s.fix.targetId)}`}
          onClick={() => {
            if (s.fix?.kind !== 'remove-target') return;
            toggleTarget(s.fix.targetId);
            onFix?.();
          }}
        >
          Remove {name(s.fix.targetId)}
        </button>
      )}
      </span>
    </li>
  );
}

/** Підтвердження CAUTION утримуванням 1,5 с: миша / дотик і Space / Enter. Відпустив раніше — скасовано. */
function HoldButton({ onConfirm }: { onConfirm: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  const start = () => {
    if (timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onConfirm();
    }, HOLD_MS);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const isKey = (k: string) => k === ' ' || k === 'Enter';
  return (
    <>
      <button
        type="button"
        className={`gonogo__btn gonogo__hold${holding ? ' is-holding' : ''}`}
        aria-describedby="gonogo-hold-hint"
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onKeyDown={(e) => {
          if (!isKey(e.key)) return;
          e.preventDefault();
          if (!e.repeat) start();
        }}
        onKeyUp={(e) => {
          if (!isKey(e.key)) return;
          e.preventDefault();
          cancel();
        }}
        onBlur={cancel}
      >
        <span className="gonogo__fill" aria-hidden="true" />
        <span className="gonogo__label">Hold to confirm EVA start (1.5 s)</span>
      </button>
      <span id="gonogo-hold-hint" className="gonogo__hint">
        Hold 1.5 s to accept CAUTION.
      </span>
    </>
  );
}
