// F7: адаптивна сітка зі слотами (від 400 px — одна колонка) і перемикач Glove mode (F7-AC9, SPEC §7.14).
import { useState, type ReactNode } from 'react';
import { GloveContext, readGlove, writeGlove } from './glove';

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

  return (
    <GloveContext.Provider value={glove}>
      <div className={`shell${glove ? ' shell--glove' : ''}`}>
        <header className="shell__top">
          <div className="shell__brand">
            <h1 className="shell__title">MARS::404 · Gale EVA planner</h1>
            <p className="shell__disclaimer">Demonstration model, not certified navigation.</p>
          </div>
          <button type="button" className="shell__glove" aria-pressed={glove} onClick={toggle}>
            Glove mode
          </button>
        </header>
        <div className="shell__hud">{hud}</div>
        <main className="shell__map">{map}</main>
        {glove ? (
          <details className="shell__more">
            <summary>More panels</summary>
            <div className="shell__more-body">
              <aside className="shell__side">{side}</aside>
              {bottom && <div className="shell__bottom">{bottom}</div>}
            </div>
          </details>
        ) : (
          <>
            <aside className="shell__side">{side}</aside>
            {bottom && <div className="shell__bottom">{bottom}</div>}
          </>
        )}
      </div>
    </GloveContext.Provider>
  );
}
