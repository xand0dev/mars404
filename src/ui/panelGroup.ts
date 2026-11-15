// Група панелей, що згортаються (права колонка Shell). Поза групою Panel не згортається.
import { createContext, useContext } from 'react';

export interface PanelGroup {
  /** Чи розгорнута панель із цим заголовком. */
  isOpen: (title: string) => boolean;
  toggle: (title: string) => void;
}

export const PanelGroupContext = createContext<PanelGroup | null>(null);

export function usePanelGroup(): PanelGroup | null {
  return useContext(PanelGroupContext);
}
