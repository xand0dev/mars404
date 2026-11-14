// Пульт EVA, половина F5: «Return in», статус словом, «What if» і шторка з деталями ресурсів біля нижнього краю планшета.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';

/** Стан і висота шторки — лише localStorage (store не змінюється); недоступне сховище — пульт розгорнутий. */
const DOCK_KEY = 'mars404.evaDock';
const HEIGHT_KEY = 'mars404.evaSheetH';
/** Скільки пікселів потягнути, щоб це був жест, а не тап (рукавиця тремтить). */
const DRAG_THRESHOLD_PX = 30;
/** Висота пульта без деталей, поки його не виміряно (jsdom, перший кадр). */
const PEEK_FALLBACK_PX = 76;
/** Ближче за це до висоти пульта — шторка повертається до пульта. */
const SNAP_TO_PEEK_PX = 48;
const MIN_SHEET_PX = 160;
/** Карта — головне: шторка не вище 80 % екрана. */
const MAX_SHEET_SHARE = 0.8;

export type DockState = 'collapsed' | 'open' | 'expanded';

function readState(): DockState {
  try {
    const saved = localStorage.getItem(DOCK_KEY);
    return saved === 'collapsed' || saved === 'expanded' ? saved : 'open';
  } catch {
    return 'open';
  }
}

function readHeight(): number {
  try {
    const saved = Number(localStorage.getItem(HEIGHT_KEY));
    if (Number.isFinite(saved) && saved >= MIN_SHEET_PX) return saved;
  } catch {
    // немає сховища — висота за замовчуванням
  }
  return Math.round(window.innerHeight * 0.45);
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // не зберегли — стан живе до перезавантаження
  }
}

export interface ResourceRow {
  key: string;
  label: string;
  /** Скільки є зараз, текстом з одиницями; null — невідомо. */
  now: string | null;
  route: string | null;
  after: string | null;
  status: { word: string; tone: string };
  /** Частки ліміту 0–1 для смуги витрати; null — смуги немає. */
  bar: { now: number; route: number; reserve: number } | null;
}

interface LifeDockProps {
  headline: string;
  status: { word: string; tone: string };
  limitedBy: { key: string; label: string } | null;
  scenarioOn: boolean;
  onScenario: () => void;
  onReset: () => void;
  rows: ResourceRow[];
  emergencyO2G: number;
}

export function LifeDock({ headline, status, limitedBy, scenarioOn, onScenario, onReset, rows, emergencyO2G }: LifeDockProps) {
  const [state, setState] = useState<DockState>(readState);
  const [height, setHeight] = useState(readHeight);
  const handleRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ startY: number; startH: number; from: DockState; moved: boolean } | null>(null);
  const peekH = useRef(PEEK_FALLBACK_PX);
  const suppressClick = useRef(false);

  // Атрибут і висота на <html>: половину F4 (Route controls) розміщує CSS, без обміну станом між фічами.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.evaDock = state;
    root.style.setProperty('--eva-sheet-h', `${height}px`);
    return () => {
      delete root.dataset.evaDock;
      root.style.removeProperty('--eva-sheet-h');
    };
  }, [state, height]);

  const go = (next: DockState) => {
    setState(next);
    save(DOCK_KEY, next);
  };

  // Жест як у шухляди: тягнеш ручку — шторка йде за пальцем; відпустив біля пульта — пульт, нижче пульта — згорнуто.
  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = handleRef.current?.getBoundingClientRect();
    if (state !== 'expanded' && rect && rect.height > 0) peekH.current = window.innerHeight - rect.bottom;
    drag.current = { startY: event.clientY, startH: state === 'expanded' ? height : peekH.current, from: state, moved: false };
    // Палець з'їжджає з ручки під час жесту — без захоплення pointermove / pointerup прийдуть іншому елементу.
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = event.clientY - d.startY;
    if (!d.moved && Math.abs(dy) <= DRAG_THRESHOLD_PX) return;
    d.moved = true;
    document.documentElement.dataset.evaDragging = 'true';
    const wanted = d.startH - dy;
    if (wanted > peekH.current + SNAP_TO_PEEK_PX) {
      setState('expanded');
      setHeight(Math.round(Math.min(window.innerHeight * MAX_SHEET_SHARE, Math.max(MIN_SHEET_PX, wanted))));
    } else if (d.from === 'expanded') {
      setState('open');
    }
  };
  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    delete document.documentElement.dataset.evaDragging;
    if (!d) return;
    onPointerMove(event);
    const dy = event.clientY - d.startY;
    if (!d.moved && Math.abs(dy) <= DRAG_THRESHOLD_PX) return;
    suppressClick.current = true;
    const wanted = d.startH - dy;
    if (wanted > peekH.current + SNAP_TO_PEEK_PX) {
      const next = Math.round(Math.min(window.innerHeight * MAX_SHEET_SHARE, Math.max(MIN_SHEET_PX, wanted)));
      setHeight(next);
      save(HEIGHT_KEY, String(next));
      go('expanded');
    } else {
      go(d.from === 'open' && dy > 0 ? 'collapsed' : 'open');
    }
  };
  // Тап (і Enter / Space) — «пульт ↔ деталі» на запам'ятованій висоті; жест уже оброблено в pointerup.
  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    go(state === 'expanded' ? 'open' : 'expanded');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      go(state === 'collapsed' ? 'open' : 'expanded');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      go(state === 'expanded' ? 'open' : 'collapsed');
    }
  };

  return createPortal(
    <>
      {/* Лише смужка-ручка без тексту: висоту обирає астронавт, карта лишається головним кадром. */}
      <button ref={handleRef} type="button" className="eva-sheet-handle" aria-expanded={state === 'expanded'} aria-label="Details"
        aria-describedby="eva-sheet-hint" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onClick={onClick} onKeyDown={onKeyDown}>
        <span className="eva-sheet-handle__grip" aria-hidden="true" />
      </button>
      <span id="eva-sheet-hint" hidden>Drag up to show details, drag down to hide. Arrow keys also work.</span>
      <section className="eva-dock eva-dock--life" aria-label="Life support controls">
        <section className="eva-dock__details" aria-label="Life support details">
          <ul className="eva-res">
            {rows.map((row) => (
              <li key={row.key} className="eva-res__row" aria-label={row.label} data-resource={row.key}>
                <span className="eva-res__name">{row.label}</span>
                <span className="eva-res__now">{row.now ?? 'no data'}</span>
                {row.bar && (
                  <span className="eva-res__bar" aria-hidden="true">
                    <span className="eva-res__fill" style={{ width: `${row.bar.now * 100}%` }} />
                    <span className="eva-res__route" style={{ left: `${Math.max(0, row.bar.now - row.bar.route) * 100}%`, width: `${Math.min(row.bar.route, row.bar.now) * 100}%` }} />
                    <span className="eva-res__reserve" style={{ left: `${row.bar.reserve * 100}%` }} />
                  </span>
                )}
                <span className="eva-res__plan">
                  {row.route && `route ${row.route}`}
                  {row.after && <strong>{row.after} after route</strong>}
                </span>
                <span className={`life-word life-word--${row.status.tone}`}>{row.status.word}</span>
              </li>
            ))}
          </ul>
          <p className="eva-res__note">Emergency O₂ {Math.round(emergencyO2G)} g kept for the way back</p>
        </section>
        <div className="eva-dock__controls">
          <p className="eva-dock__readout" aria-live="polite">
            <strong>{headline}</strong>
            <span>
              <span className={`life-word life-word--${status.tone}`}>{status.word}</span>
              {limitedBy && (
                <>
                  {' · limited by '}
                  <span className="eva-res-name" data-resource={limitedBy.key}>{limitedBy.label}</span>
                </>
              )}
            </span>
          </p>
          <div className="eva-dock__whatif" role="group" aria-label="What if">
            <button type="button" aria-label="O₂ −40% from dock" aria-pressed={scenarioOn} onClick={onScenario}>
              O₂ −40%
            </button>
            <button type="button" aria-label="Reset limits from dock" onClick={onReset}>
              Reset
            </button>
          </div>
          <button type="button" className="eva-dock__toggle" aria-expanded={state !== 'collapsed'} aria-label={state === 'collapsed' ? 'Expand controls' : 'Collapse controls'}
            onClick={() => go(state === 'collapsed' ? 'open' : 'collapsed')}>
            <span aria-hidden="true">{state === 'collapsed' ? '▴' : '▾'}</span>
          </button>
        </div>
      </section>
    </>,
    document.body,
  );
}
