// F7: застосунок на весь екран. Шапка з кроками демо; ліворуч — підготовка виходу (Location → Layers → Targets → Route),
// у центрі — карта, праворуч — стан місії (HUD, Resources, Pre-EVA checklist, Crew map notes).
// Колонки прокручуються самі, сторінка — ні (≥ 1200 px). Вужче — одна колонка: HUD → карта → план → стан.
// Панелі в колонках згортаються; відкриті ті, що потрібні для наступного кроку (T24).
// Glove mode (F7-AC9, SPEC §7.14): лише HUD і карта, решта — у «More panels».
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { SITE_LABEL } from '../../contracts';
import { useMission } from '../../store/useMission';
import { PanelGroupContext, type PanelGroup } from '../../ui';
import { GloveContext, readGlove, writeGlove } from './glove';
import { Onboarding } from './Onboarding';
import { readOnboarded, writeOnboarded } from './onboardingStore';
import { STEPS, isPanelOpen, panelStep, togglePanel, type PanelOverrides } from './panelStep';

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

  return (
    <GloveContext.Provider value={glove}>
      <div className={`shell shell--step-${step}${glove ? ' shell--glove' : ''}`}>
        <header className="shell__bar">
          <div className="shell__brand">
            <h1 className="shell__title">MARS::404 · {site ? SITE_LABEL[site] : 'Mars'} EVA planner</h1>
            <p className="shell__disclaimer">Demonstration model, not certified navigation.</p>
          </div>
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
          <details className="shell__more">
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
    </GloveContext.Provider>
  );
}
