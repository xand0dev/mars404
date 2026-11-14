// F7 заглушка (F0): адаптивна сітка зі слотами. Від 400 px — одна колонка.
import type { ReactNode } from 'react';

export interface ShellProps {
  hud: ReactNode;
  map: ReactNode;
  side: ReactNode;
  bottom?: ReactNode;
}

export function Shell({ hud, map, side, bottom }: ShellProps) {
  return (
    <div className="shell">
      <header className="shell__top">
        <h1 className="shell__title">MARS::404 · Gale EVA planner</h1>
        <p className="shell__disclaimer">Demonstration model, not certified navigation.</p>
      </header>
      <div className="shell__hud">{hud}</div>
      <main className="shell__map">{map}</main>
      <aside className="shell__side">{side}</aside>
      {bottom && <div className="shell__bottom">{bottom}</div>}
    </div>
  );
}
