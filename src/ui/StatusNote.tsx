import type { ReactNode } from 'react';

import { STATUS_ICON, type StatusLevel } from './statusLevel';

export interface StatusNoteProps {
  level: StatusLevel;
  children: ReactNode;
  /** live region: 'status' або 'alert' (для дефіциту) */
  live?: 'status' | 'alert';
}

/** Ризик іконкою і текстом, колір лише доповнює (SPEC §7.7). */
export function StatusNote({ level, children, live }: StatusNoteProps) {
  return (
    <p className={`ui-note ui-note--${level}`} role={live}>
      <span aria-hidden="true">{STATUS_ICON[level]}</span>
      <span>{children}</span>
    </p>
  );
}
