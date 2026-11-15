import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Annotation } from '../../contracts';
import { LEGACY_STORAGE_KEY, loadStoredAnnotations, saveStoredAnnotations, storageKey } from './storage';

const a: Annotation = { id: 'a', kind: 'hazard', coordinates: [1, 2], radiusM: 20, text: 'rocks', createdAt: '2026-11-14T10:00:00.000Z', origin: 'this-eva' };

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('F1-AC6 · збереження в localStorage', () => {
  it('Given збережені мітки; When читаємо; Then ті самі мітки з тим самим origin', () => {
    saveStoredAnnotations('gale', [a]);
    expect(localStorage.getItem('mars404.annotations.v1.gale')).not.toBeNull();
    expect(loadStoredAnnotations('gale')).toEqual([a]);
  });

  it('порожнє або зіпсоване сховище → []', () => {
    expect(loadStoredAnnotations('gale')).toEqual([]);
    localStorage.setItem(storageKey('gale'), '{broken');
    expect(loadStoredAnnotations('gale')).toEqual([]);
  });

  it('localStorage кидає (приватний режим) → без збереження, без помилки', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveStoredAnnotations('gale', [a])).not.toThrow();
    expect(loadStoredAnnotations('gale')).toEqual([]);
  });
});

describe('ключ на район', () => {
  it('Given мітки Gale; When читаємо Columbia Hills; Then []', () => {
    saveStoredAnnotations('gale', [a]);
    expect(loadStoredAnnotations('columbia-hills')).toEqual([]);
    expect(loadStoredAnnotations('gale')).toEqual([a]);
  });

  it('міграція: старий ключ без району → мітки Gale, один раз; старий ключ прибрано', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([a]));
    expect(loadStoredAnnotations('columbia-hills')).toEqual([]);
    expect(loadStoredAnnotations('gale')).toEqual([a]);
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    saveStoredAnnotations('gale', []);
    expect(loadStoredAnnotations('gale')).toEqual([]);
  });

  it('міграція не перезаписує вже наявний ключ Gale', () => {
    saveStoredAnnotations('gale', [{ ...a, id: 'new' }]);
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([a]));
    expect(loadStoredAnnotations('gale').map((m) => m.id)).toEqual(['new']);
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });
});
