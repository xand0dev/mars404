// F7: застосунок на весь екран. Шапка з кроками демо; ліворуч — підготовка виходу (Location → Layers → Targets → Route),
// у центрі — шари карти (іконки зверху) і карта, праворуч — стан місії (HUD, Resources, Pre-EVA checklist, Crew map notes).
// Колонки прокручуються самі, сторінка — ні (≥ 1200 px). Вужче — одна колонка: HUD → карта → план → стан.
// Панелі в колонках згортаються; відкриті ті, що потрібні для наступного кроку (T24).
// Glove mode (F7-AC9, SPEC §7.14): лише HUD і карта, решта — у «More panels».
// На десктопі glove mode — це планшет на зап'ясті: той самий екран у корпусі по центру (tablet.css); на сенсорних — на весь екран.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SITE_LABEL } from '../../contracts';
import { regionKind } from '../../contracts/planning';
import { useMission } from '../../store/useMission';
import { PanelGroupContext, type PanelGroup } from '../../ui';
import { GloveContext, readGlove, writeGlove } from './glove';
import { Onboarding } from './Onboarding';
import { readOnboarded, writeOnboarded } from './onboardingStore';
import { STEPS, isPanelOpen, panelStep, togglePanel, type PanelOverrides } from './panelStep';
import './tablet.css';

export interface ShellProps {
  hud: ReactNode;
  map: ReactNode;
  /** Підготовка виходу: Location, Layers, Science targets, Route. */
  side: ReactNode;
  /** Стан місії під HUD: Resources, Pre-EVA checklist, Crew map notes. */
  status?: ReactNode;
}

export function Shell({ hud, map, side, status }: ShellProps) {
  const [glove, setGlove] = useState(readGlove);
  const toggle = () => {
    const next = !glove;
    setGlove(next);
    writeGlove(next);
  };

  // Перший візит — підказка «як це працює»; потім її відкриває кнопка в шапці.
  const [help, setHelp] = useState(() => !readOnboarded());
  const closeHelp = useCallback(() => {
    setHelp(false);
    writeOnboarded();
  }, []);

  const site = useMission((s) => s.site);
  const overview = useMission((s) => s.site !== null && s.region?.id === s.site && regionKind(s.region) === 'overview');
  const step = useMission((s) => panelStep(s));
  const [overrides, setOverrides] = useState<PanelOverrides>({
    step,
    open: {},
  });
  const group = useMemo<PanelGroup>(
    () => ({
      isOpen: (title) => isPanelOpen(step, overrides, title),
      toggle: (title) => setOverrides((ov) => togglePanel(step, ov, title)),
    }),
    [step, overrides],
  );
  const current = STEPS.findIndex((s) => s.id === step);
  const clock = useClock(glove);

  // Згортаються лише панелі колонок; HUD і карта — ні.
  const plan = (
    <PanelGroupContext.Provider value={group}>
      <aside className="shell__side" aria-label="Mission planning">
        {side}
      </aside>
    </PanelGroupContext.Provider>
  );
  const rest = status && (
    <PanelGroupContext.Provider value={group}>
      <aside className="shell__status" aria-label="Mission status">
        {status}
      </aside>
    </PanelGroupContext.Provider>
  );

  const shell = (
      <div className={`shell shell--step-${step}${glove ? ' shell--glove' : ''}${overview ? ' shell--overview' : ''}`}>
        <header className="shell__bar">
          <div className="shell__brand">
            <h1 className="shell__title">
              MARS::404 · {site ? SITE_LABEL[site] : 'Mars'} {overview ? 'terrain overview' : 'EVA planner'}
            </h1>
            <p className="shell__disclaimer">Demonstration model, not certified navigation.</p>
          </div>
          {glove && (
            <p className="shell__clock" aria-label={`Local time ${clock}`}>
              {clock}
            </p>
          )}
          <ol className="shell__steps" aria-label="Demo steps">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                className={`shell__step${i < current ? ' is-done' : ''}${i === current ? ' is-current' : ''}`}
                aria-current={i === current ? 'step' : undefined}
              >
                <span className="shell__step-n" aria-hidden="true">
                  {i < current ? '✔' : i + 1}
                </span>
                {s.label}
              </li>
            ))}
          </ol>
          <button type="button" className="shell__help" aria-expanded={help} onClick={() => (help ? closeHelp() : setHelp(true))}>
            How it works
          </button>
          <button type="button" className="shell__glove" aria-pressed={glove} onClick={toggle}>
            Glove mode
          </button>
        </header>
        <div className="shell__hud">{hud}</div>
        <main className="shell__map">
          {help && <Onboarding step={step} onClose={closeHelp} />}
          {map}
        </main>
        {glove ? (
          // На кроці вибору району HUD порожній, тож список локацій відкритий одразу (на сенсорному планшеті закрита шухляда під картою — глухий кут).
          <details className="shell__more" key={step} open={step === 'site' || undefined}>
            <summary>More panels</summary>
            <div className="shell__more-body">
              {plan}
              {rest}
            </div>
          </details>
        ) : (
          <>
            {plan}
            {rest}
          </>
        )}
      </div>
  );

  return (
    <GloveContext.Provider value={glove}>
      {glove ? (
        <div className="tablet">
          <div className="tablet__bezel">
            {/* Фізичний корпус (лише декор): бампери з гвинтами, кріплення ремінця, кнопки, камера, маркування. */}
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <span key={c} className={`tablet__bump tablet__bump--${c}`} aria-hidden="true" />
            ))}
            <span className="tablet__lug tablet__lug--l" aria-hidden="true" />
            <span className="tablet__lug tablet__lug--r" aria-hidden="true" />
            <span className="tablet__key tablet__key--1" aria-hidden="true" />
            <span className="tablet__key tablet__key--2" aria-hidden="true" />
            <span className="tablet__cam" aria-hidden="true" />
            <span className="tablet__mark" aria-hidden="true">
              EVA-PAD · MARS::404
            </span>
            <div className="tablet__screen">{shell}</div>
          </div>
        </div>
      ) : (
        shell
      )}
    </GloveContext.Provider>
  );
}

/** Годинник у шапці планшета (HH:MM), оновлюється раз на 20 с; поза режимом не тікає. */
function useClock(on: boolean): string {
  const fmt = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const [now, setNow] = useState(fmt);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setNow(fmt()), 20_000);
    return () => clearInterval(id);
  }, [on]);
  return now;
}
