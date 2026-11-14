// Локальне збереження міток (SPEC §7.12): localStorage з try/catch; без нього панель працює без збереження.
import type { Annotation } from '../../contracts';
import { restoreAnnotations } from './annotationsFile';

export const STORAGE_KEY = 'mars404.annotations.v1';

export function loadStoredAnnotations(): Annotation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? restoreAnnotations(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveStoredAnnotations(list: readonly Annotation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Сховище недоступне (приватний режим, квота) — працюємо без збереження.
  }
}
