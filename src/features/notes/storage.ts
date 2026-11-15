// Локальне збереження міток (SPEC §7.12): localStorage з try/catch; без нього панель працює без збереження.
// Мітки привʼязані до району: ключ `mars404.annotations.v1.<siteId>`.
import type { Annotation, SiteId } from '../../contracts';
import { restoreAnnotations } from './annotationsFile';

/** Старий ключ без району (до Columbia Hills були лише мітки Gale). */
export const LEGACY_STORAGE_KEY = 'mars404.annotations.v1';

export const storageKey = (site: SiteId) => `${LEGACY_STORAGE_KEY}.${site}`;

/** Один раз переносить старий ключ у ключ Gale (наявний ключ Gale не перезаписує). */
function migrateLegacy(): void {
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy === null) return;
  if (localStorage.getItem(storageKey('gale')) === null) localStorage.setItem(storageKey('gale'), legacy);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export function loadStoredAnnotations(site: SiteId): Annotation[] {
  try {
    migrateLegacy();
    const raw = localStorage.getItem(storageKey(site));
    return raw ? restoreAnnotations(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveStoredAnnotations(site: SiteId, list: readonly Annotation[]): void {
  try {
    localStorage.setItem(storageKey(site), JSON.stringify(list));
  } catch {
    // Сховище недоступне (приватний режим, квота) — працюємо без збереження.
  }
}
