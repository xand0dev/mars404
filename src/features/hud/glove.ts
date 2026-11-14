// F7-AC9 (SPEC §7.14): режим рукавиць. Стан — лише localStorage (store не змінюється).
import { createContext, useContext } from 'react';

export const GLOVE_KEY = 'mars404.gloveMode';

/** Сховище може бути недоступне (приватне вікно, заблоковані дані) — тоді режим вимкнено. */
export function readGlove(): boolean {
  try {
    return localStorage.getItem(GLOVE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeGlove(on: boolean): void {
  try {
    localStorage.setItem(GLOVE_KEY, on ? '1' : '0');
  } catch {
    // не зберегли — режим працює до перезавантаження
  }
}

export const GloveContext = createContext(false);

export function useGlove(): boolean {
  return useContext(GloveContext);
}
