// F7: пульт місії (T25). Зверху — смуга HUD (sticky на десктопі), карта — головна площа, праворуч — панелі,
// що згортаються (відкрита та, що потрібна для наступного кроку, T24), під картою — Route і Resources.
// Glove mode (F7-AC9, SPEC §7.14): лише HUD і карта, решта — у «More panels».
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useMission } from '../../store/useMission';
import { PanelGroupContext, type PanelGroup } from '../../ui';
import { GloveContext, readGlove, writeGlove } from './glove';
import { isPanelOpen, panelStep, togglePanel, type PanelOverrides } from './panelStep';

export interface ShellProps {
  hud: ReactNode;
  map: ReactNode;
  side: ReactNode;
  bottom?: ReactNode;
}

export function Shell({ hud, map, side, bottom }: ShellProps) {
  const [glove, setGlove] = useState(readGlove);
  const toggle = () => {
    const next = !glove;
    setGlove(next);
    writeGlove(next);
  };

  const step = useMission((s) => panelStep(s));
  const [overrides, setOverrides] = useState<PanelOverrides>({ step, open: {} });
  const group = useMemo<PanelGroup>(
    () => ({
      isOpen: (title) => isPanelOpen(step, overrides, title),
      toggle: (title) => setOverrides((ov) => togglePanel(step, ov, title)),
    }),
    [step, overrides],
  );

  // Висота sticky-смуги → --topbar-h: від неї рахуються висота карти й правої колонки.
  const topRef = useRef<HTMLDivElement>(null);
  const [topH, setTopH] = useState(0);
  useLayoutEffect(() => {
    const el = topRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setTopH(Math.round(el.getBoundingClientRect().height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sidePanels = (
    <PanelGroupContext.Provider value={group}>
      <aside className="shell__side" aria-label="Mission panels">
        {side}
      </aside>
    </PanelGroupContext.Provider>
  );
  const bottomPanels = bottom && <div className="shell__bottom">{bottom}</div>;

  return (
    <GloveContext.Provider value={glove}>
      <div className={`shell${glove ? ' shell--glove' : ''}`} style={{ '--topbar-h': `${topH}px` } as CSSProperties}>
        <div className="shell__top" ref={topRef}>
          <header className="shell__bar">
            <div className="shell__brand">
              <h1 className="shell__title">MARS::404 · Gale EVA planner</h1>
              <p className="shell__disclaimer">Demonstration model, not certified navigation.</p>
            </div>
            <button type="button" className="shell__glove" aria-pressed={glove} onClick={toggle}>
              Glove mode
            </button>
          </header>
          <div className="shell__hud">{hud}</div>
        </div>
        <main className="shell__map">{map}</main>
        {glove ? (
          <details className="shell__more">
            <summary>More panels</summary>
            <div className="shell__more-body">
              {sidePanels}
              {bottomPanels}
            </div>
          </details>
        ) : (
          <>
            {sidePanels}
            {bottomPanels}
          </>
        )}
      </div>
    </GloveContext.Provider>
  );
}
